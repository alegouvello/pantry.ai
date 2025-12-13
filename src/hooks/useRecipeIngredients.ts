import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import type { TablesInsert } from '@/integrations/supabase/types';

export type RecipeIngredientInsert = TablesInsert<'recipe_ingredients'>;

export function useAddRecipeIngredient() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (ingredient: RecipeIngredientInsert) => {
      const { data, error } = await supabase
        .from('recipe_ingredients')
        .insert(ingredient)
        .select(`
          *,
          ingredients (*)
        `)
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['recipes'] });
    },
  });
}

export function useUpdateRecipeIngredient() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async ({ id, quantity, unit }: { id: string; quantity: number; unit: string }) => {
      const { data, error } = await supabase
        .from('recipe_ingredients')
        .update({ quantity, unit })
        .eq('id', id)
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['recipes'] });
    },
  });
}

export function useRemoveRecipeIngredient() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('recipe_ingredients')
        .delete()
        .eq('id', id);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['recipes'] });
    },
  });
}
