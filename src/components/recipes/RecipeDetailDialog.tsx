import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  ChefHat, Clock, Package, DollarSign, TrendingUp, Sparkles, 
  Loader2, ListOrdered, ImageIcon, X, Pencil, Globe, ExternalLink 
} from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { OptimizedImage } from '@/components/ui/optimized-image';
import { useGenerateRecipeSteps } from '@/hooks/useGenerateRecipeSteps';
import { useSearchRecipeSteps } from '@/hooks/useSearchRecipeSteps';
import { useUpdateRecipe } from '@/hooks/useRecipes';
import { cn } from '@/lib/utils';
import type { RecipeWithIngredients } from '@/hooks/useRecipes';

interface RecipeDetailDialogProps {
  recipe: RecipeWithIngredients | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onEdit?: () => void;
}

interface RecipeStep {
  step: number;
  instruction: string;
}

const formatCurrency = (value: number) => {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 2,
  }).format(value);
};

export function RecipeDetailDialog({ recipe, open, onOpenChange, onEdit }: RecipeDetailDialogProps) {
  const [steps, setSteps] = useState<RecipeStep[]>([]);
  const [stepsSource, setStepsSource] = useState<{ url: string; title: string } | null>(null);
  const generateSteps = useGenerateRecipeSteps();
  const searchSteps = useSearchRecipeSteps();
  const updateRecipe = useUpdateRecipe();

  // Parse existing instructions or reset
  useEffect(() => {
    if (recipe?.instructions) {
      try {
        const parsed = JSON.parse(recipe.instructions);
        if (Array.isArray(parsed)) {
          setSteps(parsed);
        } else if (parsed.steps && Array.isArray(parsed.steps)) {
          setSteps(parsed.steps);
          if (parsed.source) {
            setStepsSource(parsed.source);
          }
        } else {
          setSteps([]);
        }
      } catch {
        // If not JSON, convert text to steps
        const lines = recipe.instructions.split('\n').filter(l => l.trim());
        setSteps(lines.map((line, i) => ({
          step: i + 1,
          instruction: line.replace(/^\d+\.\s*/, '').trim()
        })));
      }
    } else {
      setSteps([]);
      setStepsSource(null);
    }
  }, [recipe]);

  if (!recipe) return null;

  const totalCost = recipe.recipe_ingredients?.reduce((sum, ri) => {
    return sum + (ri.quantity * (ri.ingredients?.unit_cost || 0));
  }, 0) || 0;

  const costPerPortion = recipe.yield_amount > 0 ? totalCost / recipe.yield_amount : totalCost;
  const foodCostPct = recipe.menu_price && recipe.menu_price > 0 
    ? (costPerPortion / recipe.menu_price) * 100 
    : null;

  const handleGenerateSteps = async () => {
    const ingredients = recipe.recipe_ingredients?.map(ri => ({
      name: ri.ingredients?.name || 'Unknown',
      quantity: ri.quantity,
      unit: ri.unit,
    })) || [];

    const result = await generateSteps.mutateAsync({
      recipeName: recipe.name,
      category: recipe.category,
      ingredients,
      yieldAmount: recipe.yield_amount,
      yieldUnit: recipe.yield_unit,
      prepTime: recipe.prep_time_minutes || undefined,
    });

    if (result.steps && result.steps.length > 0) {
      setSteps(result.steps);
      setStepsSource(null);
      
      // Save to database
      await updateRecipe.mutateAsync({
        id: recipe.id,
        instructions: JSON.stringify({ steps: result.steps }),
      });
    }
  };

  const handleSearchSteps = async () => {
    const result = await searchSteps.mutateAsync({
      recipeName: recipe.name,
      category: recipe.category,
    });

    if (result.steps && result.steps.length > 0) {
      setSteps(result.steps);
      setStepsSource(result.source);
      
      // Save to database with source info
      await updateRecipe.mutateAsync({
        id: recipe.id,
        instructions: JSON.stringify({ steps: result.steps, source: result.source }),
      });
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] p-0 overflow-hidden">
        {/* Hero Image */}
        <div className="relative h-48 bg-gradient-to-br from-primary/20 to-primary/5">
          {recipe.image_url ? (
            <OptimizedImage 
              src={recipe.image_url} 
              alt={recipe.name}
              className="w-full h-full object-cover"
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center">
              <ImageIcon className="w-16 h-16 text-muted-foreground/30" />
            </div>
          )}
          <div className="absolute inset-0 bg-gradient-to-t from-background via-background/50 to-transparent" />
          <div className="absolute bottom-4 left-6 right-6">
            <DialogHeader>
              <DialogTitle className="text-2xl font-bold text-foreground">
                {recipe.name}
              </DialogTitle>
              <div className="flex items-center gap-2 mt-1">
                <Badge variant="outline">{recipe.category}</Badge>
                {recipe.recipe_type && recipe.recipe_type !== 'Dish' && (
                  <Badge variant="secondary">{recipe.recipe_type}</Badge>
                )}
                <Badge variant={recipe.is_active ? 'success' : 'muted'}>
                  {recipe.is_active ? 'Active' : 'Inactive'}
                </Badge>
              </div>
            </DialogHeader>
          </div>
          <div className="absolute top-3 right-3 flex items-center gap-2">
            {onEdit && (
              <Button 
                variant="ghost" 
                size="icon" 
                className="bg-background/50 backdrop-blur-sm hover:bg-background/80"
                onClick={() => {
                  onOpenChange(false);
                  onEdit();
                }}
              >
                <Pencil className="h-4 w-4" />
              </Button>
            )}
            <Button 
              variant="ghost" 
              size="icon" 
              className="bg-background/50 backdrop-blur-sm hover:bg-background/80"
              onClick={() => onOpenChange(false)}
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        </div>

        <ScrollArea className="max-h-[calc(90vh-12rem)]">
          <div className="p-6 space-y-6">
            {/* Quick Stats */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              <div className="flex items-center gap-2 text-sm">
                <Package className="h-4 w-4 text-primary" />
                <span>{recipe.recipe_ingredients?.length || 0} ingredients</span>
              </div>
              <div className="flex items-center gap-2 text-sm">
                <Clock className="h-4 w-4 text-primary" />
                <span>Yields {recipe.yield_amount} {recipe.yield_unit}</span>
              </div>
              {recipe.prep_time_minutes && (
                <div className="flex items-center gap-2 text-sm">
                  <Clock className="h-4 w-4 text-muted-foreground" />
                  <span>{recipe.prep_time_minutes} min prep</span>
                </div>
              )}
              {recipe.menu_price && (
                <div className="flex items-center gap-2 text-sm">
                  <TrendingUp className="h-4 w-4 text-primary" />
                  <span>{formatCurrency(recipe.menu_price)}</span>
                </div>
              )}
            </div>

            {/* Cost Breakdown */}
            {totalCost > 0 && (
              <div className="p-4 rounded-lg bg-muted/50 border">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <DollarSign className="h-5 w-5 text-primary" />
                    <span className="font-medium">Cost per portion</span>
                  </div>
                  <div className="text-right">
                    <span className="text-lg font-bold">{formatCurrency(costPerPortion)}</span>
                    {foodCostPct !== null && (
                      <Badge 
                        variant={foodCostPct <= 30 ? 'success' : foodCostPct <= 35 ? 'warning' : 'destructive'}
                        className="ml-2"
                      >
                        {foodCostPct.toFixed(1)}% FC
                      </Badge>
                    )}
                  </div>
                </div>
              </div>
            )}

            <Separator />

            {/* Ingredients */}
            <div>
              <h3 className="font-semibold mb-3 flex items-center gap-2">
                <Package className="h-4 w-4" />
                Ingredients
              </h3>
              <div className="grid gap-2">
                {recipe.recipe_ingredients?.map((ri) => (
                  <div 
                    key={ri.id} 
                    className="flex items-center justify-between py-2 px-3 rounded-lg bg-muted/30 hover:bg-muted/50 transition-colors"
                  >
                    <span className="font-medium">{ri.ingredients?.name}</span>
                    <div className="flex items-center gap-3">
                      <span className="text-muted-foreground">
                        {ri.quantity} {ri.unit}
                      </span>
                      {ri.ingredients?.unit_cost && (
                        <span className="text-sm text-muted-foreground">
                          {formatCurrency(ri.quantity * ri.ingredients.unit_cost)}
                        </span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <Separator />

            {/* Cooking Steps */}
            <div>
              <div className="flex items-center justify-between mb-3 flex-wrap gap-2">
                <h3 className="font-semibold flex items-center gap-2">
                  <ListOrdered className="h-4 w-4" />
                  Cooking Steps
                  {stepsSource && (
                    <a 
                      href={stepsSource.url} 
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="text-xs text-muted-foreground hover:text-primary flex items-center gap-1 font-normal"
                    >
                      <ExternalLink className="h-3 w-3" />
                      Source
                    </a>
                  )}
                </h3>
                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleSearchSteps}
                    disabled={searchSteps.isPending || generateSteps.isPending}
                  >
                    {searchSteps.isPending ? (
                      <>
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        Searching...
                      </>
                    ) : (
                      <>
                        <Globe className="h-4 w-4 mr-2" />
                        Search Web
                      </>
                    )}
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleGenerateSteps}
                    disabled={generateSteps.isPending || searchSteps.isPending}
                  >
                    {generateSteps.isPending ? (
                      <>
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        Generating...
                      </>
                    ) : (
                      <>
                        <Sparkles className="h-4 w-4 mr-2" />
                        Generate AI
                      </>
                    )}
                  </Button>
                </div>
              </div>

              <AnimatePresence mode="wait">
                {steps.length > 0 ? (
                  <motion.div 
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="space-y-3"
                  >
                    {steps.map((step, index) => (
                      <motion.div
                        key={step.step}
                        initial={{ opacity: 0, x: -10 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: index * 0.05 }}
                        className="flex gap-4 p-3 rounded-lg bg-muted/30"
                      >
                        <div className={cn(
                          "flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold",
                          "bg-primary text-primary-foreground"
                        )}>
                          {step.step}
                        </div>
                        <p className="text-sm leading-relaxed pt-1">{step.instruction}</p>
                      </motion.div>
                    ))}
                  </motion.div>
                ) : (
                  <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="text-center py-8 text-muted-foreground"
                  >
                    <ChefHat className="h-12 w-12 mx-auto mb-3 opacity-30" />
                    <p className="text-sm">No cooking steps yet.</p>
                    <p className="text-xs">Search the web for real recipes or generate with AI.</p>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </div>
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
}
