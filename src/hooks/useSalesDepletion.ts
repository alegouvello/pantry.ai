import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useEffect } from 'react';
import type { Tables } from '@/integrations/supabase/types';

interface SaleItem {
  recipe_id: string;
  recipe_name: string;
  quantity: number;
}

interface ProcessSaleResult {
  success: boolean;
  depletedIngredients: Array<{
    ingredientId: string;
    ingredientName: string;
    quantityDepleted: number;
    newStock: number;
  }>;
}

// Process a sale and deplete inventory accordingly
export function useProcessSale() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (saleItems: SaleItem[]): Promise<ProcessSaleResult> => {
      const { data: { user } } = await supabase.auth.getUser();
      const depletedIngredients: ProcessSaleResult['depletedIngredients'] = [];
      
      for (const saleItem of saleItems) {
        // Get recipe ingredients
        const { data: recipeIngredients, error: riError } = await supabase
          .from('recipe_ingredients')
          .select(`
            ingredient_id,
            quantity,
            unit,
            ingredients (
              id,
              name,
              current_stock,
              unit
            )
          `)
          .eq('recipe_id', saleItem.recipe_id);
        
        if (riError) throw riError;
        
        // Deplete each ingredient based on recipe quantity * sale quantity
        for (const ri of recipeIngredients || []) {
          const ingredient = ri.ingredients;
          if (!ingredient) continue;
          
          const quantityToDeplete = ri.quantity * saleItem.quantity;
          const previousStock = ingredient.current_stock;
          const newStock = Math.max(0, previousStock - quantityToDeplete);
          
          // Update ingredient stock
          const { error: updateError } = await supabase
            .from('ingredients')
            .update({ current_stock: newStock })
            .eq('id', ingredient.id);
          
          if (updateError) throw updateError;
          
          // Log inventory event
          const { error: eventError } = await supabase
            .from('inventory_events')
            .insert({
              ingredient_id: ingredient.id,
              event_type: 'sale',
              quantity: -quantityToDeplete,
              previous_stock: previousStock,
              new_stock: newStock,
              source: `Sale: ${saleItem.recipe_name}`,
              user_id: user?.id,
              notes: `Auto-depleted from POS sale of ${saleItem.quantity}x ${saleItem.recipe_name}`
            });
          
          if (eventError) throw eventError;
          
          depletedIngredients.push({
            ingredientId: ingredient.id,
            ingredientName: ingredient.name,
            quantityDepleted: quantityToDeplete,
            newStock
          });
        }
      }
      
      return { success: true, depletedIngredients };
    },
    onSuccess: () => {
      // Invalidate relevant queries
      queryClient.invalidateQueries({ queryKey: ['ingredients'] });
      queryClient.invalidateQueries({ queryKey: ['inventory_events'] });
      queryClient.invalidateQueries({ queryKey: ['recipes_with_ingredients_forecast'] });
    }
  });
}

// Hook to listen for real-time sales events and auto-deplete inventory
export function useSalesEventListener(restaurantId?: string) {
  const processSale = useProcessSale();
  const queryClient = useQueryClient();
  
  useEffect(() => {
    if (!restaurantId) return;
    
    // Subscribe to new sales_events
    const channel = supabase
      .channel('sales-events-realtime')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'sales_events',
          filter: `restaurant_id=eq.${restaurantId}`
        },
        async (payload) => {
          const newEvent = payload.new as Tables<'sales_events'>;
          const items = (Array.isArray(newEvent.items) ? newEvent.items : []) as unknown as SaleItem[];
          
          if (items.length > 0) {
            console.log('New sale event detected, depleting inventory:', items);
            
            try {
              await processSale.mutateAsync(items);
              console.log('Inventory depleted successfully');
            } catch (error) {
              console.error('Failed to deplete inventory:', error);
            }
          }
        }
      )
      .subscribe();
    
    return () => {
      supabase.removeChannel(channel);
    };
  }, [restaurantId, processSale, queryClient]);
  
  return { processSale };
}

// Manual sale recording (for testing or manual entry)
export function useRecordSale() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async ({ 
      restaurantId, 
      items 
    }: { 
      restaurantId: string; 
      items: SaleItem[] 
    }) => {
      const { data, error } = await supabase
        .from('sales_events')
        .insert({
          restaurant_id: restaurantId,
          items: items as unknown as Tables<'sales_events'>['items'],
          occurred_at: new Date().toISOString()
        })
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['sales_events'] });
      queryClient.invalidateQueries({ queryKey: ['sales_patterns'] });
    }
  });
}
