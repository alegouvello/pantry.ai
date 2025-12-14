import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { startOfWeek, subWeeks, format } from 'date-fns';

export interface CostSnapshotSummary {
  id: string;
  week_start: string;
  avg_food_cost_pct: number;
  total_recipes: number;
  recipes_on_target: number;
  recipes_warning: number;
  recipes_high: number;
  created_at: string;
}

export function useCostSnapshotSummaries(weeks: number = 4) {
  return useQuery({
    queryKey: ['cost-snapshot-summaries', weeks],
    queryFn: async () => {
      const startDate = format(subWeeks(new Date(), weeks), 'yyyy-MM-dd');
      
      const { data, error } = await supabase
        .from('cost_snapshot_summaries')
        .select('*')
        .gte('week_start', startDate)
        .order('week_start', { ascending: false });
      
      if (error) throw error;
      return data as CostSnapshotSummary[];
    },
  });
}

export function useCreateCostSnapshot() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (recipes: Array<{
      id: string;
      name: string;
      totalCost: number;
      menuPrice: number | null;
      foodCostPct: number;
    }>) => {
      const today = new Date();
      const weekStart = startOfWeek(today, { weekStartsOn: 1 }); // Monday
      const weekStartStr = format(weekStart, 'yyyy-MM-dd');
      const todayStr = format(today, 'yyyy-MM-dd');
      
      // Insert individual recipe snapshots
      const snapshots = recipes.map(recipe => ({
        snapshot_date: todayStr,
        recipe_id: recipe.id,
        recipe_name: recipe.name,
        total_cost: recipe.totalCost,
        menu_price: recipe.menuPrice,
        food_cost_pct: recipe.foodCostPct,
      }));
      
      const { error: snapshotError } = await supabase
        .from('cost_snapshots')
        .insert(snapshots);
      
      if (snapshotError) throw snapshotError;
      
      // Calculate and upsert weekly summary
      const recipesWithPrice = recipes.filter(r => r.menuPrice && r.menuPrice > 0);
      const avgFoodCost = recipesWithPrice.length > 0
        ? recipesWithPrice.reduce((sum, r) => sum + r.foodCostPct, 0) / recipesWithPrice.length
        : 0;
      
      const onTarget = recipesWithPrice.filter(r => r.foodCostPct <= 30).length;
      const warning = recipesWithPrice.filter(r => r.foodCostPct > 30 && r.foodCostPct <= 35).length;
      const high = recipesWithPrice.filter(r => r.foodCostPct > 35).length;
      
      const { error: summaryError } = await supabase
        .from('cost_snapshot_summaries')
        .upsert({
          week_start: weekStartStr,
          avg_food_cost_pct: avgFoodCost,
          total_recipes: recipesWithPrice.length,
          recipes_on_target: onTarget,
          recipes_warning: warning,
          recipes_high: high,
        }, {
          onConflict: 'week_start',
        });
      
      if (summaryError) throw summaryError;
      
      return { success: true };
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['cost-snapshot-summaries'] });
    },
  });
}
