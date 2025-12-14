import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { useRecipes } from '@/hooks/useRecipes';
import { useCostSnapshotSummaries, useCreateCostSnapshot } from '@/hooks/useCostSnapshots';
import { PieChart, Pie, Cell, ResponsiveContainer, Legend, Tooltip, BarChart, Bar, XAxis, YAxis, CartesianGrid } from 'recharts';
import { DollarSign, TrendingDown, TrendingUp, Minus, Camera, RefreshCw } from 'lucide-react';
import { format, parseISO } from 'date-fns';
import { toast } from 'sonner';

export function FoodCostChart() {
  const { data: recipes, isLoading: recipesLoading } = useRecipes();
  const { data: snapshots, isLoading: snapshotsLoading } = useCostSnapshotSummaries(4);
  const createSnapshot = useCreateCostSnapshot();

  const isLoading = recipesLoading || snapshotsLoading;

  if (isLoading) {
    return (
      <Card variant="elevated">
        <CardHeader className="pb-2">
          <Skeleton className="h-5 w-32" />
        </CardHeader>
        <CardContent>
          <Skeleton className="h-48 w-full" />
        </CardContent>
      </Card>
    );
  }

  // Filter to only dish recipes with prices
  const dishRecipes = recipes?.filter(r => r.recipe_type !== 'Prep' && r.menu_price && r.menu_price > 0) || [];

  // Calculate food costs for each recipe
  const recipesCosts = dishRecipes.map(recipe => {
    const totalCost = recipe.recipe_ingredients?.reduce((sum, ri) => {
      const ingredient = ri.ingredients;
      if (!ingredient) return sum;
      return sum + (ri.quantity * ingredient.unit_cost);
    }, 0) || 0;
    
    const foodCostPct = recipe.menu_price ? (totalCost / recipe.menu_price) * 100 : 0;
    
    return {
      id: recipe.id,
      name: recipe.name,
      totalCost,
      menuPrice: recipe.menu_price,
      foodCostPct,
    };
  });

  // Calculate current average food cost
  const currentAvgFoodCost = recipesCosts.length > 0
    ? recipesCosts.reduce((sum, r) => sum + r.foodCostPct, 0) / recipesCosts.length
    : 0;

  // Get last week's data for comparison
  const lastWeekSummary = snapshots && snapshots.length > 0 ? snapshots[0] : null;
  const previousWeekSummary = snapshots && snapshots.length > 1 ? snapshots[1] : null;
  
  // Calculate week-over-week change
  const weekOverWeekChange = lastWeekSummary && previousWeekSummary
    ? lastWeekSummary.avg_food_cost_pct - previousWeekSummary.avg_food_cost_pct
    : null;

  // Categorize recipes by food cost range
  const excellent = recipesCosts.filter(r => r.foodCostPct <= 25).length;
  const good = recipesCosts.filter(r => r.foodCostPct > 25 && r.foodCostPct <= 30).length;
  const warning = recipesCosts.filter(r => r.foodCostPct > 30 && r.foodCostPct <= 35).length;
  const high = recipesCosts.filter(r => r.foodCostPct > 35).length;

  const pieData = [
    { name: '≤25%', value: excellent, color: 'hsl(var(--success))' },
    { name: '26-30%', value: good, color: 'hsl(var(--primary))' },
    { name: '31-35%', value: warning, color: 'hsl(var(--warning))' },
    { name: '>35%', value: high, color: 'hsl(var(--destructive))' },
  ].filter(d => d.value > 0);

  // Prepare trend chart data (reverse to show oldest first)
  const trendData = snapshots?.slice().reverse().map(s => ({
    week: format(parseISO(s.week_start), 'MMM d'),
    avgCost: Number(s.avg_food_cost_pct.toFixed(1)),
  })) || [];

  // Get status color and icon based on average
  const getStatusInfo = () => {
    if (currentAvgFoodCost <= 28) return { color: 'success', icon: TrendingDown, label: 'Excellent' };
    if (currentAvgFoodCost <= 32) return { color: 'warning', icon: Minus, label: 'Average' };
    return { color: 'destructive', icon: TrendingUp, label: 'High' };
  };

  const status = getStatusInfo();
  const StatusIcon = status.icon;

  const handleTakeSnapshot = async () => {
    try {
      await createSnapshot.mutateAsync(recipesCosts);
      toast.success('Cost snapshot saved successfully');
    } catch (error) {
      toast.error('Failed to save snapshot');
    }
  };

  if (dishRecipes.length === 0) {
    return (
      <Card variant="elevated">
        <CardHeader className="pb-2">
          <CardTitle className="text-base font-semibold flex items-center gap-2">
            <DollarSign className="h-4 w-4 text-primary" />
            Food Cost Overview
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8 text-muted-foreground">
            <DollarSign className="h-8 w-8 mx-auto mb-2 opacity-50" />
            <p className="text-sm">No recipes with pricing</p>
            <p className="text-xs mt-1">Add menu prices to see food cost analysis</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card variant="elevated">
      <CardHeader className="pb-2 flex flex-row items-center justify-between">
        <CardTitle className="text-base font-semibold flex items-center gap-2">
          <DollarSign className="h-4 w-4 text-primary" />
          Food Cost Overview
        </CardTitle>
        <Button 
          variant="ghost" 
          size="sm" 
          onClick={handleTakeSnapshot}
          disabled={createSnapshot.isPending}
          className="h-8 px-2"
        >
          {createSnapshot.isPending ? (
            <RefreshCw className="h-3 w-3 animate-spin" />
          ) : (
            <Camera className="h-3 w-3" />
          )}
          <span className="ml-1 text-xs">Snapshot</span>
        </Button>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Average Food Cost with Trend */}
        <div className="flex items-center justify-between p-3 rounded-lg bg-muted/50">
          <div>
            <p className="text-xs text-muted-foreground">Current Average</p>
            <div className="flex items-baseline gap-2">
              <p className="text-2xl font-bold text-foreground">{currentAvgFoodCost.toFixed(1)}%</p>
              {weekOverWeekChange !== null && (
                <span className={`text-xs flex items-center gap-0.5 ${
                  weekOverWeekChange < 0 ? 'text-success' : weekOverWeekChange > 0 ? 'text-destructive' : 'text-muted-foreground'
                }`}>
                  {weekOverWeekChange < 0 ? (
                    <TrendingDown className="h-3 w-3" />
                  ) : weekOverWeekChange > 0 ? (
                    <TrendingUp className="h-3 w-3" />
                  ) : (
                    <Minus className="h-3 w-3" />
                  )}
                  {Math.abs(weekOverWeekChange).toFixed(1)}%
                </span>
              )}
            </div>
          </div>
          <Badge variant={status.color as 'success' | 'warning' | 'destructive'} className="flex items-center gap-1">
            <StatusIcon className="h-3 w-3" />
            {status.label}
          </Badge>
        </div>

        {/* Week-over-Week Trend Chart */}
        {trendData.length > 1 && (
          <div className="space-y-2">
            <p className="text-xs text-muted-foreground font-medium">Weekly Trend</p>
            <div className="h-24">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={trendData} margin={{ top: 5, right: 5, left: -20, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--border))" />
                  <XAxis 
                    dataKey="week" 
                    tick={{ fontSize: 10, fill: 'hsl(var(--muted-foreground))' }}
                    axisLine={false}
                    tickLine={false}
                  />
                  <YAxis 
                    tick={{ fontSize: 10, fill: 'hsl(var(--muted-foreground))' }}
                    axisLine={false}
                    tickLine={false}
                    domain={[0, 'auto']}
                    tickFormatter={(value) => `${value}%`}
                  />
                  <Tooltip 
                    formatter={(value: number) => [`${value}%`, 'Avg Food Cost']}
                    contentStyle={{ 
                      backgroundColor: 'hsl(var(--card))', 
                      border: '1px solid hsl(var(--border))',
                      borderRadius: '8px',
                      fontSize: '12px',
                    }}
                  />
                  <Bar 
                    dataKey="avgCost" 
                    fill="hsl(var(--primary))" 
                    radius={[4, 4, 0, 0]}
                  />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        )}

        {/* Pie Chart */}
        {pieData.length > 0 && (
          <div className="h-32">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={pieData}
                  cx="50%"
                  cy="50%"
                  innerRadius={30}
                  outerRadius={45}
                  paddingAngle={2}
                  dataKey="value"
                >
                  {pieData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip 
                  formatter={(value: number) => [`${value} recipes`, 'Count']}
                  contentStyle={{ 
                    backgroundColor: 'hsl(var(--card))', 
                    border: '1px solid hsl(var(--border))',
                    borderRadius: '8px',
                  }}
                />
                <Legend 
                  verticalAlign="middle" 
                  align="right"
                  layout="vertical"
                  wrapperStyle={{ fontSize: '11px' }}
                />
              </PieChart>
            </ResponsiveContainer>
          </div>
        )}

        {/* Summary Stats */}
        <div className="grid grid-cols-2 gap-2 text-xs">
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-success" />
            <span className="text-muted-foreground">On target:</span>
            <span className="font-medium text-foreground">{excellent + good}</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-destructive" />
            <span className="text-muted-foreground">Needs review:</span>
            <span className="font-medium text-foreground">{warning + high}</span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
