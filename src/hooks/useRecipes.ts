import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import type { Tables, TablesInsert, TablesUpdate } from '@/integrations/supabase/types';

export type Recipe = Tables<'recipes'>;
export type RecipeInsert = TablesInsert<'recipes'>;
export type RecipeUpdate = TablesUpdate<'recipes'>;
export type RecipeIngredient = Tables<'recipe_ingredients'>;

export interface RecipeWithIngredients extends Recipe {
  recipe_ingredients: (RecipeIngredient & {
    ingredients: Tables<'ingredients'>;
  })[];
}

export function useRecipes() {
  return useQuery({
    queryKey: ['recipes'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('recipes')
        .select(`
          *,
          recipe_ingredients (
            *,
            ingredients (*)
          )
        `)
        .eq('is_active', true)
        .order('name');
      
      if (error) throw error;
      return data as RecipeWithIngredients[];
    },
  });
}

export function useRecipe(id: string) {
  return useQuery({
    queryKey: ['recipes', id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('recipes')
        .select(`
          *,
          recipe_ingredients (
            *,
            ingredients (*)
          )
        `)
        .eq('id', id)
        .single();
      
      if (error) throw error;
      return data as RecipeWithIngredients;
    },
    enabled: !!id,
  });
}

export function useCreateRecipe() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (recipe: RecipeInsert) => {
      const { data, error } = await supabase
        .from('recipes')
        .insert(recipe)
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

export function useUpdateRecipe() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async ({ id, ...updates }: RecipeUpdate & { id: string }) => {
      const { data, error } = await supabase
        .from('recipes')
        .update(updates)
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

export function useDeleteRecipe() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('recipes')
        .update({ is_active: false })
        .eq('id', id);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['recipes'] });
    },
  });
}
