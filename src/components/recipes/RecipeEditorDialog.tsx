import { useState, useEffect } from 'react';
import { Plus, Trash2, Save, X } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { useIngredients } from '@/hooks/useIngredients';
import { useUpdateRecipe, RecipeWithIngredients } from '@/hooks/useRecipes';
import {
  useAddRecipeIngredient,
  useUpdateRecipeIngredient,
  useRemoveRecipeIngredient,
} from '@/hooks/useRecipeIngredients';

interface RecipeEditorDialogProps {
  recipe: RecipeWithIngredients | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

interface EditableIngredient {
  id: string;
  ingredient_id: string;
  ingredientName: string;
  quantity: number;
  unit: string;
  unitCost: number;
  isNew?: boolean;
}

const formatCurrency = (value: number) => {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 2,
  }).format(value);
};

export function RecipeEditorDialog({ recipe, open, onOpenChange }: RecipeEditorDialogProps) {
  const { toast } = useToast();
  const { data: availableIngredients } = useIngredients();
  const updateRecipe = useUpdateRecipe();
  const addRecipeIngredient = useAddRecipeIngredient();
  const updateRecipeIngredient = useUpdateRecipeIngredient();
  const removeRecipeIngredient = useRemoveRecipeIngredient();

  const [name, setName] = useState('');
  const [category, setCategory] = useState('');
  const [yieldAmount, setYieldAmount] = useState(1);
  const [yieldUnit, setYieldUnit] = useState('portion');
  const [ingredients, setIngredients] = useState<EditableIngredient[]>([]);
  const [selectedIngredient, setSelectedIngredient] = useState('');
  const [newQuantity, setNewQuantity] = useState('1');
  const [newUnit, setNewUnit] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (recipe) {
      setName(recipe.name);
      setCategory(recipe.category);
      setYieldAmount(recipe.yield_amount);
      setYieldUnit(recipe.yield_unit);
      setIngredients(
        recipe.recipe_ingredients?.map((ri) => ({
          id: ri.id,
          ingredient_id: ri.ingredient_id,
          ingredientName: ri.ingredients?.name || 'Unknown',
          quantity: ri.quantity,
          unit: ri.unit,
          unitCost: ri.ingredients?.unit_cost || 0,
        })) || []
      );
    }
  }, [recipe]);

  const handleAddIngredient = () => {
    if (!selectedIngredient || !newQuantity || !newUnit) {
      toast({
        title: 'Missing fields',
        description: 'Please select an ingredient and enter quantity and unit.',
        variant: 'destructive',
      });
      return;
    }

    const ingredient = availableIngredients?.find((i) => i.id === selectedIngredient);
    if (!ingredient) return;

    // Check if ingredient already exists
    if (ingredients.some((i) => i.ingredient_id === selectedIngredient)) {
      toast({
        title: 'Duplicate ingredient',
        description: 'This ingredient is already in the recipe.',
        variant: 'destructive',
      });
      return;
    }

    const newIngredient: EditableIngredient = {
      id: `temp-${Date.now()}`,
      ingredient_id: selectedIngredient,
      ingredientName: ingredient.name,
      quantity: parseFloat(newQuantity),
      unit: newUnit,
      unitCost: ingredient.unit_cost,
      isNew: true,
    };

    setIngredients([...ingredients, newIngredient]);
    setSelectedIngredient('');
    setNewQuantity('1');
    setNewUnit('');
  };

  const handleUpdateQuantity = (id: string, quantity: number) => {
    setIngredients(
      ingredients.map((i) => (i.id === id ? { ...i, quantity } : i))
    );
  };

  const handleUpdateUnit = (id: string, unit: string) => {
    setIngredients(
      ingredients.map((i) => (i.id === id ? { ...i, unit } : i))
    );
  };

  const handleRemoveIngredient = (id: string) => {
    setIngredients(ingredients.filter((i) => i.id !== id));
  };

  const handleSave = async () => {
    if (!recipe) return;

    setIsSaving(true);
    try {
      // Update recipe details
      await updateRecipe.mutateAsync({
        id: recipe.id,
        name,
        category,
        yield_amount: yieldAmount,
        yield_unit: yieldUnit,
      });

      // Get original ingredient IDs
      const originalIds = new Set(
        recipe.recipe_ingredients?.map((ri) => ri.id) || []
      );
      const currentIds = new Set(
        ingredients.filter((i) => !i.isNew).map((i) => i.id)
      );

      // Remove deleted ingredients
      const deletedIds = [...originalIds].filter((id) => !currentIds.has(id));
      for (const id of deletedIds) {
        await removeRecipeIngredient.mutateAsync(id);
      }

      // Add new ingredients
      const newIngredients = ingredients.filter((i) => i.isNew);
      for (const ing of newIngredients) {
        await addRecipeIngredient.mutateAsync({
          recipe_id: recipe.id,
          ingredient_id: ing.ingredient_id,
          quantity: ing.quantity,
          unit: ing.unit,
        });
      }

      // Update existing ingredients
      const existingIngredients = ingredients.filter(
        (i) => !i.isNew && originalIds.has(i.id)
      );
      for (const ing of existingIngredients) {
        const original = recipe.recipe_ingredients?.find((ri) => ri.id === ing.id);
        if (original && (original.quantity !== ing.quantity || original.unit !== ing.unit)) {
          await updateRecipeIngredient.mutateAsync({
            id: ing.id,
            quantity: ing.quantity,
            unit: ing.unit,
          });
        }
      }

      toast({
        title: 'Recipe updated',
        description: 'Your changes have been saved.',
      });
      onOpenChange(false);
    } catch (error) {
      toast({
        title: 'Error saving recipe',
        description: error instanceof Error ? error.message : 'Unknown error',
        variant: 'destructive',
      });
    } finally {
      setIsSaving(false);
    }
  };

  const unusedIngredients = availableIngredients?.filter(
    (i) => !ingredients.some((ri) => ri.ingredient_id === i.id)
  );

  // Calculate total cost
  const totalCost = ingredients.reduce((sum, ing) => sum + (ing.quantity * ing.unitCost), 0);
  const costPerUnit = yieldAmount > 0 ? totalCost / yieldAmount : totalCost;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Edit Recipe</DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {/* Recipe Details */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="name">Recipe Name</Label>
              <Input
                id="name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Recipe name"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="category">Category</Label>
              <Input
                id="category"
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                placeholder="Category"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="yield">Yield Amount</Label>
              <Input
                id="yield"
                type="number"
                min="0.1"
                step="0.1"
                value={yieldAmount}
                onChange={(e) => setYieldAmount(parseFloat(e.target.value) || 1)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="yieldUnit">Yield Unit</Label>
              <Input
                id="yieldUnit"
                value={yieldUnit}
                onChange={(e) => setYieldUnit(e.target.value)}
                placeholder="portion, serving, etc."
              />
            </div>
          </div>

          {/* Current Ingredients */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <Label>Ingredients</Label>
              {ingredients.length > 0 && (
                <div className="text-sm">
                  <span className="text-muted-foreground">Total: </span>
                  <span className="font-semibold text-primary">{formatCurrency(totalCost)}</span>
                  {yieldAmount > 1 && (
                    <span className="text-muted-foreground ml-2">
                      ({formatCurrency(costPerUnit)}/{yieldUnit})
                    </span>
                  )}
                </div>
              )}
            </div>
            {ingredients.length === 0 ? (
              <p className="text-sm text-muted-foreground py-4 text-center border border-dashed rounded-lg">
                No ingredients added yet
              </p>
            ) : (
              <div className="space-y-2">
                {ingredients.map((ing) => {
                  const lineCost = ing.quantity * ing.unitCost;
                  return (
                    <div
                      key={ing.id}
                      className="flex items-center gap-3 p-3 rounded-lg bg-muted/50 border border-border"
                    >
                      <div className="flex-1 flex items-center gap-2">
                        <Badge variant="outline">{ing.ingredientName}</Badge>
                        {ing.isNew && (
                          <Badge variant="success" className="text-xs">New</Badge>
                        )}
                      </div>
                      <Input
                        type="number"
                        min="0.01"
                        step="0.01"
                        value={ing.quantity}
                        onChange={(e) =>
                          handleUpdateQuantity(ing.id, parseFloat(e.target.value) || 0)
                        }
                        className="w-24"
                      />
                      <Input
                        value={ing.unit}
                        onChange={(e) => handleUpdateUnit(ing.id, e.target.value)}
                        className="w-24"
                        placeholder="unit"
                      />
                      <span className="text-sm text-muted-foreground w-20 text-right">
                        {formatCurrency(lineCost)}
                      </span>
                      <Button
                        variant="ghost"
                        size="icon-sm"
                        onClick={() => handleRemoveIngredient(ing.id)}
                        className="text-destructive hover:text-destructive"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Add New Ingredient */}
          <div className="space-y-3 pt-4 border-t border-border">
            <Label>Add Ingredient</Label>
            <div className="flex items-end gap-3">
              <div className="flex-1">
                <Select value={selectedIngredient} onValueChange={setSelectedIngredient}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select ingredient" />
                  </SelectTrigger>
                  <SelectContent>
                    {unusedIngredients?.map((ing) => (
                      <SelectItem key={ing.id} value={ing.id}>
                        {ing.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="w-24">
                <Input
                  type="number"
                  min="0.01"
                  step="0.01"
                  value={newQuantity}
                  onChange={(e) => setNewQuantity(e.target.value)}
                  placeholder="Qty"
                />
              </div>
              <div className="w-24">
                <Input
                  value={newUnit}
                  onChange={(e) => setNewUnit(e.target.value)}
                  placeholder="Unit"
                />
              </div>
              <Button variant="outline" onClick={handleAddIngredient}>
                <Plus className="h-4 w-4" />
              </Button>
            </div>
          </div>

          {/* Actions */}
          <div className="flex justify-end gap-3 pt-4 border-t border-border">
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              <X className="h-4 w-4 mr-2" />
              Cancel
            </Button>
            <Button variant="accent" onClick={handleSave} disabled={isSaving}>
              <Save className="h-4 w-4 mr-2" />
              {isSaving ? 'Saving...' : 'Save Changes'}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
