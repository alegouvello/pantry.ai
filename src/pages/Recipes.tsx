import { motion } from 'framer-motion';
import { Plus, Upload, Search, LogIn, ChefHat, LayoutGrid, Grid3X3 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { RecipeCard } from '@/components/recipes/RecipeCard';
import { RecipeEditorDialog } from '@/components/recipes/RecipeEditorDialog';
import { RecipeDetailDialog } from '@/components/recipes/RecipeDetailDialog';
import { NewRecipeDialog } from '@/components/recipes/NewRecipeDialog';
import { ImportRecipeDialog } from '@/components/recipes/ImportRecipeDialog';
import { MenuEngineeringMatrix } from '@/components/recipes/MenuEngineeringMatrix';
import { Skeleton } from '@/components/ui/skeleton';
import { Card } from '@/components/ui/card';
import { StaggeredGrid, StaggeredItem } from '@/components/ui/staggered-grid';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useRecipes, useDeleteRecipe, RecipeWithIngredients } from '@/hooks/useRecipes';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';
import { Link } from 'react-router-dom';
import { useState } from 'react';
import heroImage from '@/assets/pages/hero-recipes.jpg';

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.1, delayChildren: 0.2 },
  },
};

const itemVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.5, ease: [0.4, 0, 0.2, 1] as const },
  },
};

export default function Recipes() {
  const [searchQuery, setSearchQuery] = useState('');
  const [viewMode, setViewMode] = useState<'grid' | 'matrix'>('grid');
  const [editingRecipe, setEditingRecipe] = useState<RecipeWithIngredients | null>(null);
  const [viewingRecipe, setViewingRecipe] = useState<RecipeWithIngredients | null>(null);
  const [editorOpen, setEditorOpen] = useState(false);
  const [detailOpen, setDetailOpen] = useState(false);
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
          <ChefHat className="h-16 w-16 text-primary mx-auto mb-4" />
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

  const handleViewDetail = (recipe: RecipeWithIngredients) => {
    setViewingRecipe(recipe);
    setDetailOpen(true);
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
    <motion.div 
      className="space-y-8"
      variants={containerVariants}
      initial="hidden"
      animate="visible"
    >
      {/* Hero Section */}
      <motion.div 
        variants={itemVariants}
        className="relative h-48 md:h-56 rounded-2xl overflow-hidden"
      >
        <img 
          src={heroImage} 
          alt="Recipes" 
          className="absolute inset-0 w-full h-full object-cover"
        />
        <div className="absolute inset-0 bg-gradient-to-r from-background/90 via-background/70 to-transparent" />
        <div className="absolute inset-0 flex items-center px-8 md:px-12">
          <div className="space-y-3">
            <h1 className="text-3xl md:text-4xl font-bold text-foreground tracking-tight">
              Recipes
            </h1>
            <p className="text-muted-foreground max-w-md">
              Define your dishes and track ingredient costs.
            </p>
            <div className="flex gap-3 pt-2">
              <Button variant="accent" size="sm" onClick={() => setNewRecipeOpen(true)}>
                <Plus className="h-4 w-4 mr-2" />
                New Recipe
              </Button>
              <Button variant="outline" size="sm" className="bg-background/50 backdrop-blur-sm" onClick={() => setImportOpen(true)}>
                <Upload className="h-4 w-4 mr-2" />
                Import
              </Button>
            </div>
          </div>
        </div>
      </motion.div>

      {/* Search and View Toggle */}
      <motion.div variants={itemVariants} className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
        <div className="relative max-w-md w-full sm:w-auto">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search recipes..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9"
          />
        </div>
        <Tabs value={viewMode} onValueChange={(v) => setViewMode(v as 'grid' | 'matrix')}>
          <TabsList>
            <TabsTrigger value="grid" className="gap-2">
              <LayoutGrid className="h-4 w-4" />
              <span className="hidden sm:inline">Grid</span>
            </TabsTrigger>
            <TabsTrigger value="matrix" className="gap-2">
              <Grid3X3 className="h-4 w-4" />
              <span className="hidden sm:inline">Matrix</span>
            </TabsTrigger>
          </TabsList>
        </Tabs>
      </motion.div>

      {/* Content */}
      <motion.div variants={itemVariants}>
        {isLoading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {[...Array(6)].map((_, i) => (
              <Card key={i} className="p-5">
                <Skeleton className="h-32 w-full rounded-lg mb-4" />
                <Skeleton className="h-5 w-32 mb-2" />
                <Skeleton className="h-4 w-24" />
              </Card>
            ))}
          </div>
        ) : error ? (
          <Card className="p-8 text-center">
            <p className="text-destructive">Error loading recipes: {error.message}</p>
          </Card>
        ) : filteredRecipes.length === 0 ? (
          <Card className="p-12 text-center">
            <ChefHat className="h-12 w-12 mx-auto mb-4 text-muted-foreground/50" />
            <p className="text-muted-foreground mb-4">
              {searchQuery ? 'No recipes found matching your search.' : 'No recipes yet. Create your first recipe to get started!'}
            </p>
            {!searchQuery && (
              <Button variant="accent" onClick={() => setNewRecipeOpen(true)}>
                <Plus className="h-4 w-4 mr-2" />
                Create First Recipe
              </Button>
            )}
          </Card>
        ) : viewMode === 'matrix' ? (
          <MenuEngineeringMatrix 
            recipes={filteredRecipes} 
            onRecipeClick={handleViewDetail}
          />
        ) : (
          <StaggeredGrid className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredRecipes.map((recipe) => (
              <StaggeredItem key={recipe.id}>
                <RecipeCard
                  recipe={mapRecipeForCard(recipe)}
                  onClick={() => handleViewDetail(recipe)}
                  onEdit={() => handleEdit(recipe)}
                  onDelete={() => handleDelete(recipe.id)}
                />
              </StaggeredItem>
            ))}
          </StaggeredGrid>
        )}
      </motion.div>

      <RecipeDetailDialog
        recipe={viewingRecipe}
        open={detailOpen}
        onOpenChange={setDetailOpen}
      />
      <RecipeEditorDialog
        recipe={editingRecipe}
        open={editorOpen}
        onOpenChange={setEditorOpen}
      />
      <NewRecipeDialog
        open={newRecipeOpen}
        onOpenChange={setNewRecipeOpen}
      />
      <ImportRecipeDialog
        open={importOpen}
        onOpenChange={setImportOpen}
      />
    </motion.div>
  );
}
