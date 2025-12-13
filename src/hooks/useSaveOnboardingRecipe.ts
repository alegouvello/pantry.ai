import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { ParsedDish } from '@/contexts/OnboardingContext';

interface SaveRecipeParams {
  dish: ParsedDish;
  ingredients: ParsedDish['ingredients'];
  restaurantId?: string | null;
  imageUrl?: string | null;
}

export function useSaveOnboardingRecipe() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ dish, ingredients, restaurantId, imageUrl }: SaveRecipeParams) => {
      console.log('Saving recipe:', dish.name, 'with', ingredients.length, 'ingredients');

      // Step 1: Create or find ingredients in the database
      const ingredientIds: Record<string, string> = {};
      
      for (const ing of ingredients) {
        if (!ing.name.trim()) continue;

        // Check if ingredient exists by name
        const { data: existingIngredient } = await supabase
          .from('ingredients')
          .select('id')
          .ilike('name', ing.name.trim())
          .maybeSingle();

        if (existingIngredient) {
          ingredientIds[ing.id] = existingIngredient.id;
        } else {
          // Create new ingredient
          const { data: newIngredient, error: ingredientError } = await supabase
            .from('ingredients')
            .insert({
              name: ing.name.trim(),
              unit: ing.unit,
              category: dish.section || 'Other',
              restaurant_id: restaurantId || null,
            })
            .select('id')
            .single();

          if (ingredientError) {
            console.error('Error creating ingredient:', ing.name, ingredientError);
            throw ingredientError;
          }
          
          if (newIngredient) {
            ingredientIds[ing.id] = newIngredient.id;
          }
        }
      }

      // Step 2: Create the recipe
      const { data: recipe, error: recipeError } = await supabase
        .from('recipes')
        .insert({
          name: dish.name,
          category: dish.section || 'Other',
          confidence: dish.confidence,
          menu_price: dish.price || null,
          status: 'Approved',
          recipe_type: 'Dish',
          yield_amount: 1,
          yield_unit: 'portion',
          image_url: imageUrl || null,
        })
        .select('id')
        .single();

      if (recipeError) {
        console.error('Error creating recipe:', dish.name, recipeError);
        throw recipeError;
      }

      if (!recipe) {
        throw new Error('Failed to create recipe');
      }

      console.log('Created recipe with ID:', recipe.id);

      // Step 3: Link ingredients to recipe
      const recipeIngredients = ingredients
        .filter(ing => ing.name.trim() && ingredientIds[ing.id])
        .map(ing => ({
          recipe_id: recipe.id,
          ingredient_id: ingredientIds[ing.id],
          quantity: ing.quantity,
          unit: ing.unit,
        }));

      if (recipeIngredients.length > 0) {
        const { error: linkError } = await supabase
          .from('recipe_ingredients')
          .insert(recipeIngredients);

        if (linkError) {
          console.error('Error linking ingredients to recipe:', linkError);
          throw linkError;
        }

        console.log('Linked', recipeIngredients.length, 'ingredients to recipe');
      }

      return { recipeId: recipe.id, ingredientCount: recipeIngredients.length };
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['recipes'] });
      queryClient.invalidateQueries({ queryKey: ['ingredients'] });
    },
    onError: (error) => {
      console.error('Failed to save recipe:', error);
    },
  });
}

export function useSaveMultipleRecipes() {
  const saveRecipe = useSaveOnboardingRecipe();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (params: { 
      recipes: Array<{ dish: ParsedDish; ingredients: ParsedDish['ingredients']; imageUrl?: string | null }>;
      restaurantId?: string | null;
    }) => {
      const results = [];
      
      for (const { dish, ingredients, imageUrl } of params.recipes) {
        try {
          const result = await saveRecipe.mutateAsync({ 
            dish, 
            ingredients, 
            restaurantId: params.restaurantId,
            imageUrl,
          });
          results.push({ success: true, dish: dish.name, ...result });
        } catch (error) {
          console.error('Failed to save recipe:', dish.name, error);
          results.push({ success: false, dish: dish.name, error });
        }
      }
      
      return results;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['recipes'] });
      queryClient.invalidateQueries({ queryKey: ['ingredients'] });
    },
  });
}
