import { useMemo } from 'react';
import { DollarSign, TrendingUp, ChefHat, PieChart } from 'lucide-react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { RecipeWithIngredients } from '@/hooks/useRecipes';
import { Ingredient } from '@/types/inventory';

interface RecipeCostBreakdownProps {
  recipe: RecipeWithIngredients;
  ingredients: Ingredient[];
}

interface CostItem {
  ingredientId: string;
  name: string;
  quantity: number;
  unit: string;
  unitCost: number;
  lineCost: number;
  percentage: number;
}

export function RecipeCostBreakdown({ recipe, ingredients }: RecipeCostBreakdownProps) {
  const costBreakdown = useMemo(() => {
    const ingredientMap = new Map(ingredients.map(i => [i.id, i]));
    
    const items: CostItem[] = recipe.recipe_ingredients.map(ri => {
      const ingredient = ingredientMap.get(ri.ingredient_id);
      const unitCost = ingredient?.unitCost || 0;
      const lineCost = ri.quantity * unitCost;
      
      return {
        ingredientId: ri.ingredient_id,
        name: ingredient?.name || 'Unknown',
        quantity: ri.quantity,
        unit: ri.unit,
        unitCost,
        lineCost,
        percentage: 0, // Will be calculated after total
      };
    });
    
    const totalCost = items.reduce((sum, item) => sum + item.lineCost, 0);
    
    // Calculate percentages
    items.forEach(item => {
      item.percentage = totalCost > 0 ? (item.lineCost / totalCost) * 100 : 0;
    });
    
    // Sort by cost descending
    items.sort((a, b) => b.lineCost - a.lineCost);
    
    const menuPrice = recipe.menu_price || 0;
    const foodCostPct = menuPrice > 0 ? (totalCost / menuPrice) * 100 : 0;
    
    return {
      items,
      totalCost,
      menuPrice,
      foodCostPct,
      yieldAmount: recipe.yield_amount,
      yieldUnit: recipe.yield_unit,
      costPerUnit: totalCost / (recipe.yield_amount || 1),
    };
  }, [recipe, ingredients]);

  const getFoodCostStatus = (pct: number) => {
    if (pct <= 28) return { label: 'Excellent', variant: 'high' as const };
    if (pct <= 32) return { label: 'Good', variant: 'accent' as const };
    if (pct <= 38) return { label: 'Fair', variant: 'medium' as const };
    return { label: 'High', variant: 'low' as const };
  };

  const status = getFoodCostStatus(costBreakdown.foodCostPct);

  return (
    <Card className="mb-6 animate-fade-in">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg font-semibold flex items-center gap-2">
            <PieChart className="h-5 w-5 text-primary" />
            Cost Breakdown: {recipe.name}
          </CardTitle>
          {costBreakdown.menuPrice > 0 && (
            <Badge variant={status.variant}>
              {costBreakdown.foodCostPct.toFixed(1)}% Food Cost • {status.label}
            </Badge>
          )}
        </div>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          <div className="p-3 rounded-lg bg-muted/50">
            <p className="text-xs text-muted-foreground mb-1">Total Cost</p>
            <p className="text-xl font-bold text-foreground">
              ${costBreakdown.totalCost.toFixed(2)}
            </p>
          </div>
          <div className="p-3 rounded-lg bg-muted/50">
            <p className="text-xs text-muted-foreground mb-1">Cost per {costBreakdown.yieldUnit}</p>
            <p className="text-xl font-bold text-foreground">
              ${costBreakdown.costPerUnit.toFixed(2)}
            </p>
          </div>
          <div className="p-3 rounded-lg bg-muted/50">
            <p className="text-xs text-muted-foreground mb-1">Menu Price</p>
            <p className="text-xl font-bold text-foreground">
              {costBreakdown.menuPrice > 0 ? `$${costBreakdown.menuPrice.toFixed(2)}` : '—'}
            </p>
          </div>
          <div className="p-3 rounded-lg bg-muted/50">
            <p className="text-xs text-muted-foreground mb-1">Yield</p>
            <p className="text-xl font-bold text-foreground">
              {costBreakdown.yieldAmount} {costBreakdown.yieldUnit}
            </p>
          </div>
        </div>

        <div className="space-y-3">
          <p className="text-sm font-medium text-muted-foreground">Ingredient Costs</p>
          {costBreakdown.items.map((item, index) => (
            <div 
              key={item.ingredientId} 
              className="flex items-center gap-4 animate-fade-in"
              style={{ animationDelay: `${index * 50}ms` }}
            >
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between mb-1">
                  <p className="text-sm font-medium truncate">{item.name}</p>
                  <p className="text-sm font-semibold text-foreground">
                    ${item.lineCost.toFixed(2)}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <Progress value={item.percentage} className="h-2 flex-1" />
                  <span className="text-xs text-muted-foreground w-12 text-right">
                    {item.percentage.toFixed(0)}%
                  </span>
                </div>
                <p className="text-xs text-muted-foreground mt-0.5">
                  {item.quantity} {item.unit} × ${item.unitCost.toFixed(2)}
                </p>
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
