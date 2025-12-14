import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export interface IngredientRecipeInfo {
  ingredient_id: string;
  recipes: { id: string; name: string }[];
}

export function useIngredientRecipes() {
  return useQuery({
    queryKey: ['ingredient-recipes'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('recipe_ingredients')
        .select(`
          ingredient_id,
          recipes!inner (
            id,
            name,
            is_active
          )
        `)
        .eq('recipes.is_active', true);

      if (error) throw error;

      // Group by ingredient_id
      const grouped = new Map<string, { id: string; name: string }[]>();
      
      for (const item of data || []) {
        const ingredientId = item.ingredient_id;
        const recipe = item.recipes as any;
        
        if (!grouped.has(ingredientId)) {
          grouped.set(ingredientId, []);
        }
        
        // Avoid duplicates
        const existing = grouped.get(ingredientId)!;
        if (!existing.some(r => r.id === recipe.id)) {
          existing.push({ id: recipe.id, name: recipe.name });
        }
      }

      return grouped;
    },
  });
}
