import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import { useRecipes } from '@/hooks/useRecipes';
import { PieChart, Pie, Cell, ResponsiveContainer, Legend, Tooltip } from 'recharts';
import { DollarSign, TrendingDown, TrendingUp, Minus } from 'lucide-react';

export function FoodCostChart() {
  const { data: recipes, isLoading } = useRecipes();

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
      name: recipe.name,
      cost: totalCost,
      price: recipe.menu_price || 0,
      foodCostPct,
    };
  });

  // Calculate average food cost
  const avgFoodCost = recipesCosts.length > 0
    ? recipesCosts.reduce((sum, r) => sum + r.foodCostPct, 0) / recipesCosts.length
    : 0;

  // Categorize recipes by food cost range
  const excellent = recipesCosts.filter(r => r.foodCostPct <= 25).length;
  const good = recipesCosts.filter(r => r.foodCostPct > 25 && r.foodCostPct <= 30).length;
  const warning = recipesCosts.filter(r => r.foodCostPct > 30 && r.foodCostPct <= 35).length;
  const high = recipesCosts.filter(r => r.foodCostPct > 35).length;

  const chartData = [
    { name: '≤25%', value: excellent, color: 'hsl(var(--success))' },
    { name: '26-30%', value: good, color: 'hsl(var(--primary))' },
    { name: '31-35%', value: warning, color: 'hsl(var(--warning))' },
    { name: '>35%', value: high, color: 'hsl(var(--destructive))' },
  ].filter(d => d.value > 0);

  // Get status color and icon based on average
  const getStatusInfo = () => {
    if (avgFoodCost <= 28) return { color: 'success', icon: TrendingDown, label: 'Excellent' };
    if (avgFoodCost <= 32) return { color: 'warning', icon: Minus, label: 'Average' };
    return { color: 'destructive', icon: TrendingUp, label: 'High' };
  };

  const status = getStatusInfo();
  const StatusIcon = status.icon;

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
      <CardHeader className="pb-2">
        <CardTitle className="text-base font-semibold flex items-center gap-2">
          <DollarSign className="h-4 w-4 text-primary" />
          Food Cost Overview
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Average Food Cost */}
        <div className="flex items-center justify-between p-3 rounded-lg bg-muted/50">
          <div>
            <p className="text-xs text-muted-foreground">Average Food Cost</p>
            <p className="text-2xl font-bold text-foreground">{avgFoodCost.toFixed(1)}%</p>
          </div>
          <Badge variant={status.color as 'success' | 'warning' | 'destructive'} className="flex items-center gap-1">
            <StatusIcon className="h-3 w-3" />
            {status.label}
          </Badge>
        </div>

        {/* Pie Chart */}
        {chartData.length > 0 && (
          <div className="h-40">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={chartData}
                  cx="50%"
                  cy="50%"
                  innerRadius={35}
                  outerRadius={55}
                  paddingAngle={2}
                  dataKey="value"
                >
                  {chartData.map((entry, index) => (
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
                  wrapperStyle={{ fontSize: '12px' }}
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
