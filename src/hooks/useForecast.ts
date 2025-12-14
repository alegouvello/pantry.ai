import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useMemo } from 'react';
import { useForecastEvents } from './useForecastEvents';
import { addDays, startOfDay, format } from 'date-fns';
import { WeatherData } from './useWeatherForecast';

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
      
      // Aggregate sales by recipe and day of week
      const patternMap = new Map<string, Map<number, { total: number; count: number; recipeName: string }>>();
      
      for (const event of salesEvents || []) {
        const dayOfWeek = getDayOfWeek(new Date(event.occurred_at));
        const items = event.items as Array<{ recipe_id: string; recipe_name: string; quantity: number }> || [];
        
        for (const item of items) {
          if (!item.recipe_id) continue;
          
          if (!patternMap.has(item.recipe_id)) {
            patternMap.set(item.recipe_id, new Map());
          }
          
          const recipePatterns = patternMap.get(item.recipe_id)!;
          const existing = recipePatterns.get(dayOfWeek) || { total: 0, count: 0, recipeName: item.recipe_name };
          
          recipePatterns.set(dayOfWeek, {
            total: existing.total + (item.quantity || 1),
            count: existing.count + 1,
            recipeName: item.recipe_name
          });
        }
      }
      
      // Convert to patterns array
      const patterns: SalesPattern[] = [];
      patternMap.forEach((dayPatterns, recipeId) => {
        dayPatterns.forEach((data, dayOfWeek) => {
          patterns.push({
            recipeId,
            recipeName: data.recipeName,
            dayOfWeek,
            avgQuantity: data.total / data.count,
            totalSales: data.total,
            sampleSize: data.count
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
  
  // Get events for the forecast period
  const today = startOfDay(new Date());
  const endDate = addDays(today, daysAhead);
  const { events, isLoading: eventsLoading } = useForecastEvents(restaurantId, today, endDate);
  
  const forecast = useMemo(() => {
    if (!recipes) return { dishes: [], ingredients: [], hasEventImpact: false, hasWeatherImpact: false };
    
    const forecastDays: Date[] = [];
    for (let i = 0; i < daysAhead; i++) {
      forecastDays.push(addDays(today, i));
    }
    
    // Build a map of date -> total event impact percent
    const eventImpactMap = new Map<string, number>();
    for (const event of events) {
      const dateKey = event.event_date;
      const existing = eventImpactMap.get(dateKey) || 0;
      eventImpactMap.set(dateKey, existing + Number(event.impact_percent));
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
        const eventImpact = eventImpactMap.get(dateKey) || 0;
        const weatherImpact = weatherImpactMap.get(dateKey) || 0;
        
        // Find historical pattern for this recipe on this day of week
        const pattern = salesPatterns?.find(
          p => p.recipeId === recipe.id && p.dayOfWeek === dayOfWeek
        );
        
        let basePrediction: number;
        let dayConfidence: number;
        
        if (pattern) {
          basePrediction = pattern.avgQuantity;
          // Confidence based on sample size (more data = higher confidence)
          dayConfidence = Math.min(95, 50 + pattern.sampleSize * 5);
        } else {
          // No historical data - use default estimate based on category
          basePrediction = recipe.category === 'Mains' ? 8 : 
                           recipe.category === 'Appetizers' ? 6 : 4;
          dayConfidence = 40; // Low confidence for defaults
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
    
    // Sort dishes by predicted quantity
    dishForecasts.sort((a, b) => b.predictedQuantity - a.predictedQuantity);
    
    // Convert ingredient needs to array with risk assessment
    const ingredientRequirements: IngredientRequirement[] = [];
    ingredientNeeds.forEach((need) => {
      const coverage = need.neededQuantity > 0 
        ? (need.currentStock / need.neededQuantity) * 100 
        : 100;
      
      let risk: 'high' | 'medium' | 'low' = 'low';
      if (coverage < 50) risk = 'high';
      else if (coverage < 80) risk = 'medium';
      
      ingredientRequirements.push({
        ...need,
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
      hasWeatherImpact
    };
  }, [salesPatterns, recipes, daysAhead, events, today, weatherData]);
  
  return {
    ...forecast,
    isLoading: patternsLoading || recipesLoading || eventsLoading,
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
