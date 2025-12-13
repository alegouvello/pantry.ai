import { Plus, Upload, Search, LogIn } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { RecipeCard } from '@/components/recipes/RecipeCard';
import { RecipeEditorDialog } from '@/components/recipes/RecipeEditorDialog';
import { NewRecipeDialog } from '@/components/recipes/NewRecipeDialog';
import { ImportRecipeDialog } from '@/components/recipes/ImportRecipeDialog';
import { Skeleton } from '@/components/ui/skeleton';
import { Card } from '@/components/ui/card';
import { useRecipes, useDeleteRecipe, RecipeWithIngredients } from '@/hooks/useRecipes';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';
import { Link } from 'react-router-dom';
import { useState } from 'react';

export default function Recipes() {
  const [searchQuery, setSearchQuery] = useState('');
  const [editingRecipe, setEditingRecipe] = useState<RecipeWithIngredients | null>(null);
  const [editorOpen, setEditorOpen] = useState(false);
  const [newRecipeOpen, setNewRecipeOpen] = useState(false);
  const [importOpen, setImportOpen] = useState(false);
  const { user, loading: authLoading } = useAuth();
  const { data: recipes, isLoading, error } = useRecipes();
  const deleteRecipe = useDeleteRecipe();
  const { toast } = useToast();

  if (!authLoading && !user) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] space-y-6">
        <div className="text-center space-y-2">
          <h1 className="text-2xl font-bold text-foreground">Sign in required</h1>
          <p className="text-muted-foreground">
            Please sign in to view and manage recipes.
          </p>
        </div>
        <Link to="/auth">
          <Button variant="accent" size="lg">
            <LogIn className="h-5 w-5 mr-2" />
            Sign In
          </Button>
        </Link>
      </div>
    );
  }

  const filteredRecipes = recipes?.filter(
    (recipe) =>
      recipe.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      recipe.category.toLowerCase().includes(searchQuery.toLowerCase())
  ) || [];

  const handleEdit = (recipe: RecipeWithIngredients) => {
    setEditingRecipe(recipe);
    setEditorOpen(true);
  };

  const handleDelete = async (id: string) => {
    try {
      await deleteRecipe.mutateAsync(id);
      toast({
        title: 'Recipe deleted',
        description: 'The recipe has been removed.',
      });
    } catch (error) {
      toast({
        title: 'Error deleting recipe',
        description: error instanceof Error ? error.message : 'Unknown error',
        variant: 'destructive',
      });
    }
  };

  // Map recipes to the format expected by RecipeCard with cost calculation
  const mapRecipeForCard = (recipe: RecipeWithIngredients) => {
    const ingredientsWithCost = recipe.recipe_ingredients?.map(ri => {
      const unitCost = ri.ingredients?.unit_cost || 0;
      const lineCost = ri.quantity * unitCost;
      return {
        ingredientId: ri.ingredient_id,
        ingredientName: ri.ingredients?.name || 'Unknown',
        quantity: ri.quantity,
        unit: ri.unit,
        unitCost,
        lineCost,
      };
    }) || [];

    const totalCost = ingredientsWithCost.reduce((sum, ing) => sum + (ing.lineCost || 0), 0);
    const costPerUnit = recipe.yield_amount > 0 ? totalCost / recipe.yield_amount : totalCost;
    const menuPrice = recipe.menu_price || undefined;
    const foodCostPercentage = menuPrice && menuPrice > 0 ? (totalCost / menuPrice) * 100 : undefined;

    return {
      id: recipe.id,
      name: recipe.name,
      category: recipe.category,
      posItemId: recipe.pos_item_id || undefined,
      yield: recipe.yield_amount,
      yieldUnit: recipe.yield_unit,
      ingredients: ingredientsWithCost,
      prepTime: recipe.prep_time_minutes || undefined,
      isActive: recipe.is_active ?? true,
      totalCost,
      costPerUnit,
      menuPrice,
      foodCostPercentage,
      imageUrl: recipe.image_url || undefined,
    };
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Recipes</h1>
          <p className="text-muted-foreground">
            Define recipes and ingredient mappings
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={() => setImportOpen(true)}>
            <Upload className="h-4 w-4 mr-2" />
            Import
          </Button>
          <Button variant="accent" onClick={() => setNewRecipeOpen(true)}>
            <Plus className="h-4 w-4 mr-2" />
            New Recipe
          </Button>
        </div>
      </div>

      {/* Search */}
      <div className="relative max-w-md">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Search recipes..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="pl-9 bg-muted/50 border-muted"
        />
      </div>

      {/* Content */}
      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {[...Array(6)].map((_, i) => (
            <Card key={i} variant="elevated" className="p-5">
              <Skeleton className="h-10 w-10 rounded-xl mb-4" />
              <Skeleton className="h-5 w-32 mb-2" />
              <Skeleton className="h-4 w-24 mb-4" />
              <Skeleton className="h-20 w-full" />
            </Card>
          ))}
        </div>
      ) : error ? (
        <Card variant="elevated" className="p-8 text-center">
          <p className="text-destructive">Error loading recipes: {error.message}</p>
        </Card>
      ) : filteredRecipes.length === 0 ? (
        <Card variant="elevated" className="p-8 text-center">
          <div className="space-y-4">
            <p className="text-muted-foreground">
              {searchQuery ? 'No recipes found matching your search.' : 'No recipes yet. Create your first recipe to get started!'}
            </p>
            {!searchQuery && (
              <Button variant="accent" onClick={() => setNewRecipeOpen(true)}>
                <Plus className="h-4 w-4 mr-2" />
                Create First Recipe
              </Button>
            )}
          </div>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredRecipes.map((recipe, index) => (
            <div
              key={recipe.id}
              className="animate-slide-up"
              style={{ animationDelay: `${index * 50}ms` }}
            >
              <RecipeCard
                recipe={mapRecipeForCard(recipe)}
                onEdit={() => handleEdit(recipe)}
                onDelete={() => handleDelete(recipe.id)}
              />
            </div>
          ))}
        </div>
      )}

      {/* Recipe Editor Dialog */}
      <RecipeEditorDialog
        recipe={editingRecipe}
        open={editorOpen}
        onOpenChange={setEditorOpen}
      />

      {/* New Recipe Dialog */}
      <NewRecipeDialog
        open={newRecipeOpen}
        onOpenChange={setNewRecipeOpen}
      />

      {/* Import Dialog */}
      <ImportRecipeDialog
        open={importOpen}
        onOpenChange={setImportOpen}
      />
    </div>
  );
}
