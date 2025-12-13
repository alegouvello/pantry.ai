import { ChefHat, Package, Clock, MoreHorizontal, Edit2, Trash2 } from 'lucide-react';
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

export function RecipeCard({ recipe, onEdit, onDelete }: RecipeCardProps) {
  return (
    <Card variant="interactive" className="p-5 group">
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
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="ghost"
              size="icon-sm"
              className="opacity-0 group-hover:opacity-100 transition-opacity"
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
    </Card>
  );
}
