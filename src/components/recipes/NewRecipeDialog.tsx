import { useState } from 'react';
import { useTranslation } from 'react-i18next';
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
import { useCreateRecipe } from '@/hooks/useRecipes';
import { useAddRecipeIngredient } from '@/hooks/useRecipeIngredients';

interface NewRecipeDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

interface NewIngredient {
  id: string;
  ingredient_id: string;
  ingredientName: string;
  quantity: number;
  unit: string;
  unitCost: number;
}

const CATEGORIES = [
  'Main Course',
  'Appetizer',
  'Dessert',
  'Beverage',
  'Side Dish',
  'Sauce',
  'Soup',
  'Salad',
  'Breakfast',
  'Other',
];

const formatCurrency = (value: number) => {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 2,
  }).format(value);
};

export function NewRecipeDialog({ open, onOpenChange }: NewRecipeDialogProps) {
  const { t } = useTranslation();
  const { toast } = useToast();
  const { data: availableIngredients } = useIngredients();
  const createRecipe = useCreateRecipe();
  const addRecipeIngredient = useAddRecipeIngredient();

  const [name, setName] = useState('');
  const [category, setCategory] = useState('');
  const [yieldAmount, setYieldAmount] = useState(1);
  const [yieldUnit, setYieldUnit] = useState('portion');
  const [prepTime, setPrepTime] = useState<number | undefined>();
  const [posItemId, setPosItemId] = useState('');
  const [menuPrice, setMenuPrice] = useState<number | undefined>();
  const [ingredients, setIngredients] = useState<NewIngredient[]>([]);
  const [selectedIngredient, setSelectedIngredient] = useState('');
  const [newQuantity, setNewQuantity] = useState('1');
  const [newUnit, setNewUnit] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  const resetForm = () => {
    setName('');
    setCategory('');
    setYieldAmount(1);
    setYieldUnit('portion');
    setPrepTime(undefined);
    setPosItemId('');
    setMenuPrice(undefined);
    setIngredients([]);
    setSelectedIngredient('');
    setNewQuantity('1');
    setNewUnit('');
  };

  const handleAddIngredient = () => {
    if (!selectedIngredient || !newQuantity || !newUnit) {
      toast({
        title: t('recipeDialog.missingFields'),
        description: t('recipeDialog.selectIngredientMsg'),
        variant: 'destructive',
      });
      return;
    }

    const ingredient = availableIngredients?.find((i) => i.id === selectedIngredient);
    if (!ingredient) return;

    if (ingredients.some((i) => i.ingredient_id === selectedIngredient)) {
      toast({
        title: t('recipeDialog.duplicateIngredient'),
        description: t('recipeDialog.ingredientExists'),
        variant: 'destructive',
      });
      return;
    }

    const newIngredient: NewIngredient = {
      id: `temp-${Date.now()}`,
      ingredient_id: selectedIngredient,
      ingredientName: ingredient.name,
      quantity: parseFloat(newQuantity),
      unit: newUnit,
      unitCost: ingredient.unit_cost,
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
    if (!name.trim()) {
      toast({
        title: t('recipeDialog.nameRequired'),
        description: t('recipeDialog.enterRecipeName'),
        variant: 'destructive',
      });
      return;
    }

    if (!category) {
      toast({
        title: t('recipeDialog.categoryRequired'),
        description: t('recipeDialog.selectCategoryMsg'),
        variant: 'destructive',
      });
      return;
    }

    setIsSaving(true);
    try {
      const newRecipe = await createRecipe.mutateAsync({
        name: name.trim(),
        category,
        yield_amount: yieldAmount,
        yield_unit: yieldUnit,
        prep_time_minutes: prepTime || null,
        pos_item_id: posItemId.trim() || null,
        menu_price: menuPrice || null,
      });

      for (const ing of ingredients) {
        await addRecipeIngredient.mutateAsync({
          recipe_id: newRecipe.id,
          ingredient_id: ing.ingredient_id,
          quantity: ing.quantity,
          unit: ing.unit,
        });
      }

      toast({
        title: t('recipeDialog.recipeCreated'),
        description: t('recipeDialog.recipeAdded', { name }),
      });
      resetForm();
      onOpenChange(false);
    } catch (error) {
      toast({
        title: t('recipeDialog.errorCreating'),
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

  const totalCost = ingredients.reduce((sum, ing) => sum + (ing.quantity * ing.unitCost), 0);
  const costPerUnit = yieldAmount > 0 ? totalCost / yieldAmount : totalCost;
  const foodCostPercentage = menuPrice && menuPrice > 0 ? (totalCost / menuPrice) * 100 : undefined;

  return (
    <Dialog open={open} onOpenChange={(isOpen) => {
      if (!isOpen) resetForm();
      onOpenChange(isOpen);
    }}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{t('recipeDialog.createNew')}</DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {/* Recipe Details */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2 col-span-2">
              <Label htmlFor="name">{t('recipeDialog.recipeName')} *</Label>
              <Input
                id="name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder={t('recipeDialog.enterName')}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="category">{t('recipeDialog.category')} *</Label>
              <Select value={category} onValueChange={setCategory}>
                <SelectTrigger>
                  <SelectValue placeholder={t('recipeDialog.selectCategory')} />
                </SelectTrigger>
                <SelectContent>
                  {CATEGORIES.map((cat) => (
                    <SelectItem key={cat} value={cat}>
                      {cat}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="prepTime">{t('recipeDialog.prepTime')}</Label>
              <Input
                id="prepTime"
                type="number"
                min="1"
                value={prepTime || ''}
                onChange={(e) => setPrepTime(e.target.value ? parseInt(e.target.value) : undefined)}
                placeholder={t('common.optional')}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="yield">{t('recipeDialog.yieldAmount')}</Label>
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
              <Label htmlFor="yieldUnit">{t('recipeDialog.yieldUnit')}</Label>
              <Input
                id="yieldUnit"
                value={yieldUnit}
                onChange={(e) => setYieldUnit(e.target.value)}
                placeholder="portion, serving, etc."
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="posItemId">{t('recipeDialog.posItemId')}</Label>
              <Input
                id="posItemId"
                value={posItemId}
                onChange={(e) => setPosItemId(e.target.value)}
                placeholder={t('recipeDialog.linkToPOS')}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="menuPrice">{t('recipeDialog.menuPrice')}</Label>
              <div className="flex items-center gap-4">
                <Input
                  id="menuPrice"
                  type="number"
                  min="0"
                  step="0.01"
                  value={menuPrice || ''}
                  onChange={(e) => setMenuPrice(e.target.value ? parseFloat(e.target.value) : undefined)}
                  placeholder={t('recipeDialog.sellingPrice')}
                />
                {foodCostPercentage !== undefined && (
                  <Badge 
                    variant={foodCostPercentage <= 30 ? 'success' : foodCostPercentage <= 35 ? 'warning' : 'destructive'}
                  >
                    {foodCostPercentage.toFixed(1)}% FC
                  </Badge>
                )}
              </div>
            </div>
          </div>

          {/* Current Ingredients */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <Label>{t('recipeDialog.ingredients')} ({ingredients.length})</Label>
              {ingredients.length > 0 && (
                <div className="text-sm">
                  <span className="text-muted-foreground">{t('common.total')}: </span>
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
                {t('recipeDialog.noIngredients')}
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
                      <div className="flex-1">
                        <Badge variant="outline">{ing.ingredientName}</Badge>
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
                        placeholder={t('recipeDialog.unit')}
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
            <Label>{t('recipeDialog.addIngredient')}</Label>
            <div className="flex items-end gap-3">
              <div className="flex-1">
                <Select value={selectedIngredient} onValueChange={setSelectedIngredient}>
                  <SelectTrigger>
                    <SelectValue placeholder={t('recipeDialog.selectIngredient')} />
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
                  placeholder={t('recipeDialog.qty')}
                />
              </div>
              <div className="w-24">
                <Input
                  value={newUnit}
                  onChange={(e) => setNewUnit(e.target.value)}
                  placeholder={t('recipeDialog.unit')}
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
              {t('common.cancel')}
            </Button>
            <Button variant="accent" onClick={handleSave} disabled={isSaving}>
              <Save className="h-4 w-4 mr-2" />
              {isSaving ? t('common.creating') : t('recipeDialog.createRecipe')}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
