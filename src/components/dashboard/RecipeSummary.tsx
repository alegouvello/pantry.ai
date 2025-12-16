import { ChefHat, DollarSign, TrendingUp, AlertCircle } from 'lucide-react';
import { motion } from 'framer-motion';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { useRecipes } from '@/hooks/useRecipes';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';

export function RecipeSummary() {
  const { t } = useTranslation();
  const { data: recipes, isLoading } = useRecipes();

  if (isLoading) {
    return (
      <Card variant="elevated" className="backdrop-blur-sm bg-card/80 border-border/50">
        <CardHeader>
          <CardTitle className="text-base font-semibold flex items-center gap-2">
            <div className="p-1.5 rounded-lg bg-primary/10">
              <ChefHat className="h-4 w-4 text-primary" />
            </div>
            {t('dashboard.recipeSummary.title')}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="animate-pulse space-y-3">
            {[1, 2, 3].map(i => (
              <div key={i} className="h-12 bg-muted rounded-lg" />
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  // Filter to only dish recipes (not prep)
  const dishRecipes = recipes?.filter(r => r.recipe_type !== 'Prep') || [];
  const prepRecipes = recipes?.filter(r => r.recipe_type === 'Prep') || [];
  
  // Calculate food cost for recipes with ingredients
  const recipesWithCost = dishRecipes.map(recipe => {
    const ingredientsCost = recipe.recipe_ingredients?.reduce((sum, ri) => {
      const unitCost = ri.ingredients?.unit_cost || 0;
      return sum + (ri.quantity * unitCost);
    }, 0) || 0;
    
    const menuPrice = recipe.menu_price || 0;
    const foodCostPct = menuPrice > 0 ? (ingredientsCost / menuPrice) * 100 : 0;
    
    return {
      ...recipe,
      ingredientsCost,
      foodCostPct,
      needsAttention: foodCostPct > 35 || !recipe.menu_price,
    };
  });

  // Get recipes needing attention (high food cost or missing price)
  const needsAttention = recipesWithCost.filter(r => r.needsAttention).slice(0, 3);
  const avgFoodCost = recipesWithCost.length > 0 
    ? recipesWithCost.reduce((sum, r) => sum + r.foodCostPct, 0) / recipesWithCost.length 
    : 0;

  return (
    <Card variant="elevated" className="backdrop-blur-sm bg-card/80 border-border/50">
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <CardTitle className="text-base font-semibold flex items-center gap-2">
          <div className="p-1.5 rounded-lg bg-primary/10">
            <ChefHat className="h-4 w-4 text-primary" />
          </div>
          {t('dashboard.recipeSummary.title')}
        </CardTitle>
        <Link to="/recipes">
          <Badge variant="secondary" className="text-xs cursor-pointer hover:bg-secondary/80 transition-colors">
            {dishRecipes.length} {t('dashboard.recipeSummary.dishes')}
          </Badge>
        </Link>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Summary Stats */}
        <div className="grid grid-cols-2 gap-3">
          <motion.div 
            className="bg-muted/30 rounded-xl p-4 text-center border border-border/30"
            whileHover={{ scale: 1.02 }}
            transition={{ duration: 0.2 }}
          >
            <p className="text-3xl font-bold text-foreground">{dishRecipes.length}</p>
            <p className="text-xs text-muted-foreground mt-1">{t('dashboard.recipeSummary.menuItems')}</p>
          </motion.div>
          <motion.div 
            className="bg-muted/30 rounded-xl p-4 text-center border border-border/30"
            whileHover={{ scale: 1.02 }}
            transition={{ duration: 0.2 }}
          >
            <p className="text-3xl font-bold text-foreground">{prepRecipes.length}</p>
            <p className="text-xs text-muted-foreground mt-1">{t('dashboard.recipeSummary.prepRecipes')}</p>
          </motion.div>
        </div>

        {/* Average Food Cost */}
        <div className="space-y-3 p-4 rounded-xl bg-muted/20 border border-border/30">
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">{t('dashboard.recipeSummary.avgFoodCost')}</span>
            <span className={`font-semibold ${avgFoodCost > 35 ? 'text-warning' : 'text-success'}`}>
              {avgFoodCost.toFixed(1)}%
            </span>
          </div>
          <Progress 
            value={Math.min(avgFoodCost, 100)} 
            className={`h-2 ${avgFoodCost > 35 ? '[&>div]:bg-warning' : '[&>div]:bg-success'}`}
          />
          <p className="text-xs text-muted-foreground">
            {t('dashboard.recipeSummary.targetMargin')}
          </p>
        </div>

        {/* Recipes Needing Attention */}
        {needsAttention.length > 0 && (
          <div className="space-y-2">
            <p className="text-sm font-medium flex items-center gap-2 text-warning">
              <AlertCircle className="h-3.5 w-3.5" />
              {t('dashboard.recipeSummary.needsReview')}
            </p>
            <div className="space-y-1">
              {needsAttention.map((recipe, index) => (
                <motion.div 
                  key={recipe.id} 
                  className="flex items-center justify-between text-sm py-2 px-3 rounded-lg hover:bg-muted/30 transition-colors"
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: index * 0.05 }}
                >
                  <span className="text-foreground truncate">{recipe.name}</span>
                  <span className="text-muted-foreground text-xs">
                    {recipe.menu_price ? `${recipe.foodCostPct.toFixed(0)}% ${t('dashboard.recipeSummary.cost')}` : t('dashboard.recipeSummary.noPrice')}
                  </span>
                </motion.div>
              ))}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
