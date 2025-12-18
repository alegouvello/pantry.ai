import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import type { Tables, TablesInsert } from '@/integrations/supabase/types';

export type InventoryEvent = Tables<'inventory_events'>;
export type InventoryEventInsert = TablesInsert<'inventory_events'>;

export interface InventoryEventWithIngredient extends InventoryEvent {
  ingredients: Tables<'ingredients'>;
}

export function useInventoryEvents(limit = 50) {
  return useQuery({
    queryKey: ['inventory_events', limit],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('inventory_events')
        .select(`
          *,
          ingredients (*)
        `)
        .order('created_at', { ascending: false })
        .limit(limit);
      
      if (error) throw error;
      return data as InventoryEventWithIngredient[];
    },
  });
}

export function useIngredientEvents(ingredientId: string) {
  return useQuery({
    queryKey: ['inventory_events', 'ingredient', ingredientId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('inventory_events')
        .select('*')
        .eq('ingredient_id', ingredientId)
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      return data as InventoryEvent[];
    },
    enabled: !!ingredientId,
  });
}

export function useLogInventoryEvent() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (event: InventoryEventInsert) => {
      // Note: user_id is automatically set by database trigger
      const { data, error } = await supabase
        .from('inventory_events')
        .insert(event)
        .select()
        .single();
      
      if (error) throw error;
      
      // Also update the ingredient's current stock
      const { error: updateError } = await supabase
        .from('ingredients')
        .update({ current_stock: event.new_stock })
        .eq('id', event.ingredient_id);
      
      if (updateError) throw updateError;
      
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['inventory_events'] });
      queryClient.invalidateQueries({ queryKey: ['ingredients'] });
    },
  });
}
