import { useState } from 'react';
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
import { Check, Clock, Trash2, Plus, ArrowRight, ArrowLeft, Sparkles, Copy } from 'lucide-react';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';

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

// Dish images
import dishMargherita from '@/assets/onboarding/dish-margherita.jpg';
import dishCaesarSalad from '@/assets/onboarding/dish-caesar-salad.jpg';
import dishSalmon from '@/assets/onboarding/dish-salmon.jpg';

interface StepProps {
  currentStep: number;
  completedSteps: number[];
  setupHealthScore: number;
  orgId: string | null;
  onNext: () => void;
  onBack?: () => void;
  onSave: () => void;
  updateHealthScore: (delta: number) => void;
}

// Mock draft recipes for demonstration
const mockDraftRecipes = [
  {
    id: '1',
    name: 'Classic Margherita Pizza',
    section: 'Pizzas',
    confidence: 'high' as const,
    tags: ['vegetarian', 'popular'],
    image: dishMargherita,
    ingredients: [
      { id: '1', name: 'Pizza dough', quantity: 250, unit: 'g', optional: false, confidence: 'high' as const },
      { id: '2', name: 'San Marzano tomatoes', quantity: 100, unit: 'g', optional: false, confidence: 'high' as const },
      { id: '3', name: 'Fresh mozzarella', quantity: 150, unit: 'g', optional: false, confidence: 'high' as const },
      { id: '4', name: 'Fresh basil', quantity: 10, unit: 'leaves', optional: true, confidence: 'medium' as const },
      { id: '5', name: 'Olive oil', quantity: 15, unit: 'ml', optional: false, confidence: 'high' as const },
    ],
  },
  {
    id: '2',
    name: 'Caesar Salad',
    section: 'Salads',
    confidence: 'medium' as const,
    tags: ['classic'],
    image: dishCaesarSalad,
    ingredients: [
      { id: '1', name: 'Romaine lettuce', quantity: 200, unit: 'g', optional: false, confidence: 'high' as const },
      { id: '2', name: 'Caesar dressing', quantity: 60, unit: 'ml', optional: false, confidence: 'medium' as const },
      { id: '3', name: 'Parmesan cheese', quantity: 30, unit: 'g', optional: false, confidence: 'high' as const },
      { id: '4', name: 'Croutons', quantity: 50, unit: 'g', optional: false, confidence: 'high' as const },
      { id: '5', name: 'Anchovy', quantity: 2, unit: 'fillets', optional: true, confidence: 'low' as const },
    ],
  },
  {
    id: '3',
    name: 'Grilled Salmon',
    section: 'Mains',
    confidence: 'high' as const,
    tags: ['seafood', 'healthy'],
    image: dishSalmon,
    ingredients: [
      { id: '1', name: 'Salmon fillet', quantity: 180, unit: 'g', optional: false, confidence: 'high' as const },
      { id: '2', name: 'Lemon', quantity: 0.5, unit: 'piece', optional: false, confidence: 'high' as const },
      { id: '3', name: 'Dill', quantity: 5, unit: 'g', optional: true, confidence: 'medium' as const },
      { id: '4', name: 'Butter', quantity: 20, unit: 'g', optional: false, confidence: 'high' as const },
    ],
  },
];

export function Step3RecipeApproval(props: StepProps) {
  const [phase, setPhase] = useState<'settings' | 'approval'>('settings');
  const [detailLevel, setDetailLevel] = useState('standard');
  const [assumePortions, setAssumePortions] = useState(true);
  const [currentRecipeIndex, setCurrentRecipeIndex] = useState(0);
  const [approvedRecipes, setApprovedRecipes] = useState<string[]>([]);
  const [needsLaterRecipes, setNeedsLaterRecipes] = useState<string[]>([]);
  const [editingIngredients, setEditingIngredients] = useState(mockDraftRecipes[0].ingredients);

  const currentRecipe = mockDraftRecipes[currentRecipeIndex];
  const totalRecipes = mockDraftRecipes.length;

  const handleGenerateRecipes = () => {
    setPhase('approval');
    setEditingIngredients(mockDraftRecipes[0].ingredients);
  };

  const handleApprove = () => {
    setApprovedRecipes([...approvedRecipes, currentRecipe.id]);
    props.updateHealthScore(5);
    moveToNextRecipe();
  };

  const handleNeedsLater = () => {
    setNeedsLaterRecipes([...needsLaterRecipes, currentRecipe.id]);
    moveToNextRecipe();
  };

  const moveToNextRecipe = () => {
    if (currentRecipeIndex < totalRecipes - 1) {
      const nextIndex = currentRecipeIndex + 1;
      setCurrentRecipeIndex(nextIndex);
      setEditingIngredients(mockDraftRecipes[nextIndex].ingredients);
    }
  };

  const moveToPrevRecipe = () => {
    if (currentRecipeIndex > 0) {
      const prevIndex = currentRecipeIndex - 1;
      setCurrentRecipeIndex(prevIndex);
      setEditingIngredients(mockDraftRecipes[prevIndex].ingredients);
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
      id: Date.now().toString(),
      name: '',
      quantity: 0,
      unit: 'g',
      optional: false,
      confidence: 'medium' as const,
    };
    setEditingIngredients([...editingIngredients, newIngredient]);
  };

  const isComplete = approvedRecipes.length + needsLaterRecipes.length === totalRecipes;

  if (phase === 'settings') {
    return (
      <OnboardingLayout {...props} title="AI Recipe Generation" subtitle="Configure how detailed your recipes should be">
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

          <div className="bg-muted/50 rounded-lg p-4 text-sm text-muted-foreground">
            <p>💡 We'll estimate quantities—you can confirm and adjust them as you review each recipe.</p>
          </div>

          <Button onClick={handleGenerateRecipes} className="w-full" size="lg">
            <Sparkles className="w-4 h-4 mr-2" />
            Generate Recipes
          </Button>
        </div>
      </OnboardingLayout>
    );
  }

  if (isComplete) {
    return (
      <OnboardingLayout {...props} title="Recipe Review Complete" subtitle="Great progress on your recipes!">
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
            <Button variant="outline" onClick={() => setPhase('settings')}>
              Review Settings
            </Button>
            <Button onClick={props.onNext}>
              Continue to Storage Setup
              <ArrowRight className="w-4 h-4 ml-2" />
            </Button>
          </motion.div>
        </motion.div>
      </OnboardingLayout>
    );
  }

  return (
    <OnboardingLayout {...props} title="Recipe Approval Studio" subtitle={`Recipe ${currentRecipeIndex + 1} of ${totalRecipes}`}>
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
                <motion.div 
                  className="aspect-video bg-muted rounded-lg overflow-hidden mb-4"
                  whileHover={{ scale: 1.02 }}
                  transition={{ duration: 0.2 }}
                >
                  <img 
                    src={currentRecipe.image} 
                    alt={currentRecipe.name}
                    className="w-full h-full object-cover"
                  />
                </motion.div>
                <h3 className="text-xl font-semibold mb-2">{currentRecipe.name}</h3>
                <p className="text-sm text-muted-foreground mb-3">{currentRecipe.section}</p>
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
                <CardTitle>Ingredients</CardTitle>
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
                            onChange={(e) => updateIngredient(ingredient.id, 'quantity', parseFloat(e.target.value))}
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
                              <SelectItem value="leaves">leaves</SelectItem>
                              <SelectItem value="fillets">fillets</SelectItem>
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

                <div className="flex gap-2 mt-4">
                  <Button variant="outline" size="sm">
                    <Plus className="w-4 h-4 mr-1" />
                    Create Prep Batch
                  </Button>
                  <Button variant="outline" size="sm">
                    <Copy className="w-4 h-4 mr-1" />
                    Duplicate & Edit
                  </Button>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        </motion.div>
      </AnimatePresence>

      {/* Navigation */}
      <motion.div 
        className="flex items-center justify-between mt-6"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3 }}
      >
        <motion.div whileHover={{ x: -3 }} whileTap={{ scale: 0.95 }}>
          <Button
            variant="outline"
            onClick={moveToPrevRecipe}
            disabled={currentRecipeIndex === 0}
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Previous
          </Button>
        </motion.div>

        <div className="flex gap-3">
          <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.95 }}>
            <Button variant="outline" onClick={handleNeedsLater}>
              <Clock className="w-4 h-4 mr-2" />
              Needs Later
            </Button>
          </motion.div>
          <motion.div whileHover={{ scale: 1.02, x: 3 }} whileTap={{ scale: 0.95 }}>
            <Button onClick={handleApprove}>
              <Check className="w-4 h-4 mr-2" />
              Approve & Next
            </Button>
          </motion.div>
        </div>
      </motion.div>
    </OnboardingLayout>
  );
}
