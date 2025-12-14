import { useMutation } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface RecipeData {
  recipeName: string;
  category: string;
  ingredients: { name: string; quantity: number; unit: string }[];
  yieldAmount: number;
  yieldUnit: string;
  prepTime?: number;
}

interface RecipeStep {
  step: number;
  instruction: string;
}

interface GenerateStepsResult {
  steps: RecipeStep[];
}

export function useGenerateRecipeSteps() {
  return useMutation({
    mutationFn: async (recipe: RecipeData): Promise<GenerateStepsResult> => {
      const { data, error } = await supabase.functions.invoke('generate-recipe-steps', {
        body: recipe,
      });

      if (error) {
        throw new Error(error.message || 'Failed to generate recipe steps');
      }

      if (data.error) {
        throw new Error(data.error);
      }

      return data as GenerateStepsResult;
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Failed to generate recipe steps');
    },
  });
}
