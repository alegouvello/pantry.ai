import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useMemo } from 'react';
import { useForecastEvents } from './useForecastEvents';
import { addDays, startOfDay, format } from 'date-fns';
import { WeatherData } from './useWeatherForecast';

// Hook to get pending order quantities by ingredient
function usePendingOrderQuantities() {
  return useQuery({
    queryKey: ['pending_order_quantities'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('purchase_orders')
        .select(`
          status,
          purchase_order_items (
            ingredient_id,
            quantity
          )
        `)
        .in('status', ['draft', 'approved', 'sent', 'partial']);
      
      if (error) throw error;
      
      // Aggregate quantities by ingredient
      const pendingByIngredient = new Map<string, number>();
      for (const order of data || []) {
        for (const item of order.purchase_order_items || []) {
          const existing = pendingByIngredient.get(item.ingredient_id) || 0;
          pendingByIngredient.set(item.ingredient_id, existing + Number(item.quantity));
        }
      }
      
      return pendingByIngredient;
    }
  });
}

// Types for forecast data
export interface DishForecast {
  recipeId: string;
  recipeName: string;
  category: string;
  predictedQuantity: number;
  confidence: number;
  dayOfWeek: number;
  menuPrice: number | null;
  eventImpact?: number;
  weatherImpact?: number;
}

export interface IngredientRequirement {
  ingredientId: string;
  ingredientName: string;
  unit: string;
  currentStock: number;
  neededQuantity: number;
  pendingQuantity?: number;
  coverage: number;
  risk: 'high' | 'medium' | 'low';
  recipes: { name: string; quantity: number }[];
}

export interface SalesPattern {
  recipeId: string;
  recipeName: string;
  dayOfWeek: number;
  avgQuantity: number;
  totalSales: number;
  sampleSize: number;
}

// Get day of week (0 = Sunday, 6 = Saturday)
const getDayOfWeek = (date: Date) => date.getDay();
const getDayName = (day: number) => ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'][day];

// Fetch historical sales patterns by day of week
export function useSalesPatterns() {
  return useQuery({
    queryKey: ['sales_patterns'],
    queryFn: async () => {
      // Get sales events with items (items contains recipe/dish info)
      const { data: salesEvents, error } = await supabase
        .from('sales_events')
        .select('*')
        .order('occurred_at', { ascending: false });
      
      if (error) throw error;
      
      // First, aggregate by recipe + date to get daily totals
      // Then aggregate by day of week to get average daily sales
      const dailyTotalsMap = new Map<string, Map<string, { quantity: number; recipeName: string; dayOfWeek: number }>>();
      
      for (const event of salesEvents || []) {
        const eventDate = new Date(event.occurred_at);
        const dateKey = format(eventDate, 'yyyy-MM-dd');
        const dayOfWeek = getDayOfWeek(eventDate);
        const items = event.items as Array<{ recipe_id: string; recipe_name: string; quantity: number }> || [];
        
        for (const item of items) {
          if (!item.recipe_id) continue;
          
          const recipeKey = item.recipe_id;
          if (!dailyTotalsMap.has(recipeKey)) {
            dailyTotalsMap.set(recipeKey, new Map());
          }
          
          const recipeDailyMap = dailyTotalsMap.get(recipeKey)!;
          const existing = recipeDailyMap.get(dateKey) || { quantity: 0, recipeName: item.recipe_name, dayOfWeek };
          
          recipeDailyMap.set(dateKey, {
            quantity: existing.quantity + (item.quantity || 1),
            recipeName: item.recipe_name,
            dayOfWeek
          });
        }
      }
      
      // Now aggregate daily totals by day of week
      const patternMap = new Map<string, Map<number, { total: number; daysCount: number; recipeName: string }>>();
      
      dailyTotalsMap.forEach((dailyMap, recipeId) => {
        if (!patternMap.has(recipeId)) {
          patternMap.set(recipeId, new Map());
        }
        const recipePatterns = patternMap.get(recipeId)!;
        
        dailyMap.forEach((dayData) => {
          const existing = recipePatterns.get(dayData.dayOfWeek) || { total: 0, daysCount: 0, recipeName: dayData.recipeName };
          recipePatterns.set(dayData.dayOfWeek, {
            total: existing.total + dayData.quantity,
            daysCount: existing.daysCount + 1, // Count unique days, not orders
            recipeName: dayData.recipeName
          });
        });
      });
      
      // Convert to patterns array with correct average (total per day of week / number of those days)
      const patterns: SalesPattern[] = [];
      patternMap.forEach((dayPatterns, recipeId) => {
        dayPatterns.forEach((data, dayOfWeek) => {
          patterns.push({
            recipeId,
            recipeName: data.recipeName,
            dayOfWeek,
            avgQuantity: data.total / data.daysCount, // Now correctly averages per day
            totalSales: data.total,
            sampleSize: data.daysCount
          });
        });
      });
      
      return patterns;
    }
  });
}

// Fetch all recipes with their ingredients for forecasting
export function useRecipesWithIngredients() {
  return useQuery({
    queryKey: ['recipes_with_ingredients_forecast'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('recipes')
        .select(`
          id,
          name,
          category,
          menu_price,
          yield_amount,
          yield_unit,
          recipe_ingredients (
            ingredient_id,
            quantity,
            unit,
            ingredients (
              id,
              name,
              current_stock,
              unit,
              unit_cost
            )
          )
        `)
        .eq('is_active', true)
        .order('name');
      
      if (error) throw error;
      return data;
    }
  });
}

// Main forecasting hook
export function useForecast(daysAhead: number = 3, restaurantId?: string, weatherData?: WeatherData[]) {
  const { data: salesPatterns, isLoading: patternsLoading } = useSalesPatterns();
  const { data: recipes, isLoading: recipesLoading } = useRecipesWithIngredients();
  const { data: pendingOrders, isLoading: pendingLoading } = usePendingOrderQuantities();
  
  // Fetch restaurant data including hours and seats for capacity constraints
  const { data: restaurant } = useQuery({
    queryKey: ['restaurant-forecast-data', restaurantId],
    queryFn: async () => {
      if (!restaurantId) return null;
      const { data, error } = await supabase
        .from('restaurants')
        .select('hours, seats')
        .eq('id', restaurantId)
        .single();
      if (error) throw error;
      return data;
    },
    enabled: !!restaurantId,
  });
  
  // Get events for the forecast period (including closures)
  const today = startOfDay(new Date());
  const endDate = addDays(today, daysAhead);
  const { events, isLoading: eventsLoading } = useForecastEvents(restaurantId, today, endDate);
  
  const forecast = useMemo(() => {
    if (!recipes) return { dishes: [], ingredients: [], hasEventImpact: false, hasWeatherImpact: false, capacityConstrained: false };
    
    const forecastDays: Date[] = [];
    for (let i = 0; i < daysAhead; i++) {
      forecastDays.push(addDays(today, i));
    }
    
    // Parse business hours to determine regularly closed days
    const closedDaysOfWeek = new Set<number>();
    if (restaurant?.hours && typeof restaurant.hours === 'object') {
      const hours = restaurant.hours as Record<string, { closed?: boolean }>;
      const dayMap: Record<string, number> = {
        sunday: 0, monday: 1, tuesday: 2, wednesday: 3,
        thursday: 4, friday: 5, saturday: 6
      };
      Object.entries(hours).forEach(([day, config]) => {
        if (config?.closed) {
          closedDaysOfWeek.add(dayMap[day.toLowerCase()]);
        }
      });
    }
    
    // Build a map of date -> total event impact percent
    const eventImpactMap = new Map<string, number>();
    const closureDates = new Set<string>();
    for (const event of events) {
      const dateKey = event.event_date;
      if (event.event_type === 'closure') {
        closureDates.add(dateKey);
        eventImpactMap.set(dateKey, -100); // Full closure
      } else {
        const existing = eventImpactMap.get(dateKey) || 0;
        eventImpactMap.set(dateKey, existing + Number(event.impact_percent));
      }
    }
    
    // Build a map of date -> weather impact percent
    const weatherImpactMap = new Map<string, number>();
    if (weatherData) {
      for (const weather of weatherData) {
        weatherImpactMap.set(weather.date, weather.impact);
      }
    }
    
    const hasEventImpact = eventImpactMap.size > 0;
    const hasWeatherImpact = weatherImpactMap.size > 0;
    
    // Seat capacity for demand ceiling calculations
    // Assume avg 2 turns per service and avg 1.5 dishes per cover if seats are configured
    const seats = restaurant?.seats || null;
    const avgTurnsPerDay = 2; // Typical lunch + dinner turns
    const avgDishesPerCover = 1.5;
    const maxDailyCovers = seats ? seats * avgTurnsPerDay : null;
    const maxDailyDishes = maxDailyCovers ? Math.round(maxDailyCovers * avgDishesPerCover) : null;
    let capacityConstrained = false;
    
    // Calculate dish forecasts
    const dishForecasts: DishForecast[] = [];
    const ingredientNeeds = new Map<string, {
      ingredientId: string;
      ingredientName: string;
      unit: string;
      currentStock: number;
      neededQuantity: number;
      recipes: { name: string; quantity: number }[];
    }>();
    
    for (const recipe of recipes) {
      let totalPredicted = 0;
      let confidenceSum = 0;
      let forecastCount = 0;
      let totalEventImpact = 0;
      let totalWeatherImpact = 0;
      
      for (const forecastDay of forecastDays) {
        const dayOfWeek = getDayOfWeek(forecastDay);
        const dateKey = format(forecastDay, 'yyyy-MM-dd');
        
        // Skip days that are regularly closed or have a closure event
        if (closedDaysOfWeek.has(dayOfWeek) || closureDates.has(dateKey)) {
          continue;
        }
        
        const eventImpact = eventImpactMap.get(dateKey) || 0;
        const weatherImpact = weatherImpactMap.get(dateKey) || 0;
        
        // Find historical pattern for this recipe on this day of week
        const pattern = salesPatterns?.find(
          p => p.recipeId === recipe.id && p.dayOfWeek === dayOfWeek
        );
        
        let basePrediction: number;
        let dayConfidence: number;
        let hasHistoricalData = false;
        
        if (pattern && pattern.sampleSize > 0) {
          basePrediction = pattern.avgQuantity;
          // Confidence based on sample size (more data = higher confidence)
          dayConfidence = Math.min(95, 50 + pattern.sampleSize * 5);
          hasHistoricalData = true;
        } else {
          // No historical data - skip this recipe for this day
          // We only forecast dishes with actual sales history
          basePrediction = 0;
          dayConfidence = 0;
        }
        
        // Apply event and weather impact to prediction (combined)
        const combinedImpact = eventImpact + weatherImpact;
        const adjustedPrediction = basePrediction * (1 + combinedImpact / 100);
        totalPredicted += Math.max(0, adjustedPrediction); // Never go negative
        totalEventImpact += eventImpact;
        totalWeatherImpact += weatherImpact;
        confidenceSum += dayConfidence;
        forecastCount++;
      }
      
      const predictedQuantity = Math.round(totalPredicted);
      const avgConfidence = forecastCount > 0 ? Math.round(confidenceSum / forecastCount) : 40;
      const avgEventImpact = forecastCount > 0 ? Math.round(totalEventImpact / forecastCount) : 0;
      const avgWeatherImpact = forecastCount > 0 ? Math.round(totalWeatherImpact / forecastCount) : 0;
      
      if (predictedQuantity > 0) {
        dishForecasts.push({
          recipeId: recipe.id,
          recipeName: recipe.name,
          category: recipe.category,
          predictedQuantity,
          confidence: avgConfidence,
          dayOfWeek: getDayOfWeek(today),
          menuPrice: recipe.menu_price,
          eventImpact: avgEventImpact !== 0 ? avgEventImpact : undefined,
          weatherImpact: avgWeatherImpact !== 0 ? avgWeatherImpact : undefined
        });
        
        // Calculate ingredient needs based on predicted dish sales
        for (const ri of recipe.recipe_ingredients || []) {
          const ingredient = ri.ingredients;
          if (!ingredient) continue;
          
          const neededForRecipe = ri.quantity * predictedQuantity;
          
          const existing = ingredientNeeds.get(ingredient.id) || {
            ingredientId: ingredient.id,
            ingredientName: ingredient.name,
            unit: ri.unit || ingredient.unit,
            currentStock: ingredient.current_stock,
            neededQuantity: 0,
            recipes: []
          };
          
          existing.neededQuantity += neededForRecipe;
          existing.recipes.push({ name: recipe.name, quantity: neededForRecipe });
          ingredientNeeds.set(ingredient.id, existing);
        }
      }
    }
    
    // Apply capacity constraint: if total predicted dishes exceed max capacity, scale down proportionally
    const totalPredictedDishes = dishForecasts.reduce((sum, d) => sum + d.predictedQuantity, 0);
    if (maxDailyDishes && totalPredictedDishes > maxDailyDishes * daysAhead) {
      const scaleFactor = (maxDailyDishes * daysAhead) / totalPredictedDishes;
      capacityConstrained = true;
      for (const dish of dishForecasts) {
        dish.predictedQuantity = Math.round(dish.predictedQuantity * scaleFactor);
      }
      // Also scale ingredient needs
      ingredientNeeds.forEach((need) => {
        need.neededQuantity = need.neededQuantity * scaleFactor;
        need.recipes = need.recipes.map(r => ({ ...r, quantity: r.quantity * scaleFactor }));
      });
    }
    
    // Sort dishes by predicted quantity
    dishForecasts.sort((a, b) => b.predictedQuantity - a.predictedQuantity);
    
    // Convert ingredient needs to array with risk assessment
    // Include pending order quantities in coverage calculation
    const ingredientRequirements: IngredientRequirement[] = [];
    ingredientNeeds.forEach((need) => {
      // Get pending order quantity for this ingredient
      const pendingQuantity = pendingOrders?.get(need.ingredientId) || 0;
      const effectiveStock = need.currentStock + pendingQuantity;
      
      const coverage = need.neededQuantity > 0 
        ? (effectiveStock / need.neededQuantity) * 100 
        : 100;
      
      let risk: 'high' | 'medium' | 'low' = 'low';
      if (coverage < 50) risk = 'high';
      else if (coverage < 80) risk = 'medium';
      
      ingredientRequirements.push({
        ...need,
        currentStock: effectiveStock, // Show effective stock (current + pending)
        pendingQuantity, // Expose pending quantity for UI badge
        coverage,
        risk
      });
    });
    
    // Sort by risk (high first) then by needed quantity
    ingredientRequirements.sort((a, b) => {
      const riskOrder = { high: 0, medium: 1, low: 2 };
      if (riskOrder[a.risk] !== riskOrder[b.risk]) {
        return riskOrder[a.risk] - riskOrder[b.risk];
      }
      return b.neededQuantity - a.neededQuantity;
    });
    
    return {
      dishes: dishForecasts,
      ingredients: ingredientRequirements,
      hasEventImpact,
      hasWeatherImpact,
      capacityConstrained,
      maxDailyCovers
    };
  }, [salesPatterns, recipes, daysAhead, events, today, weatherData, restaurant, pendingOrders]);
  
  return {
    ...forecast,
    isLoading: patternsLoading || recipesLoading || eventsLoading || pendingLoading,
    salesPatterns,
    recipes,
    events
  };
}

// Hook to get forecast summary by day
export function useForecastByDay(daysAhead: number = 7) {
  const { dishes, ingredients, isLoading } = useForecast(daysAhead);
  
  const summary = useMemo(() => {
    const today = new Date();
    const days = [];
    
    for (let i = 0; i < daysAhead; i++) {
      const date = new Date(today);
      date.setDate(today.getDate() + i);
      
      days.push({
        date,
        dayName: getDayName(date.getDay()),
        isToday: i === 0,
        totalDishes: dishes.length,
        highRiskIngredients: ingredients.filter(ing => ing.risk === 'high').length
      });
    }
    
    return days;
  }, [dishes, ingredients, daysAhead]);
  
  return { summary, isLoading };
}
