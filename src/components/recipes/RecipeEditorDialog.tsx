import { useState, useEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { Plus, Trash2, Save, X, Sparkles, RefreshCw, Loader2, ImageIcon, Upload } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
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
  const { t } = useTranslation();
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
  const [menuPrice, setMenuPrice] = useState<number | undefined>();
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [ingredients, setIngredients] = useState<EditableIngredient[]>([]);
  const [selectedIngredient, setSelectedIngredient] = useState('');
  const [newQuantity, setNewQuantity] = useState('1');
  const [newUnit, setNewUnit] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [isGeneratingImage, setIsGeneratingImage] = useState(false);
  const [isUploadingImage, setIsUploadingImage] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (recipe) {
      setName(recipe.name);
      setCategory(recipe.category);
      setYieldAmount(recipe.yield_amount);
      setYieldUnit(recipe.yield_unit);
      setMenuPrice(recipe.menu_price || undefined);
      setImageUrl(recipe.image_url || null);
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

  const handleGenerateImage = async () => {
    if (!recipe) return;
    
    setIsGeneratingImage(true);
    try {
      const { data, error } = await supabase.functions.invoke('generate-recipe-image', {
        body: {
          dishName: name,
          description: '',
          section: category,
          tags: [],
          recipeId: recipe.id,
        },
      });

      if (error) {
        throw new Error(error.message || 'Failed to generate image');
      }
      
      if (data?.success && data?.imageUrl) {
        setImageUrl(data.imageUrl);
        toast({
          title: t('recipeEditor.imageGenerated'),
          description: t('recipeEditor.imageCreated'),
        });
      } else {
        throw new Error(data?.error || 'Failed to generate image');
      }
    } catch (error) {
      console.error('Failed to generate image:', error);
      toast({
        title: t('recipeEditor.imageGenerationFailed'),
        description: error instanceof Error ? error.message : 'Unknown error',
        variant: 'destructive',
      });
    } finally {
      setIsGeneratingImage(false);
    }
  };

  const processFile = async (file: File) => {
    if (!recipe) return;

    // Validate file type
    if (!file.type.startsWith('image/')) {
      toast({
        title: t('recipeEditor.invalidFileType'),
        description: t('recipeEditor.pleaseUploadImage'),
        variant: 'destructive',
      });
      return;
    }

    // Validate file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      toast({
        title: t('recipeEditor.fileTooLarge'),
        description: t('recipeEditor.uploadUnder5MB'),
        variant: 'destructive',
      });
      return;
    }

    setIsUploadingImage(true);
    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `${recipe.id}-${Date.now()}.${fileExt}`;
      const filePath = `uploads/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from('recipe-images')
        .upload(filePath, file, { upsert: true });

      if (uploadError) throw uploadError;

      const { data: publicUrl } = supabase.storage
        .from('recipe-images')
        .getPublicUrl(filePath);

      setImageUrl(publicUrl.publicUrl);
      toast({
        title: t('recipeEditor.imageUploaded'),
        description: t('recipeEditor.imageUploadedDesc'),
      });
    } catch (error) {
      console.error('Failed to upload image:', error);
      toast({
        title: t('recipeEditor.uploadFailed'),
        description: error instanceof Error ? error.message : 'Failed to upload image',
        variant: 'destructive',
      });
    } finally {
      setIsUploadingImage(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const handleUploadImage = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      await processFile(file);
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  };

  const handleDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);

    const file = e.dataTransfer.files?.[0];
    if (file) {
      await processFile(file);
    }
  };

  const handleAddIngredient = () => {
    if (!selectedIngredient || !newQuantity || !newUnit) {
      toast({
        title: t('recipeEditor.missingFields'),
        description: t('recipeEditor.selectIngredientMsg'),
        variant: 'destructive',
      });
      return;
    }

    const ingredient = availableIngredients?.find((i) => i.id === selectedIngredient);
    if (!ingredient) return;

    // Check if ingredient already exists
    if (ingredients.some((i) => i.ingredient_id === selectedIngredient)) {
      toast({
        title: t('recipeEditor.duplicateIngredient'),
        description: t('recipeEditor.ingredientExists'),
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
        menu_price: menuPrice || null,
        image_url: imageUrl,
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
        title: t('recipeEditor.recipeUpdated'),
        description: t('recipeEditor.changesSaved'),
      });
      onOpenChange(false);
    } catch (error) {
      toast({
        title: t('recipeEditor.errorSaving'),
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
  const foodCostPercentage = menuPrice && menuPrice > 0 ? (totalCost / menuPrice) * 100 : undefined;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{t('recipeEditor.title')}</DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {/* Recipe Image */}
          <div className="space-y-3">
            <Label>{t('recipeEditor.recipeImage')}</Label>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              onChange={handleUploadImage}
              className="hidden"
            />
            <div 
              className={`aspect-video rounded-lg overflow-hidden flex items-center justify-center relative group transition-all ${
                isDragging 
                  ? 'bg-primary/20 border-2 border-dashed border-primary' 
                  : 'bg-gradient-to-br from-primary/20 to-primary/5'
              }`}
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}
            >
              {isDragging ? (
                <div className="flex flex-col items-center gap-2 text-primary">
                  <Upload className="w-10 h-10" />
                  <span className="text-sm font-medium">{t('recipeEditor.dropImage')}</span>
                </div>
              ) : isGeneratingImage || isUploadingImage ? (
                <div className="flex flex-col items-center gap-2 text-muted-foreground">
                  <Loader2 className="w-8 h-8 animate-spin text-primary" />
                  <span className="text-sm">{isGeneratingImage ? t('recipeEditor.generatingImage') : t('recipeEditor.uploadingImage')}</span>
                </div>
              ) : imageUrl ? (
                <>
                  <img 
                    src={imageUrl} 
                    alt={name}
                    className="w-full h-full object-cover"
                  />
                  <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                    <Button 
                      variant="secondary" 
                      size="sm" 
                      onClick={() => fileInputRef.current?.click()}
                      disabled={isUploadingImage}
                    >
                      <Upload className="w-4 h-4 mr-2" />
                      {t('recipeEditor.uploadNew')}
                    </Button>
                    <Button 
                      variant="secondary" 
                      size="sm" 
                      onClick={handleGenerateImage}
                      disabled={isGeneratingImage}
                    >
                      <RefreshCw className="w-4 h-4 mr-2" />
                      {t('recipeEditor.regenerate')}
                    </Button>
                    <Button 
                      variant="destructive" 
                      size="sm" 
                      onClick={() => setImageUrl(null)}
                    >
                      <Trash2 className="w-4 h-4 mr-2" />
                      {t('recipeEditor.remove')}
                    </Button>
                  </div>
                </>
              ) : (
                <div className="flex flex-col items-center gap-3 text-muted-foreground">
                  <ImageIcon className="w-10 h-10" />
                  <p className="text-sm">{t('recipeEditor.dragOrUpload')}</p>
                  <div className="flex gap-2">
                    <Button 
                      variant="outline" 
                      size="sm" 
                      onClick={() => fileInputRef.current?.click()}
                      disabled={isUploadingImage}
                    >
                      <Upload className="w-4 h-4 mr-2" />
                      {t('recipeEditor.uploadImage')}
                    </Button>
                    <Button 
                      variant="outline" 
                      size="sm" 
                      onClick={handleGenerateImage}
                      disabled={isGeneratingImage}
                    >
                      <Sparkles className="w-4 h-4 mr-2" />
                      {t('recipeEditor.generateAI')}
                    </Button>
                  </div>
                </div>
              )}
            </div>
          </div>
          {/* Recipe Details */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="name">{t('recipeEditor.recipeName')}</Label>
              <Input
                id="name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder={t('recipeEditor.recipeName')}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="category">{t('recipeEditor.category')}</Label>
              <Input
                id="category"
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                placeholder={t('recipeEditor.category')}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="yield">{t('recipeEditor.yieldAmount')}</Label>
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
              <Label htmlFor="yieldUnit">{t('recipeEditor.yieldUnit')}</Label>
              <Input
                id="yieldUnit"
                value={yieldUnit}
                onChange={(e) => setYieldUnit(e.target.value)}
                placeholder="portion, serving, etc."
              />
            </div>
            <div className="space-y-2 col-span-2">
              <Label htmlFor="menuPrice">{t('recipeEditor.menuPrice')}</Label>
              <div className="flex items-center gap-4">
                <Input
                  id="menuPrice"
                  type="number"
                  min="0"
                  step="0.01"
                  value={menuPrice || ''}
                  onChange={(e) => setMenuPrice(e.target.value ? parseFloat(e.target.value) : undefined)}
                  placeholder={t('recipeEditor.menuPrice')}
                  className="flex-1"
                />
                {foodCostPercentage !== undefined && (
                  <div className="flex items-center gap-2">
                    <span className="text-sm text-muted-foreground">{t('recipeEditor.foodCost')}</span>
                    <Badge 
                      variant={foodCostPercentage <= 30 ? 'success' : foodCostPercentage <= 35 ? 'warning' : 'destructive'}
                    >
                      {foodCostPercentage.toFixed(1)}%
                    </Badge>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Current Ingredients */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <Label>{t('recipeEditor.ingredients')}</Label>
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
                        placeholder={t('recipeEditor.unit')}
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
            <Label>{t('recipeEditor.addIngredient')}</Label>
            <div className="flex items-end gap-3">
              <div className="flex-1">
                <Select value={selectedIngredient} onValueChange={setSelectedIngredient}>
                  <SelectTrigger>
                    <SelectValue placeholder={t('recipeEditor.selectIngredient')} />
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
                  placeholder={t('recipeEditor.qty')}
                />
              </div>
              <div className="w-24">
                <Input
                  value={newUnit}
                  onChange={(e) => setNewUnit(e.target.value)}
                  placeholder={t('recipeEditor.unit')}
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
              {isSaving ? t('recipeEditor.saving') : t('recipeEditor.save')}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
