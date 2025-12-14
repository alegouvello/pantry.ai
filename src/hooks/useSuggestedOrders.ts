import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useLowStockIngredients, useIngredients } from './useIngredients';
import { useForecast } from './useForecast';
import { useVendors } from './useVendors';
import { usePurchaseOrders } from './usePurchaseOrders';

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

// Hook to fetch ingredient-vendor mappings with vendor details
function useIngredientVendorMaps() {
  return useQuery({
    queryKey: ['ingredient_vendor_maps_with_details'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('ingredient_vendor_maps')
        .select(`
          ingredient_id,
          priority_rank,
          vendor_items (
            id,
            vendor_id,
            unit_cost,
            name,
            vendors (
              id,
              name
            )
          )
        `)
        .order('priority_rank', { ascending: true });
      
      if (error) throw error;
      
      // Build a map of ingredient_id -> best vendor info (lowest priority_rank)
      const vendorMap = new Map<string, {
        vendorId: string;
        vendorName: string;
        unitCost: number;
      }>();
      
      for (const mapping of data || []) {
        // Only use the first (lowest priority) mapping for each ingredient
        if (!vendorMap.has(mapping.ingredient_id) && mapping.vendor_items) {
          const vendorItem = mapping.vendor_items as any;
          if (vendorItem.vendors) {
            vendorMap.set(mapping.ingredient_id, {
              vendorId: vendorItem.vendors.id,
              vendorName: vendorItem.vendors.name,
              unitCost: vendorItem.unit_cost || 0,
            });
          }
        }
      }
      
      return vendorMap;
    }
  });
}

export function useSuggestedOrders(forecastDays: number = 3) {
  const { data: lowStockIngredients, isLoading: lowStockLoading } = useLowStockIngredients();
  const { data: allIngredients, isLoading: ingredientsLoading } = useIngredients();
  const { ingredients: forecastIngredients, isLoading: forecastLoading } = useForecast(forecastDays);
  const { data: vendors, isLoading: vendorsLoading } = useVendors();
  const { data: vendorMaps, isLoading: vendorMapsLoading } = useIngredientVendorMaps();
  const { data: existingOrders, isLoading: ordersLoading } = usePurchaseOrders();

  // Get ingredient IDs that are already in pending (draft/approved/sent) POs
  const ingredientsInPendingPOs = useMemo(() => {
    const pendingStatuses = ['draft', 'approved', 'sent', 'partial'];
    const inPending = new Set<string>();
    
    for (const order of existingOrders || []) {
      if (pendingStatuses.includes(order.status)) {
        for (const item of order.purchase_order_items || []) {
          inPending.add(item.ingredient_id);
        }
      }
    }
    
    return inPending;
  }, [existingOrders]);

  const suggestions = useMemo(() => {
    if (!lowStockIngredients && !forecastIngredients) {
      return [];
    }

    // Build ingredient lookup for unit costs
    const ingredientLookup = new Map(
      (allIngredients || []).map(ing => [ing.id, ing])
    );

    // Build a map of ingredient needs
    const ingredientNeeds = new Map<string, SuggestedOrderItem>();

    // Add low stock items (current_stock <= reorder_point)
    for (const ingredient of lowStockIngredients || []) {
      // Skip if already in a pending PO
      if (ingredientsInPendingPOs.has(ingredient.id)) continue;
      
      const suggestedQuantity = Math.max(0, ingredient.par_level - ingredient.current_stock);
      
      if (suggestedQuantity > 0) {
        // Get vendor info from vendor maps (historical assignments)
        const vendorInfo = vendorMaps?.get(ingredient.id);
        
        ingredientNeeds.set(ingredient.id, {
          ingredientId: ingredient.id,
          ingredientName: ingredient.name,
          currentStock: ingredient.current_stock,
          parLevel: ingredient.par_level,
          reorderPoint: ingredient.reorder_point,
          unit: ingredient.unit,
          unitCost: vendorInfo?.unitCost || ingredient.unit_cost,
          suggestedQuantity,
          reason: 'low_stock',
          vendorId: vendorInfo?.vendorId || ingredient.vendor_id || undefined,
        });
      }
    }

    // Add forecast-driven needs (ingredients with low coverage)
    for (const forecastItem of forecastIngredients || []) {
      // Skip if already in a pending PO
      if (ingredientsInPendingPOs.has(forecastItem.ingredientId)) continue;
      
      if (forecastItem.coverage < 100) {
        const shortage = forecastItem.neededQuantity - forecastItem.currentStock;
        const existing = ingredientNeeds.get(forecastItem.ingredientId);
        const ingredient = ingredientLookup.get(forecastItem.ingredientId);
        const vendorInfo = vendorMaps?.get(forecastItem.ingredientId);
        
        if (existing) {
          existing.neededForForecast = forecastItem.neededQuantity;
          existing.suggestedQuantity = Math.max(existing.suggestedQuantity, Math.ceil(shortage));
          // Update vendor if we have mapping but didn't have it before
          if (!existing.vendorId && vendorInfo?.vendorId) {
            existing.vendorId = vendorInfo.vendorId;
            existing.unitCost = vendorInfo.unitCost || existing.unitCost;
          }
        } else {
          ingredientNeeds.set(forecastItem.ingredientId, {
            ingredientId: forecastItem.ingredientId,
            ingredientName: forecastItem.ingredientName,
            currentStock: forecastItem.currentStock,
            parLevel: ingredient?.par_level || 0,
            reorderPoint: ingredient?.reorder_point || 0,
            unit: forecastItem.unit,
            unitCost: vendorInfo?.unitCost || ingredient?.unit_cost || 0,
            suggestedQuantity: Math.ceil(shortage),
            reason: 'forecast_demand',
            neededForForecast: forecastItem.neededQuantity,
            vendorId: vendorInfo?.vendorId || ingredient?.vendor_id || undefined,
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
      // Try to get vendor name from vendorMaps first, then fall back to vendors list
      let vendorName = 'Unknown Vendor';
      const vendorFromMaps = Array.from(vendorMaps?.values() || []).find(v => v.vendorId === vendorId);
      if (vendorFromMaps) {
        vendorName = vendorFromMaps.vendorName;
      } else {
        const vendor = vendors?.find(v => v.id === vendorId);
        if (vendor) vendorName = vendor.name;
      }
      
      const totalAmount = items.reduce((sum, item) => sum + (item.suggestedQuantity * item.unitCost), 0);
      
      const criticalItems = items.filter(item => item.currentStock <= item.reorderPoint * 0.5);
      const urgency: 'high' | 'medium' | 'low' = 
        criticalItems.length > 0 ? 'high' : 
        items.some(item => item.reason === 'forecast_demand') ? 'medium' : 'low';

      const reasons: string[] = [];
      const lowStockCount = items.filter(i => i.reason === 'low_stock').length;
      const forecastCount = items.filter(i => i.reason === 'forecast_demand').length;
      if (lowStockCount > 0) reasons.push(`${lowStockCount} below reorder point`);
      if (forecastCount > 0) reasons.push(`${forecastCount} needed for ${forecastDays}-day forecast`);

      suggestedOrders.push({
        vendorId,
        vendorName,
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
  }, [lowStockIngredients, allIngredients, forecastIngredients, vendors, vendorMaps, forecastDays, ingredientsInPendingPOs]);

  return {
    suggestions,
    isLoading: lowStockLoading || ingredientsLoading || forecastLoading || vendorsLoading || vendorMapsLoading || ordersLoading,
    totalItems: suggestions.reduce((sum, s) => sum + s.items.length, 0),
    totalAmount: suggestions.reduce((sum, s) => sum + s.totalAmount, 0),
  };
}
