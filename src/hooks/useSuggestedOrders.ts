import { useMemo } from 'react';
import { useLowStockIngredients } from './useIngredients';
import { useForecast } from './useForecast';
import { useVendors } from './useVendors';
import { useVendorItems } from './useVendorItems';
import type { Ingredient } from './useIngredients';

export interface SuggestedOrderItem {
  ingredientId: string;
  ingredientName: string;
  currentStock: number;
  parLevel: number;
  reorderPoint: number;
  unit: string;
  unitCost: number;
  suggestedQuantity: number;
  reason: 'low_stock' | 'forecast_demand';
  neededForForecast?: number;
  vendorId?: string;
}

export interface SuggestedOrder {
  vendorId: string;
  vendorName: string;
  items: SuggestedOrderItem[];
  totalAmount: number;
  urgency: 'high' | 'medium' | 'low';
  reason: string;
}

export function useSuggestedOrders(forecastDays: number = 3) {
  const { data: lowStockIngredients, isLoading: lowStockLoading } = useLowStockIngredients();
  const { ingredients: forecastIngredients, isLoading: forecastLoading } = useForecast(forecastDays);
  const { data: vendors, isLoading: vendorsLoading } = useVendors();
  const { data: vendorItems, isLoading: vendorItemsLoading } = useVendorItems();

  const suggestions = useMemo(() => {
    if (!lowStockIngredients && !forecastIngredients) {
      return [];
    }

    // Build a map of ingredient needs
    const ingredientNeeds = new Map<string, SuggestedOrderItem>();

    // Add low stock items (current_stock <= reorder_point)
    for (const ingredient of lowStockIngredients || []) {
      // Calculate suggested quantity to reach par level
      const suggestedQuantity = Math.max(0, ingredient.par_level - ingredient.current_stock);
      
      if (suggestedQuantity > 0) {
        ingredientNeeds.set(ingredient.id, {
          ingredientId: ingredient.id,
          ingredientName: ingredient.name,
          currentStock: ingredient.current_stock,
          parLevel: ingredient.par_level,
          reorderPoint: ingredient.reorder_point,
          unit: ingredient.unit,
          unitCost: ingredient.unit_cost,
          suggestedQuantity,
          reason: 'low_stock',
          vendorId: ingredient.vendor_id || undefined,
        });
      }
    }

    // Add forecast-driven needs (ingredients with low coverage)
    for (const forecastItem of forecastIngredients || []) {
      // Only suggest if coverage is below 100% (won't have enough for forecast)
      if (forecastItem.coverage < 100) {
        const shortage = forecastItem.neededQuantity - forecastItem.currentStock;
        const existing = ingredientNeeds.get(forecastItem.ingredientId);
        
        if (existing) {
          // Update with forecast info
          existing.neededForForecast = forecastItem.neededQuantity;
          // Use the higher of low stock suggestion or forecast-driven need
          existing.suggestedQuantity = Math.max(existing.suggestedQuantity, Math.ceil(shortage));
        } else {
          // Add new forecast-driven need
          ingredientNeeds.set(forecastItem.ingredientId, {
            ingredientId: forecastItem.ingredientId,
            ingredientName: forecastItem.ingredientName,
            currentStock: forecastItem.currentStock,
            parLevel: 0, // Unknown from forecast data
            reorderPoint: 0,
            unit: forecastItem.unit,
            unitCost: 0,
            suggestedQuantity: Math.ceil(shortage),
            reason: 'forecast_demand',
            neededForForecast: forecastItem.neededQuantity,
          });
        }
      }
    }

    // Group items by vendor
    const vendorGroups = new Map<string, SuggestedOrderItem[]>();
    const unassignedItems: SuggestedOrderItem[] = [];

    ingredientNeeds.forEach((item) => {
      if (item.vendorId) {
        const existing = vendorGroups.get(item.vendorId) || [];
        existing.push(item);
        vendorGroups.set(item.vendorId, existing);
      } else {
        unassignedItems.push(item);
      }
    });

    // Build suggested orders
    const suggestedOrders: SuggestedOrder[] = [];

    vendorGroups.forEach((items, vendorId) => {
      const vendor = vendors?.find(v => v.id === vendorId);
      const totalAmount = items.reduce((sum, item) => sum + (item.suggestedQuantity * item.unitCost), 0);
      
      // Determine urgency based on how many items are critically low
      const criticalItems = items.filter(item => item.currentStock <= item.reorderPoint * 0.5);
      const urgency: 'high' | 'medium' | 'low' = 
        criticalItems.length > 0 ? 'high' : 
        items.some(item => item.reason === 'forecast_demand') ? 'medium' : 'low';

      const reasons: string[] = [];
      const lowStockCount = items.filter(i => i.reason === 'low_stock').length;
      const forecastCount = items.filter(i => i.reason === 'forecast_demand').length;
      if (lowStockCount > 0) reasons.push(`${lowStockCount} below reorder point`);
      if (forecastCount > 0) reasons.push(`${forecastCount} needed for forecast`);

      suggestedOrders.push({
        vendorId,
        vendorName: vendor?.name || 'Unknown Vendor',
        items,
        totalAmount,
        urgency,
        reason: reasons.join(', '),
      });
    });

    // Add unassigned items as a separate "No Vendor" group if any exist
    if (unassignedItems.length > 0) {
      const totalAmount = unassignedItems.reduce((sum, item) => sum + (item.suggestedQuantity * item.unitCost), 0);
      suggestedOrders.push({
        vendorId: 'unassigned',
        vendorName: 'No Vendor Assigned',
        items: unassignedItems,
        totalAmount,
        urgency: 'medium',
        reason: `${unassignedItems.length} items need vendor assignment`,
      });
    }

    // Sort by urgency (high first)
    const urgencyOrder = { high: 0, medium: 1, low: 2 };
    suggestedOrders.sort((a, b) => urgencyOrder[a.urgency] - urgencyOrder[b.urgency]);

    return suggestedOrders;
  }, [lowStockIngredients, forecastIngredients, vendors, vendorItems]);

  return {
    suggestions,
    isLoading: lowStockLoading || forecastLoading || vendorsLoading || vendorItemsLoading,
    totalItems: suggestions.reduce((sum, s) => sum + s.items.length, 0),
    totalAmount: suggestions.reduce((sum, s) => sum + s.totalAmount, 0),
  };
}
