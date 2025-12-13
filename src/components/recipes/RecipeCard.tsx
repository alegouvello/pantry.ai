import { ChefHat, Package, Clock, MoreHorizontal, Edit2, Trash2, DollarSign, TrendingUp, ImageIcon } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Recipe } from '@/types/inventory';

interface RecipeCardProps {
  recipe: Recipe;
  onEdit?: () => void;
  onDelete?: () => void;
}

const formatCurrency = (value: number) => {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 2,
  }).format(value);
};

export function RecipeCard({ recipe, onEdit, onDelete }: RecipeCardProps) {
  return (
    <Card variant="interactive" className="overflow-hidden group">
      {/* Recipe Image */}
      <div className="aspect-[16/9] relative bg-gradient-to-br from-primary/20 to-primary/5">
        {recipe.imageUrl ? (
          <img 
            src={recipe.imageUrl} 
            alt={recipe.name}
            className="w-full h-full object-cover"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <ImageIcon className="w-12 h-12 text-muted-foreground/30" />
          </div>
        )}
        {/* Overlay with actions */}
        <div className="absolute top-2 right-2">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="secondary"
                size="icon-sm"
                className="opacity-0 group-hover:opacity-100 transition-opacity bg-background/80 backdrop-blur-sm"
              >
                <MoreHorizontal className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={onEdit}>
                <Edit2 className="h-4 w-4 mr-2" />
                Edit Recipe
              </DropdownMenuItem>
              <DropdownMenuItem className="text-destructive" onClick={onDelete}>
                <Trash2 className="h-4 w-4 mr-2" />
                Delete
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      <div className="p-5">
        <div className="flex items-start justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-xl bg-gradient-primary flex items-center justify-center">
              <ChefHat className="h-5 w-5 text-primary-foreground" />
            </div>
            <div>
              <h3 className="font-semibold text-foreground">{recipe.name}</h3>
              <p className="text-xs text-muted-foreground">{recipe.category}</p>
            </div>
          </div>
        </div>

        <div className="space-y-3">
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Package className="h-4 w-4" />
            <span>{recipe.ingredients.length} ingredients</span>
          </div>
          
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Clock className="h-4 w-4" />
            <span>
              Yields {recipe.yield} {recipe.yieldUnit}
            </span>
          </div>

          {/* Cost Display */}
          {recipe.totalCost !== undefined && recipe.totalCost > 0 && (
            <div className="flex items-center gap-2 text-sm">
              <DollarSign className="h-4 w-4 text-primary" />
              <span className="text-foreground font-medium">
                {formatCurrency(recipe.totalCost)}
              </span>
              {recipe.costPerUnit !== undefined && recipe.yield > 1 && (
                <span className="text-muted-foreground">
                  ({formatCurrency(recipe.costPerUnit)}/{recipe.yieldUnit})
                </span>
              )}
            </div>
          )}

          {/* Food Cost Percentage */}
          {recipe.foodCostPercentage !== undefined && (
            <div className="flex items-center gap-2 text-sm">
              <TrendingUp className="h-4 w-4" />
              <span className="text-muted-foreground">Menu:</span>
              <span className="text-foreground font-medium">
                {formatCurrency(recipe.menuPrice || 0)}
              </span>
              <Badge 
                variant={recipe.foodCostPercentage <= 30 ? 'success' : recipe.foodCostPercentage <= 35 ? 'warning' : 'destructive'}
                className="text-xs ml-1"
              >
                {recipe.foodCostPercentage.toFixed(1)}% FC
              </Badge>
            </div>
          )}

          <div className="pt-3 border-t border-border">
            <p className="text-xs text-muted-foreground mb-2">Ingredients:</p>
            <div className="flex flex-wrap gap-1.5">
              {recipe.ingredients.slice(0, 4).map((ing) => (
                <Badge key={ing.ingredientId} variant="muted" className="text-xs">
                  {ing.ingredientName}
                </Badge>
              ))}
              {recipe.ingredients.length > 4 && (
                <Badge variant="secondary" className="text-xs">
                  +{recipe.ingredients.length - 4} more
                </Badge>
              )}
            </div>
          </div>
        </div>

        <div className="mt-4 pt-3 border-t border-border flex items-center justify-between">
          <Badge variant={recipe.isActive ? 'success' : 'muted'}>
            {recipe.isActive ? 'Active' : 'Inactive'}
          </Badge>
          {recipe.posItemId && (
            <span className="text-xs text-muted-foreground">
              POS: {recipe.posItemId}
            </span>
          )}
        </div>
      </div>
    </Card>
  );
}
