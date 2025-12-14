import { useMutation } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface IngredientInput {
  id: string;
  name: string;
  category: string;
  unit: string;
  currentStock: number;
  storageLocation?: string;
}

interface ParLevelSuggestion {
  par_level: number;
  reorder_point: number;
  reasoning: string;
}

interface SuggestParLevelsResponse {
  suggestions: Record<string, ParLevelSuggestion>;
}

export function useSuggestParLevels() {
  return useMutation({
    mutationFn: async ({ 
      ingredients, 
      conceptType 
    }: { 
      ingredients: IngredientInput[]; 
      conceptType?: string;
    }): Promise<Record<string, ParLevelSuggestion>> => {
      const { data, error } = await supabase.functions.invoke<SuggestParLevelsResponse>('suggest-par-levels', {
        body: { ingredients, conceptType },
      });

      if (error) {
        throw new Error(error.message || 'Failed to get par level suggestions');
      }

      if (!data?.suggestions) {
        throw new Error('No suggestions returned');
      }

      return data.suggestions;
    },
    onError: (error: Error) => {
      if (error.message.includes('Rate limit')) {
        toast.error('Rate limit exceeded. Please try again in a moment.');
      } else if (error.message.includes('credits')) {
        toast.error('AI credits depleted. Please add credits to continue.');
      } else {
        toast.error(`Failed to get suggestions: ${error.message}`);
      }
    },
  });
}