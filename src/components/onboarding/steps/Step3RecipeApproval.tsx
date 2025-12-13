import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { OnboardingLayout } from '../OnboardingLayout';
import { AIConfidenceCard } from '../AIConfidenceCard';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Check, Clock, Trash2, Plus, ArrowRight, ArrowLeft, Sparkles, AlertCircle, Loader2, ImageIcon, RefreshCw } from 'lucide-react';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { useOnboardingContext, ParsedDish } from '@/contexts/OnboardingContext';
import { useSaveOnboardingRecipe } from '@/hooks/useSaveOnboardingRecipe';
import { useToast } from '@/hooks/use-toast';

const cardVariants = {
  hidden: { opacity: 0, y: 20, scale: 0.98 },
  visible: { 
    opacity: 1, 
    y: 0, 
    scale: 1,
    transition: { duration: 0.4, ease: "easeOut" as const }
  },
  exit: { 
    opacity: 0, 
    y: -20, 
    scale: 0.98,
    transition: { duration: 0.3 }
  }
};

interface StepProps {
  currentStep: number;
  completedSteps: number[];
  setupHealthScore: number;
  orgId: string | null;
  restaurantId?: string | null;
  onNext: () => void;
  onBack?: () => void;
  onSave: () => void;
  updateHealthScore: (delta: number) => void;
}

interface ApprovedRecipeData {
  dish: ParsedDish;
  ingredients: ParsedDish['ingredients'];
}

export function Step3RecipeApproval(props: StepProps) {
  const { toast } = useToast();
  const { conceptType, parsedDishes } = useOnboardingContext();
  const saveRecipe = useSaveOnboardingRecipe();
  
  const [phase, setPhase] = useState<'settings' | 'approval'>('settings');
  const [detailLevel, setDetailLevel] = useState('standard');
  const [assumePortions, setAssumePortions] = useState(true);
  const [currentRecipeIndex, setCurrentRecipeIndex] = useState(0);
  const [isSaving, setIsSaving] = useState(false);
  const [generatingImageFor, setGeneratingImageFor] = useState<string | null>(null);
  
  const layoutProps = { ...props, conceptType };
  const [approvedRecipes, setApprovedRecipes] = useState<string[]>([]);
  const [approvedRecipeData, setApprovedRecipeData] = useState<ApprovedRecipeData[]>([]);
  const [needsLaterRecipes, setNeedsLaterRecipes] = useState<string[]>([]);
  const [editingIngredients, setEditingIngredients] = useState<ParsedDish['ingredients']>([]);
  const [recipes, setRecipes] = useState<ParsedDish[]>([]);

  // Track ingredients per recipe for saving
  const recipeIngredientsRef = useRef<Record<string, ParsedDish['ingredients']>>({});

  // Use parsed dishes from context or empty array
  useEffect(() => {
    if (parsedDishes.length > 0) {
      setRecipes(parsedDishes);
      setPhase('approval');
      setEditingIngredients(parsedDishes[0]?.ingredients || []);
      // Initialize ingredients tracking
      parsedDishes.forEach(dish => {
        recipeIngredientsRef.current[dish.id] = dish.ingredients;
      });
    }
  }, [parsedDishes]);

  const currentRecipe = recipes[currentRecipeIndex];
  const totalRecipes = recipes.length;

  // Generate image for current recipe
  const generateImageForRecipe = async (recipeId: string, forceRegenerate = false) => {
    const recipe = recipes.find(r => r.id === recipeId);
    if (!recipe || (recipe.imageUrl && !forceRegenerate)) return;

    setGeneratingImageFor(recipeId);
    try {
      const response = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/generate-recipe-image`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          dishName: recipe.name,
          description: recipe.description,
          section: recipe.section,
          tags: recipe.tags,
        }),
      });

      if (response.ok) {
        const data = await response.json();
        if (data.success && data.imageUrl) {
          setRecipes(prev => prev.map(r => 
            r.id === recipeId ? { ...r, imageUrl: data.imageUrl } : r
          ));
        }
      }
    } catch (error) {
      console.error('Failed to generate image:', error);
    } finally {
      setGeneratingImageFor(null);
    }
  };

  // Auto-generate image when viewing a recipe
  useEffect(() => {
    if (phase === 'approval' && currentRecipe && !currentRecipe.imageUrl && generatingImageFor !== currentRecipe.id) {
      generateImageForRecipe(currentRecipe.id);
    }
  }, [currentRecipeIndex, phase, currentRecipe?.id]);

  const handleGenerateRecipes = () => {
    if (recipes.length > 0) {
      setPhase('approval');
      setEditingIngredients(recipes[0]?.ingredients || []);
    } else {
      props.onBack?.();
    }
  };

  const handleApprove = async () => {
    if (!currentRecipe) return;
    
    // Save current editing state
    recipeIngredientsRef.current[currentRecipe.id] = editingIngredients;
    
    // Track approved recipe with its ingredients
    const recipeData: ApprovedRecipeData = {
      dish: currentRecipe,
      ingredients: editingIngredients,
    };
    
    setApprovedRecipes([...approvedRecipes, currentRecipe.id]);
    setApprovedRecipeData([...approvedRecipeData, recipeData]);
    props.updateHealthScore(5);
    moveToNextRecipe();
  };

  const handleNeedsLater = () => {
    if (!currentRecipe) return;
    // Save current editing state
    recipeIngredientsRef.current[currentRecipe.id] = editingIngredients;
    setNeedsLaterRecipes([...needsLaterRecipes, currentRecipe.id]);
    moveToNextRecipe();
  };

  const moveToNextRecipe = () => {
    if (currentRecipeIndex < totalRecipes - 1) {
      const nextIndex = currentRecipeIndex + 1;
      setCurrentRecipeIndex(nextIndex);
      // Restore ingredients for next recipe
      const nextRecipe = recipes[nextIndex];
      setEditingIngredients(recipeIngredientsRef.current[nextRecipe.id] || nextRecipe.ingredients);
    }
  };

  const moveToPrevRecipe = () => {
    if (currentRecipeIndex > 0) {
      // Save current editing state before moving
      if (currentRecipe) {
        recipeIngredientsRef.current[currentRecipe.id] = editingIngredients;
      }
      const prevIndex = currentRecipeIndex - 1;
      setCurrentRecipeIndex(prevIndex);
      const prevRecipe = recipes[prevIndex];
      setEditingIngredients(recipeIngredientsRef.current[prevRecipe.id] || prevRecipe.ingredients);
    }
  };

  const updateIngredient = (ingredientId: string, field: string, value: any) => {
    setEditingIngredients(prev =>
      prev.map(ing => ing.id === ingredientId ? { ...ing, [field]: value } : ing)
    );
  };

  const removeIngredient = (ingredientId: string) => {
    setEditingIngredients(prev => prev.filter(ing => ing.id !== ingredientId));
  };

  const addIngredient = () => {
    const newIngredient = {
      id: `new-${Date.now()}`,
      name: '',
      quantity: 0,
      unit: 'g',
      optional: false,
      confidence: 'medium' as const,
    };
    setEditingIngredients([...editingIngredients, newIngredient]);
  };

  const isComplete = totalRecipes > 0 && approvedRecipes.length + needsLaterRecipes.length === totalRecipes;

  // Save all approved recipes when user continues
  const handleContinue = async () => {
    if (approvedRecipeData.length === 0) {
      props.onNext();
      return;
    }

    setIsSaving(true);
    let successCount = 0;
    let errorCount = 0;

    for (const { dish, ingredients } of approvedRecipeData) {
      try {
        await saveRecipe.mutateAsync({
          dish,
          ingredients,
          restaurantId: props.restaurantId,
        });
        successCount++;
      } catch (error) {
        console.error('Failed to save recipe:', dish.name, error);
        errorCount++;
      }
    }

    setIsSaving(false);

    if (successCount > 0) {
      toast({
        title: 'Recipes saved!',
        description: `${successCount} recipe${successCount > 1 ? 's' : ''} saved to your database.`,
      });
    }

    if (errorCount > 0) {
      toast({
        title: 'Some recipes failed to save',
        description: `${errorCount} recipe${errorCount > 1 ? 's' : ''} couldn't be saved. You can add them later.`,
        variant: 'destructive',
      });
    }

    props.onNext();
  };

  // No dishes parsed - show empty state
  if (phase === 'approval' && recipes.length === 0) {
    return (
      <OnboardingLayout {...layoutProps} title="No Dishes Found" subtitle="We couldn't extract any dishes from your menu">
        <div className="max-w-2xl mx-auto text-center space-y-6">
          <div className="w-20 h-20 bg-muted rounded-full flex items-center justify-center mx-auto">
            <AlertCircle className="w-10 h-10 text-muted-foreground" />
          </div>
          <div>
            <h3 className="text-2xl font-semibold mb-2">No dishes found</h3>
            <p className="text-muted-foreground">
              We couldn't extract any dishes from your menu. This might happen with image-based menus or complex layouts.
            </p>
          </div>
          <div className="flex gap-4 justify-center">
            <Button variant="outline" onClick={props.onBack}>
              <ArrowLeft className="w-4 h-4 mr-2" />
              Try Different Menu
            </Button>
            <Button onClick={props.onNext}>
              Continue to Manual Entry
              <ArrowRight className="w-4 h-4 ml-2" />
            </Button>
          </div>
        </div>
      </OnboardingLayout>
    );
  }

  if (phase === 'settings') {
    return (
      <OnboardingLayout {...layoutProps} title="AI Recipe Generation" subtitle="Configure how detailed your recipes should be">
        <div className="max-w-2xl mx-auto space-y-8">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Sparkles className="w-5 h-5 text-primary" />
                Recipe Detail Level
              </CardTitle>
            </CardHeader>
            <CardContent>
              <RadioGroup value={detailLevel} onValueChange={setDetailLevel} className="space-y-4">
                <div className="flex items-start space-x-3 p-4 border rounded-lg hover:bg-muted/50 cursor-pointer">
                  <RadioGroupItem value="basic" id="basic" className="mt-1" />
                  <div>
                    <Label htmlFor="basic" className="font-medium cursor-pointer">Basic</Label>
                    <p className="text-sm text-muted-foreground">Main ingredients only, quick setup</p>
                  </div>
                </div>
                <div className="flex items-start space-x-3 p-4 border rounded-lg bg-primary/5 border-primary/20 hover:bg-primary/10 cursor-pointer">
                  <RadioGroupItem value="standard" id="standard" className="mt-1" />
                  <div>
                    <Label htmlFor="standard" className="font-medium cursor-pointer">Standard (Recommended)</Label>
                    <p className="text-sm text-muted-foreground">All ingredients with quantities and garnishes</p>
                  </div>
                </div>
                <div className="flex items-start space-x-3 p-4 border rounded-lg hover:bg-muted/50 cursor-pointer">
                  <RadioGroupItem value="advanced" id="advanced" className="mt-1" />
                  <div>
                    <Label htmlFor="advanced" className="font-medium cursor-pointer">Advanced</Label>
                    <p className="text-sm text-muted-foreground">Detailed prep steps, batch components, modifiers</p>
                  </div>
                </div>
              </RadioGroup>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <Label className="font-medium">Assume typical portion sizes</Label>
                  <p className="text-sm text-muted-foreground">We'll estimate quantities based on industry standards</p>
                </div>
                <Switch checked={assumePortions} onCheckedChange={setAssumePortions} />
              </div>
            </CardContent>
          </Card>

          {recipes.length > 0 && (
            <div className="bg-primary/10 rounded-lg p-4 text-sm">
              <p className="font-medium text-primary">✓ {recipes.length} dishes ready for review</p>
              <p className="text-muted-foreground mt-1">Your menu has been parsed. Click below to review and approve recipes.</p>
            </div>
          )}

          <div className="bg-muted/50 rounded-lg p-4 text-sm text-muted-foreground">
            <p>💡 We'll estimate quantities—you can confirm and adjust them as you review each recipe.</p>
          </div>

          <Button onClick={handleGenerateRecipes} className="w-full" size="lg" disabled={recipes.length === 0}>
            <Sparkles className="w-4 h-4 mr-2" />
            {recipes.length > 0 ? 'Review Recipes' : 'No Recipes to Review'}
          </Button>
        </div>
      </OnboardingLayout>
    );
  }

  if (isComplete) {
    return (
      <OnboardingLayout {...layoutProps} title="Recipe Review Complete" subtitle="Great progress on your recipes!">
        <motion.div 
          className="max-w-2xl mx-auto text-center space-y-6"
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.5, ease: "easeOut" }}
        >
          <motion.div 
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ type: "spring", stiffness: 300, damping: 20, delay: 0.2 }}
            className="w-20 h-20 bg-primary/10 rounded-full flex items-center justify-center mx-auto"
          >
            <Check className="w-10 h-10 text-primary" />
          </motion.div>
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
          >
            <h3 className="text-2xl font-semibold mb-2">All recipes reviewed!</h3>
            <p className="text-muted-foreground">
              {approvedRecipes.length} recipes approved, {needsLaterRecipes.length} need attention later
            </p>
          </motion.div>
          <motion.div 
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 }}
            className="flex gap-4 justify-center"
          >
            <Button variant="outline" onClick={() => {
              setCurrentRecipeIndex(0);
              setApprovedRecipes([]);
              setApprovedRecipeData([]);
              setNeedsLaterRecipes([]);
              setEditingIngredients(recipes[0]?.ingredients || []);
            }}>
              Review Again
            </Button>
            <Button onClick={handleContinue} disabled={isSaving}>
              {isSaving ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Saving Recipes...
                </>
              ) : (
                <>
                  Continue to Storage Setup
                  <ArrowRight className="w-4 h-4 ml-2" />
                </>
              )}
            </Button>
          </motion.div>
        </motion.div>
      </OnboardingLayout>
    );
  }

  if (!currentRecipe) {
    return null;
  }

  return (
    <OnboardingLayout {...layoutProps} title="Recipe Approval Studio" subtitle={`Recipe ${currentRecipeIndex + 1} of ${totalRecipes}`}>
      <AnimatePresence mode="wait">
        <motion.div 
          key={currentRecipe.id}
          className="grid lg:grid-cols-3 gap-6"
          initial="hidden"
          animate="visible"
          exit="exit"
          variants={{
            hidden: { opacity: 0 },
            visible: { 
              opacity: 1,
              transition: { staggerChildren: 0.1, delayChildren: 0.05 }
            },
            exit: { opacity: 0, transition: { duration: 0.2 } }
          }}
        >
          {/* Left: Recipe Card */}
          <motion.div variants={cardVariants}>
            <Card className="lg:col-span-1 h-full">
              <CardContent className="pt-6">
                <div className="aspect-video bg-gradient-to-br from-primary/20 to-primary/5 rounded-lg overflow-hidden mb-4 flex items-center justify-center relative group">
                  {generatingImageFor === currentRecipe.id ? (
                    <div className="flex flex-col items-center gap-2 text-muted-foreground">
                      <Loader2 className="w-8 h-8 animate-spin text-primary" />
                      <span className="text-xs">Generating image...</span>
                    </div>
                  ) : currentRecipe.imageUrl ? (
                    <>
                      <img 
                        src={currentRecipe.imageUrl} 
                        alt={currentRecipe.name}
                        className="w-full h-full object-cover"
                      />
                      <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                        <Button 
                          variant="secondary" 
                          size="sm" 
                          onClick={() => generateImageForRecipe(currentRecipe.id, true)}
                          className="text-xs"
                        >
                          <RefreshCw className="w-3 h-3 mr-1" />
                          Regenerate
                        </Button>
                      </div>
                    </>
                  ) : (
                    <div className="flex flex-col items-center gap-2 text-muted-foreground">
                      <ImageIcon className="w-8 h-8" />
                      <Button 
                        variant="ghost" 
                        size="sm" 
                        onClick={() => generateImageForRecipe(currentRecipe.id)}
                        className="text-xs"
                      >
                        <Sparkles className="w-3 h-3 mr-1" />
                        Generate Image
                      </Button>
                    </div>
                  )}
                </div>
                <h3 className="text-xl font-semibold mb-2">{currentRecipe.name}</h3>
                <p className="text-sm text-muted-foreground mb-1">{currentRecipe.section}</p>
                {currentRecipe.description && (
                  <p className="text-sm text-muted-foreground mb-3 italic">{currentRecipe.description}</p>
                )}
                {currentRecipe.price && (
                  <p className="text-sm font-medium text-primary mb-3">${currentRecipe.price.toFixed(2)}</p>
                )}
                <div className="flex flex-wrap gap-2 mb-4">
                  {currentRecipe.tags.map((tag, index) => (
                    <motion.div
                      key={tag}
                      initial={{ opacity: 0, scale: 0.8 }}
                      animate={{ opacity: 1, scale: 1 }}
                      transition={{ delay: 0.2 + index * 0.05 }}
                    >
                      <Badge variant="secondary">{tag}</Badge>
                    </motion.div>
                  ))}
                </div>
                <AIConfidenceCard
                  title="Recipe Confidence"
                  value={currentRecipe.name}
                  confidence={currentRecipe.confidence}
                  reason="Based on menu description and common preparations"
                />
              </CardContent>
            </Card>
          </motion.div>

          {/* Right: Ingredient Table */}
          <motion.div variants={cardVariants} className="lg:col-span-2">
            <Card className="h-full">
              <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle>Ingredients ({editingIngredients.length})</CardTitle>
                <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
                  <Button variant="outline" size="sm" onClick={addIngredient}>
                    <Plus className="w-4 h-4 mr-1" />
                    Add
                  </Button>
                </motion.div>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Ingredient</TableHead>
                      <TableHead className="w-24">Qty</TableHead>
                      <TableHead className="w-24">Unit</TableHead>
                      <TableHead className="w-20">Optional</TableHead>
                      <TableHead className="w-12"></TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {editingIngredients.map(ingredient => (
                      <TableRow key={ingredient.id}>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <Input
                              value={ingredient.name}
                              onChange={(e) => updateIngredient(ingredient.id, 'name', e.target.value)}
                              className="h-8"
                            />
                            {ingredient.confidence !== 'high' && (
                              <Badge variant={ingredient.confidence === 'medium' ? 'secondary' : 'destructive'} className="text-xs">
                                {ingredient.confidence}
                              </Badge>
                            )}
                          </div>
                        </TableCell>
                        <TableCell>
                          <Input
                            type="number"
                            value={ingredient.quantity}
                            onChange={(e) => updateIngredient(ingredient.id, 'quantity', parseFloat(e.target.value) || 0)}
                            className="h-8"
                          />
                        </TableCell>
                        <TableCell>
                          <Select
                            value={ingredient.unit}
                            onValueChange={(value) => updateIngredient(ingredient.id, 'unit', value)}
                          >
                            <SelectTrigger className="h-8">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="g">g</SelectItem>
                              <SelectItem value="kg">kg</SelectItem>
                              <SelectItem value="ml">ml</SelectItem>
                              <SelectItem value="L">L</SelectItem>
                              <SelectItem value="oz">oz</SelectItem>
                              <SelectItem value="lb">lb</SelectItem>
                              <SelectItem value="piece">piece</SelectItem>
                              <SelectItem value="tbsp">tbsp</SelectItem>
                              <SelectItem value="tsp">tsp</SelectItem>
                              <SelectItem value="cup">cup</SelectItem>
                            </SelectContent>
                          </Select>
                        </TableCell>
                        <TableCell>
                          <Switch
                            checked={ingredient.optional}
                            onCheckedChange={(checked) => updateIngredient(ingredient.id, 'optional', checked)}
                          />
                        </TableCell>
                        <TableCell>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 text-destructive"
                            onClick={() => removeIngredient(ingredient.id)}
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>

                {editingIngredients.length === 0 && (
                  <div className="text-center py-8 text-muted-foreground">
                    <p>No ingredients yet. Click "Add" to add ingredients manually.</p>
                  </div>
                )}

                {/* Navigation & Actions */}
                <div className="mt-6 flex items-center justify-between">
                  <Button
                    variant="ghost"
                    onClick={moveToPrevRecipe}
                    disabled={currentRecipeIndex === 0}
                  >
                    <ArrowLeft className="w-4 h-4 mr-2" />
                    Previous
                  </Button>
                  
                  <div className="flex gap-3">
                    <Button variant="outline" onClick={handleNeedsLater}>
                      <Clock className="w-4 h-4 mr-2" />
                      Later
                    </Button>
                    <Button onClick={handleApprove}>
                      <Check className="w-4 h-4 mr-2" />
                      Approve
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        </motion.div>
      </AnimatePresence>

      {/* Progress indicator */}
      <div className="mt-6 flex justify-center gap-2">
        {recipes.map((_, index) => (
          <div
            key={index}
            className={`w-2 h-2 rounded-full transition-colors ${
              index === currentRecipeIndex
                ? 'bg-primary'
                : approvedRecipes.includes(recipes[index]?.id)
                ? 'bg-green-500'
                : needsLaterRecipes.includes(recipes[index]?.id)
                ? 'bg-yellow-500'
                : 'bg-muted'
            }`}
          />
        ))}
      </div>
    </OnboardingLayout>
  );
}
