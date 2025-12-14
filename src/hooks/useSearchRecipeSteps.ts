import { useMutation } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface RecipeStep {
  step: number;
  instruction: string;
}

interface SearchResult {
  steps: RecipeStep[];
  source: {
    url: string;
    title: string;
  } | null;
  error?: string;
}

interface SearchParams {
  recipeName: string;
  category: string;
}

export function useSearchRecipeSteps() {
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (params: SearchParams): Promise<SearchResult> => {
      const { data, error } = await supabase.functions.invoke('search-recipe-steps', {
        body: params,
      });

      if (error) {
        throw new Error(error.message);
      }

      if (data.error) {
        throw new Error(data.error);
      }

      return data;
    },
    onError: (error) => {
      toast({
        title: 'Search failed',
        description: error instanceof Error ? error.message : 'Failed to search for recipe',
        variant: 'destructive',
      });
    },
  });
}
