import { useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { motion } from 'framer-motion';
import { Star, TrendingUp, HelpCircle, AlertTriangle } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { cn } from '@/lib/utils';
import type { RecipeWithIngredients } from '@/hooks/useRecipes';

interface MenuEngineeringMatrixProps {
  recipes: RecipeWithIngredients[];
  onRecipeClick?: (recipe: RecipeWithIngredients) => void;
}

interface ProcessedRecipe {
  recipe: RecipeWithIngredients;
  totalCost: number;
  menuPrice: number;
  profit: number;
  profitMargin: number;
  foodCostPct: number;
}

type Quadrant = 'star' | 'plowhorse' | 'puzzle' | 'dog';

const quadrantConfig: Record<Quadrant, { 
  labelKey: string; 
  icon: React.ComponentType<{ className?: string }>; 
  color: string;
  bgColor: string;
  descriptionKey: string;
}> = {
  star: {
    labelKey: 'menuMatrix.stars',
    icon: Star,
    color: 'text-amber-500',
    bgColor: 'bg-amber-500/10 border-amber-500/20',
    descriptionKey: 'menuMatrix.starsDesc',
  },
  plowhorse: {
    labelKey: 'menuMatrix.plowhorses',
    icon: TrendingUp,
    color: 'text-blue-500',
    bgColor: 'bg-blue-500/10 border-blue-500/20',
    descriptionKey: 'menuMatrix.plowhorsesDesc',
  },
  puzzle: {
    labelKey: 'menuMatrix.puzzles',
    icon: HelpCircle,
    color: 'text-purple-500',
    bgColor: 'bg-purple-500/10 border-purple-500/20',
    descriptionKey: 'menuMatrix.puzzlesDesc',
  },
  dog: {
    labelKey: 'menuMatrix.dogs',
    icon: AlertTriangle,
    color: 'text-muted-foreground',
    bgColor: 'bg-muted/50 border-muted',
    descriptionKey: 'menuMatrix.dogsDesc',
  },
};

export function MenuEngineeringMatrix({ recipes, onRecipeClick }: MenuEngineeringMatrixProps) {
  const { t } = useTranslation();
  const { processedRecipes, avgProfit, categorizedRecipes } = useMemo(() => {
    // Process recipes with costs
    const processed: ProcessedRecipe[] = recipes
      .filter(r => r.menu_price && r.menu_price > 0)
      .map(recipe => {
        const totalCost = recipe.recipe_ingredients?.reduce((sum, ri) => {
          const unitCost = ri.ingredients?.unit_cost || 0;
          return sum + (ri.quantity * unitCost);
        }, 0) || 0;
        
        const costPerPortion = recipe.yield_amount > 0 ? totalCost / recipe.yield_amount : totalCost;
        const menuPrice = recipe.menu_price || 0;
        const profit = menuPrice - costPerPortion;
        const profitMargin = menuPrice > 0 ? (profit / menuPrice) * 100 : 0;
        const foodCostPct = menuPrice > 0 ? (costPerPortion / menuPrice) * 100 : 0;

        return {
          recipe,
          totalCost: costPerPortion,
          menuPrice,
          profit,
          profitMargin,
          foodCostPct,
        };
      });

    // Calculate averages for classification
    const avgProfit = processed.length > 0 
      ? processed.reduce((sum, r) => sum + r.profit, 0) / processed.length 
      : 0;

    // For popularity, we'll use a simple index-based simulation
    // In a real app, this would come from sales data
    const avgPopularityIndex = processed.length / 2;

    // Categorize recipes
    const categorized: Record<Quadrant, ProcessedRecipe[]> = {
      star: [],
      plowhorse: [],
      puzzle: [],
      dog: [],
    };

    processed.forEach((item, index) => {
      const isHighProfit = item.profit >= avgProfit;
      // Simulate popularity based on recipe position (in real app, use sales data)
      const isHighPopularity = index < avgPopularityIndex;

      if (isHighProfit && isHighPopularity) {
        categorized.star.push(item);
      } else if (!isHighProfit && isHighPopularity) {
        categorized.plowhorse.push(item);
      } else if (isHighProfit && !isHighPopularity) {
        categorized.puzzle.push(item);
      } else {
        categorized.dog.push(item);
      }
    });

    return { processedRecipes: processed, avgProfit, categorizedRecipes: categorized };
  }, [recipes]);

  const formatCurrency = (value: number) => 
    new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(value);

  if (processedRecipes.length === 0) {
    return (
      <Card className="p-8 text-center">
        <HelpCircle className="h-12 w-12 mx-auto mb-4 text-muted-foreground/50" />
        <p className="text-muted-foreground">
          {t('menuMatrix.noPrices')}
        </p>
      </Card>
    );
  }

  return (
    <TooltipProvider>
      <div className="space-y-6">
        {/* Summary Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {(Object.entries(quadrantConfig) as [Quadrant, typeof quadrantConfig[Quadrant]][]).map(([key, config]) => {
            const count = categorizedRecipes[key].length;
            const Icon = config.icon;
            return (
              <Card key={key} className={cn('border', config.bgColor)}>
                <CardContent className="p-4">
                  <div className="flex items-center gap-3">
                    <Icon className={cn('h-8 w-8', config.color)} />
                    <div>
                      <p className="text-2xl font-bold">{count}</p>
                      <p className="text-sm text-muted-foreground">{t(config.labelKey)}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>

        {/* Average Profit Line */}
        <Card className="p-4">
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">{t('menuMatrix.avgProfit')}</span>
            <span className="font-semibold text-primary">{formatCurrency(avgProfit)}</span>
          </div>
        </Card>

        {/* Matrix Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {(Object.entries(quadrantConfig) as [Quadrant, typeof quadrantConfig[Quadrant]][]).map(([quadrant, config]) => {
            const items = categorizedRecipes[quadrant];
            const Icon = config.icon;
            
            return (
              <motion.div
                key={quadrant}
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.3 }}
              >
                <Card className={cn('border h-full', config.bgColor)}>
                  <CardHeader className="pb-3">
                    <CardTitle className="flex items-center gap-2 text-lg">
                      <Icon className={cn('h-5 w-5', config.color)} />
                      <span>{t(config.labelKey)}</span>
                      <Badge variant="secondary" className="ml-auto">
                        {items.length}
                      </Badge>
                    </CardTitle>
                    <p className="text-xs text-muted-foreground">{t(config.descriptionKey)}</p>
                  </CardHeader>
                  <CardContent className="space-y-2">
                    {items.length === 0 ? (
                      <p className="text-sm text-muted-foreground italic py-4 text-center">
                        {t('menuMatrix.noItems')}
                      </p>
                    ) : (
                      items.map((item) => (
                        <Tooltip key={item.recipe.id}>
                          <TooltipTrigger asChild>
                            <button
                              onClick={() => onRecipeClick?.(item.recipe)}
                              className="w-full text-left p-3 rounded-lg bg-background/50 hover:bg-background/80 transition-colors border border-transparent hover:border-border"
                            >
                              <div className="flex items-center justify-between">
                                <span className="font-medium text-sm truncate mr-2">
                                  {item.recipe.name}
                                </span>
                                <div className="flex items-center gap-2 shrink-0">
                                  <span className={cn(
                                    'text-xs font-medium',
                                    item.foodCostPct <= 30 ? 'text-emerald-600' :
                                    item.foodCostPct <= 35 ? 'text-amber-600' : 'text-destructive'
                                  )}>
                                    {item.foodCostPct.toFixed(0)}%
                                  </span>
                                  <span className="text-xs text-muted-foreground">
                                    {formatCurrency(item.profit)}
                                  </span>
                                </div>
                              </div>
                            </button>
                          </TooltipTrigger>
                          <TooltipContent side="top" className="max-w-xs">
                            <div className="space-y-1 text-xs">
                              <p><strong>{t('menuMatrix.menuPrice')}:</strong> {formatCurrency(item.menuPrice)}</p>
                              <p><strong>{t('menuMatrix.foodCost')}:</strong> {formatCurrency(item.totalCost)}</p>
                              <p><strong>{t('menuMatrix.profit')}:</strong> {formatCurrency(item.profit)}</p>
                              <p><strong>{t('menuMatrix.foodCostPct')}:</strong> {item.foodCostPct.toFixed(1)}%</p>
                            </div>
                          </TooltipContent>
                        </Tooltip>
                      ))
                    )}
                  </CardContent>
                </Card>
              </motion.div>
            );
          })}
        </div>
      </div>
    </TooltipProvider>
  );
}
