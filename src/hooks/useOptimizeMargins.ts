import { useMutation } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface RecipeData {
  name: string;
  category: string;
  totalCost: number;
  menuPrice: number | null;
  foodCostPct: number | null;
  yieldAmount: number;
  yieldUnit: string;
  ingredients: {
    name: string;
    quantity: number;
    unit: string;
    unitCost: number;
    lineCost: number;
    percentage: number;
  }[];
}

export interface OptimizationSuggestion {
  type: 'substitution' | 'portion' | 'pricing' | 'sourcing' | 'technique';
  title: string;
  description: string;
  impact: 'low' | 'medium' | 'high';
  estimatedSavings?: string;
}

export interface OptimizationResult {
  summary: string;
  targetFoodCostPct?: number;
  potentialSavings?: number;
  suggestions: OptimizationSuggestion[];
}

export function useOptimizeMargins() {
  return useMutation({
    mutationFn: async (recipe: RecipeData): Promise<OptimizationResult> => {
      const { data, error } = await supabase.functions.invoke('optimize-margins', {
        body: { recipe },
      });

      if (error) {
        throw new Error(error.message || 'Failed to get optimization suggestions');
      }

      if (data.error) {
        throw new Error(data.error);
      }

      return data as OptimizationResult;
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Failed to analyze recipe');
    },
  });
}
