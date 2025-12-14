import { useState, useEffect, useRef, useMemo, DragEvent } from 'react';
import { OnboardingLayout } from '../OnboardingLayout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Warehouse, Snowflake, Package, Wine, Coffee, Plus, Trash2, Upload, ListChecks, FileSpreadsheet, Loader2, GripVertical, Wand2, UtensilsCrossed, Filter, X, AlertTriangle } from 'lucide-react';
import { useStorageLocations, useCreateStorageLocation } from '@/hooks/useOnboarding';
import { useOnboardingContext } from '@/contexts/OnboardingContext';
import { useToast } from '@/hooks/use-toast';
import { useSyncNotification } from '@/hooks/useSyncNotification';
import { supabase } from '@/integrations/supabase/client';
import { useIngredients, useUpdateIngredient } from '@/hooks/useIngredients';
import { useIngredientRecipes } from '@/hooks/useIngredientRecipes';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { HoverCard, HoverCardContent, HoverCardTrigger } from '@/components/ui/hover-card';

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

interface StorageLocationItem {
  id: string;
  name: string;
  icon: typeof Warehouse;
  color: string;
  isNew?: boolean;
}

interface IngredientItem {
  id: string;
  name: string;
  category: string;
  unit: string;
  storageKey: string; // maps to storage location
}

const defaultStorageLocations: StorageLocationItem[] = [
  { id: 'default-1', name: 'Walk-in Cooler', icon: Warehouse, color: 'text-blue-500', isNew: true },
  { id: 'default-2', name: 'Freezer', icon: Snowflake, color: 'text-cyan-500', isNew: true },
  { id: 'default-3', name: 'Dry Storage', icon: Package, color: 'text-amber-500', isNew: true },
  { id: 'default-4', name: 'Bar', icon: Wine, color: 'text-purple-500', isNew: true },
];

const getIconForName = (name: string) => {
  const lowerName = name.toLowerCase();
  if (lowerName.includes('cooler') || lowerName.includes('fridge')) return { icon: Warehouse, color: 'text-blue-500' };
  if (lowerName.includes('freezer')) return { icon: Snowflake, color: 'text-cyan-500' };
  if (lowerName.includes('bar')) return { icon: Wine, color: 'text-purple-500' };
  if (lowerName.includes('coffee')) return { icon: Coffee, color: 'text-orange-500' };
  return { icon: Package, color: 'text-gray-500' };
};

// Map DB storage_location enum to our default storage location IDs
const mapStorageLocationToId = (storageLocation: string | null): string => {
  switch (storageLocation) {
    case 'walk_in_cooler':
      return 'default-1';
    case 'freezer':
      return 'default-2';
    case 'dry_storage':
      return 'default-3';
    case 'bar':
      return 'default-4';
    default:
      return 'default-3'; // Default to dry storage
  }
};

// Map storage location ID back to DB enum value
const mapIdToStorageLocation = (id: string): string => {
  switch (id) {
    case 'default-1':
      return 'walk_in_cooler';
    case 'default-2':
      return 'freezer';
    case 'default-3':
      return 'dry_storage';
    case 'default-4':
      return 'bar';
    default:
      return 'dry_storage';
  }
};

export function Step4StorageSetup(props: StepProps) {
  const { toast } = useToast();
  const { conceptType } = useOnboardingContext();
  const { notify: syncNotify } = useSyncNotification();
  const [phase, setPhase] = useState<'storage' | 'method' | 'count' | 'summary'>('storage');
  const [storageLocations, setStorageLocations] = useState<StorageLocationItem[]>(defaultStorageLocations);
  const [newLocationName, setNewLocationName] = useState('');
  const [selectedMethod, setSelectedMethod] = useState<string | null>(null);
  const [activeStorageTab, setActiveStorageTab] = useState('default-1');
  const [inventoryCounts, setInventoryCounts] = useState<Record<string, number>>({});
  const [notStocked, setNotStocked] = useState<string[]>([]);
  const [isSaving, setIsSaving] = useState(false);
  const [storageOverrides, setStorageOverrides] = useState<Record<string, string>>({});
  const [draggedIngredient, setDraggedIngredient] = useState<string | null>(null);
  const [dragOverStorage, setDragOverStorage] = useState<string | null>(null);
  const [recipeFilter, setRecipeFilter] = useState<string | null>(null);
  
  const isLocalUpdateRef = useRef(false);
  
  // Merge conceptType with props for OnboardingLayout
  const layoutProps = { ...props, conceptType };

  const { data: existingLocations, refetch } = useStorageLocations(props.restaurantId || undefined);
  const createStorageLocation = useCreateStorageLocation();
  const updateIngredient = useUpdateIngredient();
  
  // Fetch real ingredients from the database
  const { data: dbIngredients, isLoading: isLoadingIngredients } = useIngredients();
  
  // Fetch recipe info for each ingredient
  const { data: ingredientRecipes } = useIngredientRecipes();
  
  // Compute effective storage locations - prefer DB locations over defaults
  const effectiveStorageLocations = useMemo(() => {
    if (existingLocations && existingLocations.length > 0) {
      return existingLocations.map(loc => {
        const { icon, color } = getIconForName(loc.name);
        return {
          id: loc.id,
          name: loc.name,
          icon,
          color,
          isNew: false,
        };
      });
    }
    return defaultStorageLocations;
  }, [existingLocations]);
  
  // Map storage_location enum to storage location ID based on effective locations
  const getStorageIdForIngredient = (storageLocation: string | null): string => {
    const nameMap: Record<string, string> = {
      'walk_in_cooler': 'Walk-in Cooler',
      'freezer': 'Freezer', 
      'dry_storage': 'Dry Storage',
      'bar': 'Bar',
    };
    const targetName = nameMap[storageLocation || 'dry_storage'] || 'Dry Storage';
    
    // Match against effective storage locations
    const matchedLocation = effectiveStorageLocations.find(loc => 
      loc.name.toLowerCase() === targetName.toLowerCase()
    );
    if (matchedLocation) return matchedLocation.id;
    
    // Fall back to first storage location if no match
    return effectiveStorageLocations[0]?.id || 'default-1';
  };
  
  // Transform database ingredients to our format, applying any storage overrides
  const ingredients: IngredientItem[] = useMemo(() => {
    return (dbIngredients || []).map(ing => ({
      id: ing.id,
      name: ing.name,
      category: ing.category,
      unit: ing.unit,
      storageKey: storageOverrides[ing.id] || getStorageIdForIngredient(ing.storage_location),
    }));
  }, [dbIngredients, storageOverrides, effectiveStorageLocations]);

  // Sync state with effective locations
  useEffect(() => {
    if (existingLocations && existingLocations.length > 0) {
      setStorageLocations(effectiveStorageLocations);
      setActiveStorageTab(effectiveStorageLocations[0]?.id || 'default-1');
    }
  }, [existingLocations, effectiveStorageLocations]);

  // Real-time sync for multi-tab support
  useEffect(() => {
    if (!props.restaurantId) return;

    const channel = supabase
      .channel(`storage-locations-${props.restaurantId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'storage_locations',
          filter: `restaurant_id=eq.${props.restaurantId}`,
        },
        (payload) => {
          // Skip if this was a local update
          if (isLocalUpdateRef.current) {
            isLocalUpdateRef.current = false;
            return;
          }

          console.log('Storage locations realtime update:', payload);
          refetch();
          syncNotify('Storage locations updated');
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [props.restaurantId, refetch, syncNotify]);

  const addStorageLocation = () => {
    if (newLocationName.trim()) {
      const { icon, color } = getIconForName(newLocationName);
      setStorageLocations([
        ...storageLocations,
        {
          id: `new-${Date.now()}`,
          name: newLocationName.trim(),
          icon,
          color,
          isNew: true,
        },
      ]);
      setNewLocationName('');
    }
  };

  const removeStorageLocation = (id: string) => {
    setStorageLocations(storageLocations.filter(loc => loc.id !== id));
  };

  const updateCount = (ingredientId: string, value: number) => {
    setInventoryCounts(prev => ({ ...prev, [ingredientId]: value }));
  };

  const toggleNotStocked = (ingredientId: string) => {
    setNotStocked(prev =>
      prev.includes(ingredientId)
        ? prev.filter(id => id !== ingredientId)
        : [...prev, ingredientId]
    );
  };

  const quickAdd = (ingredientId: string, amount: number) => {
    setInventoryCounts(prev => ({
      ...prev,
      [ingredientId]: (prev[ingredientId] || 0) + amount,
    }));
  };

  // Drag and drop handlers
  const handleDragStart = (e: DragEvent<HTMLDivElement>, ingredientId: string) => {
    e.dataTransfer.setData('ingredientId', ingredientId);
    setDraggedIngredient(ingredientId);
  };

  const handleDragEnd = () => {
    setDraggedIngredient(null);
    setDragOverStorage(null);
  };

  const handleDragOver = (e: DragEvent<HTMLDivElement>, storageId: string) => {
    e.preventDefault();
    setDragOverStorage(storageId);
  };

  const handleDragLeave = () => {
    setDragOverStorage(null);
  };

  const handleDrop = async (e: DragEvent<HTMLDivElement>, targetStorageId: string) => {
    e.preventDefault();
    const ingredientId = e.dataTransfer.getData('ingredientId');
    
    if (ingredientId && targetStorageId) {
      // Update local state immediately for responsive UI
      setStorageOverrides(prev => ({
        ...prev,
        [ingredientId]: targetStorageId,
      }));
      
      // Update database
      const storageLocationValue = mapIdToStorageLocation(targetStorageId);
      try {
        await updateIngredient.mutateAsync({
          id: ingredientId,
          storage_location: storageLocationValue as any,
        });
        toast({
          title: 'Ingredient moved',
          description: 'Storage location updated.',
        });
      } catch (error) {
        console.error('Failed to update ingredient storage:', error);
        // Revert local state on error
        setStorageOverrides(prev => {
          const updated = { ...prev };
          delete updated[ingredientId];
          return updated;
        });
      }
    }
    
    setDraggedIngredient(null);
    setDragOverStorage(null);
  };

  // Auto-assign ingredients to storage locations based on category AND ingredient name
  const getCategoryStorageMapping = (category: string, ingredientName?: string): string => {
    const lowerCategory = category.toLowerCase();
    const lowerName = (ingredientName || '').toLowerCase();
    
    // Check ingredient name for specific keywords that override category
    // Walk-in Cooler items by name
    if (lowerName.includes('beef') || 
        lowerName.includes('pork') || 
        lowerName.includes('chicken') ||
        lowerName.includes('duck') ||
        lowerName.includes('lamb') ||
        lowerName.includes('veal') ||
        lowerName.includes('meat') ||
        lowerName.includes('tenderloin') ||
        lowerName.includes('steak') ||
        lowerName.includes('stock') ||
        lowerName.includes('broth') ||
        lowerName.includes('cream') ||
        lowerName.includes('milk') ||
        lowerName.includes('butter') ||
        lowerName.includes('cheese') ||
        lowerName.includes('egg') ||
        lowerName.includes('yogurt') ||
        lowerName.includes('mayonnaise') ||
        lowerName.includes('aioli')) {
      return 'default-1'; // Walk-in Cooler
    }
    
    // Freezer items by name
    if (lowerName.includes('frozen') || 
        lowerName.includes('ice cream') ||
        lowerName.includes('sorbet')) {
      return 'default-2';
    }
    
    // Walk-in Cooler (default-1): Fresh items, dairy, produce, proteins
    if (lowerCategory.includes('dairy') || 
        lowerCategory.includes('produce') || 
        lowerCategory.includes('vegetable') ||
        lowerCategory.includes('fruit') ||
        lowerCategory.includes('herb') ||
        lowerCategory.includes('salad') ||
        lowerCategory.includes('protein') ||
        lowerCategory.includes('meat') ||
        lowerCategory.includes('fresh')) {
      return 'default-1';
    }
    
    // Freezer (default-2): Frozen items, ice cream, seafood (if frozen)
    if (lowerCategory.includes('frozen') || 
        lowerCategory.includes('ice cream') ||
        lowerCategory.includes('seafood') ||
        lowerCategory.includes('fish')) {
      return 'default-2';
    }
    
    // Bar (default-4): Beverages, alcohol, wine, spirits
    if (lowerCategory.includes('beverage') || 
        lowerCategory.includes('drink') ||
        lowerCategory.includes('alcohol') ||
        lowerCategory.includes('wine') ||
        lowerCategory.includes('spirit') ||
        lowerCategory.includes('beer') ||
        lowerCategory.includes('liquor') ||
        lowerCategory.includes('bar')) {
      return 'default-4';
    }
    
    // Dry Storage (default-3): Everything else - pantry, canned, oils, spices, etc.
    return 'default-3';
  };

  const [isAutoAssigning, setIsAutoAssigning] = useState(false);

  const handleAutoAssign = async () => {
    if (!ingredients.length) {
      toast({
        title: 'No ingredients found',
        description: 'Please approve recipes in Step 3 first.',
        variant: 'destructive',
      });
      return;
    }
    
    setIsAutoAssigning(true);
    const newOverrides: Record<string, string> = {};
    const updates: { id: string; storage_location: string }[] = [];
    
    for (const ingredient of ingredients) {
      const targetStorage = getCategoryStorageMapping(ingredient.category, ingredient.name);
      if (targetStorage !== ingredient.storageKey) {
        newOverrides[ingredient.id] = targetStorage;
        updates.push({
          id: ingredient.id,
          storage_location: mapIdToStorageLocation(targetStorage),
        });
      }
    }
    
    // Update local state immediately
    setStorageOverrides(prev => ({ ...prev, ...newOverrides }));
    
    // Update database in batch
    try {
      await Promise.all(
        updates.map(update =>
          updateIngredient.mutateAsync({
            id: update.id,
            storage_location: update.storage_location as any,
          })
        )
      );
      toast({
        title: 'Auto-assign complete',
        description: `${updates.length} ingredients assigned to storage locations.`,
      });
    } catch (error) {
      console.error('Failed to auto-assign:', error);
      toast({
        title: 'Error',
        description: 'Some ingredients could not be updated.',
        variant: 'destructive',
      });
    } finally {
      setIsAutoAssigning(false);
    }
  };

  // Get all unique recipes for the filter dropdown
  const allRecipes = useMemo(() => {
    if (!ingredientRecipes) return [];
    const recipeMap = new Map<string, string>();
    ingredientRecipes.forEach((recipes) => {
      recipes.forEach(r => recipeMap.set(r.id, r.name));
    });
    return Array.from(recipeMap.entries())
      .map(([id, name]) => ({ id, name }))
      .sort((a, b) => a.name.localeCompare(b.name));
  }, [ingredientRecipes]);

  // Filter ingredients by selected recipe
  const filteredIngredientsByStorage = (storageId: string) => {
    const storageIngredients = ingredients.filter(ing => ing.storageKey === storageId);
    if (!recipeFilter || !ingredientRecipes) return storageIngredients;
    
    return storageIngredients.filter(ing => {
      const recipes = ingredientRecipes.get(ing.id) || [];
      return recipes.some(r => r.id === recipeFilter);
    });
  };

  const ingredientsByStorage = (storageId: string) =>
    ingredients.filter(ing => ing.storageKey === storageId);

  // Critical ingredients - used in 6+ recipes
  const criticalIngredients = useMemo(() => {
    if (!ingredientRecipes) return [];
    return ingredients.filter(ing => {
      const recipes = ingredientRecipes.get(ing.id) || [];
      return recipes.length >= 6;
    }).sort((a, b) => {
      const aCount = (ingredientRecipes.get(a.id) || []).length;
      const bCount = (ingredientRecipes.get(b.id) || []).length;
      return bCount - aCount; // Sort by recipe count descending
    });
  }, [ingredients, ingredientRecipes]);

  const countedItems = Object.keys(inventoryCounts).length + notStocked.length;
  const totalItems = ingredients.length;

  if (phase === 'storage') {
    return (
      <OnboardingLayout {...layoutProps} title="Set Up Storage Locations" subtitle="Define where ingredients are stored">
        <div className="max-w-2xl mx-auto space-y-6">
          <p className="text-muted-foreground">
            We've suggested common storage locations. Add, edit, or remove as needed.
          </p>

          <div className="grid gap-3">
            {storageLocations.map(location => {
              const Icon = location.icon;
              return (
                <Card key={location.id}>
                  <CardContent className="flex items-center justify-between py-4">
                    <div className="flex items-center gap-3">
                      <div className={`w-10 h-10 rounded-lg bg-muted flex items-center justify-center ${location.color}`}>
                        <Icon className="w-5 h-5" />
                      </div>
                      <span className="font-medium">{location.name}</span>
                    </div>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => removeStorageLocation(location.id)}
                    >
                      <Trash2 className="w-4 h-4 text-muted-foreground" />
                    </Button>
                  </CardContent>
                </Card>
              );
            })}
          </div>

          <div className="flex gap-2">
            <Input
              placeholder="Add custom location..."
              value={newLocationName}
              onChange={(e) => setNewLocationName(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && addStorageLocation()}
            />
            <Button onClick={addStorageLocation}>
              <Plus className="w-4 h-4 mr-2" />
              Add
            </Button>
          </div>

          <Button 
            onClick={async () => {
              if (!props.restaurantId) {
                toast({
                  title: 'Restaurant not found',
                  description: 'Please complete step 1 first.',
                  variant: 'destructive',
                });
                return;
              }
              
              setIsSaving(true);
              isLocalUpdateRef.current = true;
              
              try {
                // Save new storage locations to database
                const newLocations = storageLocations.filter(loc => loc.isNew);
                for (let i = 0; i < newLocations.length; i++) {
                  await createStorageLocation.mutateAsync({
                    restaurant_id: props.restaurantId,
                    name: newLocations[i].name,
                    sort_order: i,
                  });
                }
                props.updateHealthScore(5);
                setPhase('method');
              } catch (error) {
                console.error('Failed to save storage locations:', error);
                isLocalUpdateRef.current = false;
                toast({
                  title: 'Error saving',
                  description: 'Failed to save storage locations.',
                  variant: 'destructive',
                });
              } finally {
                setIsSaving(false);
              }
            }} 
            className="w-full" 
            size="lg"
            disabled={isSaving}
          >
            {isSaving ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : null}
            {isSaving ? 'Saving...' : 'Continue to Inventory Count'}
          </Button>
        </div>
      </OnboardingLayout>
    );
  }

  if (phase === 'method') {
    return (
      <OnboardingLayout {...layoutProps} title="Baseline Inventory" subtitle="Choose how to enter your current inventory">
        <div className="max-w-2xl mx-auto space-y-6">
          <div className="grid gap-4">
            <Card
              className={`cursor-pointer transition-all hover:border-primary ${
                selectedMethod === 'guided' ? 'border-primary bg-primary/5' : ''
              }`}
              onClick={() => setSelectedMethod('guided')}
            >
              <CardContent className="flex items-start gap-4 py-6">
                <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                  <ListChecks className="w-6 h-6 text-primary" />
                </div>
                <div>
                  <h3 className="font-semibold mb-1">Guided Count Mode</h3>
                  <p className="text-sm text-muted-foreground">
                    Walk through each storage area and count items. Best for accuracy.
                  </p>
                  <Badge className="mt-2">Recommended</Badge>
                </div>
              </CardContent>
            </Card>

            <Card
              className={`cursor-pointer transition-all hover:border-primary ${
                selectedMethod === 'upload' ? 'border-primary bg-primary/5' : ''
              }`}
              onClick={() => setSelectedMethod('upload')}
            >
              <CardContent className="flex items-start gap-4 py-6">
                <div className="w-12 h-12 rounded-lg bg-muted flex items-center justify-center shrink-0">
                  <Upload className="w-6 h-6 text-muted-foreground" />
                </div>
                <div>
                  <h3 className="font-semibold mb-1">Upload Inventory Sheet</h3>
                  <p className="text-sm text-muted-foreground">
                    Import from CSV or spreadsheet if you have existing data.
                  </p>
                </div>
              </CardContent>
            </Card>

            <Card
              className={`cursor-pointer transition-all hover:border-primary ${
                selectedMethod === 'empty' ? 'border-primary bg-primary/5' : ''
              }`}
              onClick={() => setSelectedMethod('empty')}
            >
              <CardContent className="flex items-start gap-4 py-6">
                <div className="w-12 h-12 rounded-lg bg-muted flex items-center justify-center shrink-0">
                  <FileSpreadsheet className="w-6 h-6 text-muted-foreground" />
                </div>
                <div>
                  <h3 className="font-semibold mb-1">Start Empty</h3>
                  <p className="text-sm text-muted-foreground">
                    Begin with zero inventory. Add counts later.
                  </p>
                  <Badge variant="secondary" className="mt-2">Not recommended</Badge>
                </div>
              </CardContent>
            </Card>
          </div>

          <Button
            onClick={() => {
              if (selectedMethod === 'guided') {
                setPhase('count');
              } else if (selectedMethod === 'empty') {
                props.onNext();
              }
            }}
            className="w-full"
            size="lg"
            disabled={!selectedMethod}
          >
            {selectedMethod === 'guided' ? 'Start Counting' : selectedMethod === 'empty' ? 'Skip & Continue' : 'Continue'}
          </Button>
        </div>
      </OnboardingLayout>
    );
  }

  if (phase === 'count') {
    return (
      <OnboardingLayout {...layoutProps} title="Guided Inventory Count" subtitle={`${countedItems} of ${totalItems} items counted`}>
        <div className="space-y-6">
        <div className="bg-muted/50 rounded-lg p-4 space-y-3">
          <div className="flex items-center justify-between gap-4 flex-wrap">
            <p className="text-sm text-muted-foreground">
              💡 Drag ingredients between storage tabs to reassign them, or use auto-assign.
            </p>
            <div className="flex items-center gap-2">
              <div className="flex items-center gap-2">
                <Filter className="w-4 h-4 text-muted-foreground" />
                <Select value={recipeFilter || 'all'} onValueChange={(v) => setRecipeFilter(v === 'all' ? null : v)}>
                  <SelectTrigger className="w-[200px] h-9 bg-background">
                    <SelectValue placeholder="Filter by recipe" />
                  </SelectTrigger>
                  <SelectContent className="bg-background z-50">
                    <SelectItem value="all">All ingredients</SelectItem>
                    {allRecipes.map(recipe => (
                      <SelectItem key={recipe.id} value={recipe.id}>
                        {recipe.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {recipeFilter && (
                  <Button 
                    variant="ghost" 
                    size="icon" 
                    className="h-9 w-9"
                    onClick={() => setRecipeFilter(null)}
                  >
                    <X className="w-4 h-4" />
                  </Button>
                )}
              </div>
              <HoverCard openDelay={200}>
                <HoverCardTrigger asChild>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleAutoAssign}
                    disabled={isAutoAssigning || !ingredients.length}
                    className="shrink-0"
                  >
                    {isAutoAssigning ? (
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    ) : (
                      <Wand2 className="w-4 h-4 mr-2" />
                    )}
                    Auto-Assign
                  </Button>
                </HoverCardTrigger>
                <HoverCardContent className="w-80" align="end">
                  <div className="space-y-3">
                    <h4 className="font-semibold text-sm">Auto-Assign Categories</h4>
                    <p className="text-xs text-muted-foreground">
                      Ingredients are assigned based on their category:
                    </p>
                    <div className="space-y-2 text-xs">
                      <div className="flex items-start gap-2">
                        <Warehouse className="w-4 h-4 text-blue-500 mt-0.5 shrink-0" />
                        <div>
                          <span className="font-medium">Walk-in Cooler</span>
                          <p className="text-muted-foreground">Dairy, Produce, Vegetables, Fruits, Herbs, Salads, Fresh items</p>
                        </div>
                      </div>
                      <div className="flex items-start gap-2">
                        <Snowflake className="w-4 h-4 text-cyan-500 mt-0.5 shrink-0" />
                        <div>
                          <span className="font-medium">Freezer</span>
                          <p className="text-muted-foreground">Frozen items, Ice cream, Seafood, Fish</p>
                        </div>
                      </div>
                      <div className="flex items-start gap-2">
                        <Wine className="w-4 h-4 text-purple-500 mt-0.5 shrink-0" />
                        <div>
                          <span className="font-medium">Bar</span>
                          <p className="text-muted-foreground">Beverages, Drinks, Alcohol, Wine, Spirits, Beer</p>
                        </div>
                      </div>
                      <div className="flex items-start gap-2">
                        <Package className="w-4 h-4 text-amber-500 mt-0.5 shrink-0" />
                        <div>
                          <span className="font-medium">Dry Storage</span>
                          <p className="text-muted-foreground">Pantry, Canned goods, Oils, Spices, and everything else</p>
                        </div>
                      </div>
                    </div>
                  </div>
                </HoverCardContent>
              </HoverCard>
            </div>
          </div>
          {recipeFilter && (
            <div className="flex items-center gap-2 text-sm">
              <Badge variant="secondary" className="bg-primary/10 text-primary">
                <UtensilsCrossed className="w-3 h-3 mr-1" />
                Showing ingredients for: {allRecipes.find(r => r.id === recipeFilter)?.name}
              </Badge>
            </div>
          )}
        </div>

        {/* Critical Ingredients Section */}
        {criticalIngredients.length > 0 && !recipeFilter && (
          <Card className="border-red-200 dark:border-red-900/50 bg-red-50/50 dark:bg-red-950/20">
            <CardContent className="py-4">
              <div className="flex items-center gap-2 mb-3">
                <AlertTriangle className="w-5 h-5 text-red-600 dark:text-red-400" />
                <h3 className="font-semibold text-red-900 dark:text-red-100">
                  Critical Ingredients ({criticalIngredients.length})
                </h3>
                <Badge variant="secondary" className="bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400 text-xs">
                  Used in 6+ recipes
                </Badge>
              </div>
              <p className="text-sm text-red-700/80 dark:text-red-300/80 mb-4">
                These ingredients are used across many dishes — running low affects multiple menu items.
              </p>
              <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
                {criticalIngredients.slice(0, 6).map(ingredient => {
                  const recipes = ingredientRecipes?.get(ingredient.id) || [];
                  const isNotStocked = notStocked.includes(ingredient.id);
                  return (
                    <div 
                      key={ingredient.id} 
                      className={`flex items-center justify-between gap-2 p-2 rounded-lg bg-background border ${isNotStocked ? 'opacity-50' : ''}`}
                    >
                      <div className="min-w-0 flex-1">
                        <p className="font-medium text-sm truncate">{ingredient.name}</p>
                        <p className="text-xs text-muted-foreground">{recipes.length} recipes</p>
                      </div>
                      <div className="flex items-center gap-2">
                        <Input
                          type="number"
                          value={inventoryCounts[ingredient.id] || ''}
                          onChange={(e) => updateCount(ingredient.id, parseFloat(e.target.value) || 0)}
                          className="w-16 h-8 text-sm"
                          placeholder="0"
                          disabled={isNotStocked}
                        />
                        <span className="text-xs text-muted-foreground w-8">{ingredient.unit}</span>
                      </div>
                    </div>
                  );
                })}
              </div>
              {criticalIngredients.length > 6 && (
                <p className="text-xs text-red-600/70 dark:text-red-400/70 mt-3">
                  +{criticalIngredients.length - 6} more critical ingredients in storage tabs below
                </p>
              )}
            </CardContent>
          </Card>
        )}

        <Tabs value={activeStorageTab} onValueChange={setActiveStorageTab}>
          <TabsList className="w-full justify-start overflow-x-auto">
            {storageLocations.map(location => {
              const Icon = location.icon;
              const filteredCount = filteredIngredientsByStorage(location.id).length;
              const totalCount = ingredientsByStorage(location.id).length;
              const isDropTarget = draggedIngredient && dragOverStorage === location.id;
              return (
                <TabsTrigger 
                  key={location.id} 
                  value={location.id} 
                  className={`flex items-center gap-2 transition-all ${isDropTarget ? 'ring-2 ring-primary bg-primary/10' : ''}`}
                  onDragOver={(e) => handleDragOver(e as any, location.id)}
                  onDragLeave={handleDragLeave}
                  onDrop={(e) => handleDrop(e as any, location.id)}
                >
                  <Icon className="w-4 h-4" />
                  {location.name}
                  <Badge variant="secondary" className="ml-1">
                    {recipeFilter ? `${filteredCount}/${totalCount}` : totalCount}
                  </Badge>
                </TabsTrigger>
              );
            })}
          </TabsList>

          {storageLocations.map(location => (
            <TabsContent 
              key={location.id} 
              value={location.id} 
              className={`mt-6 min-h-[200px] transition-all rounded-lg ${
                draggedIngredient && dragOverStorage === location.id 
                  ? 'ring-2 ring-primary ring-dashed bg-primary/5' 
                  : ''
              }`}
              onDragOver={(e) => handleDragOver(e as any, location.id)}
              onDragLeave={handleDragLeave}
              onDrop={(e) => handleDrop(e as any, location.id)}
            >
              <div className="space-y-3">
                {filteredIngredientsByStorage(location.id).length === 0 ? (
                  <div className="text-center py-12 text-muted-foreground">
                    <Package className="w-12 h-12 mx-auto mb-3 opacity-30" />
                    <p>{recipeFilter ? 'No matching ingredients in this location' : 'No ingredients in this location'}</p>
                    <p className="text-sm">{recipeFilter ? 'Try a different recipe filter' : 'Drag ingredients here to assign them'}</p>
                  </div>
                ) : (
                  filteredIngredientsByStorage(location.id).map(ingredient => {
                    const isNotStocked = notStocked.includes(ingredient.id);
                    const isDragging = draggedIngredient === ingredient.id;
                    const recipes = ingredientRecipes?.get(ingredient.id) || [];
                    return (
                      <Card 
                        key={ingredient.id} 
                        className={`cursor-grab active:cursor-grabbing transition-all ${
                          isNotStocked ? 'opacity-50' : ''
                        } ${isDragging ? 'opacity-50 scale-95' : ''}`}
                        draggable
                        onDragStart={(e) => handleDragStart(e, ingredient.id)}
                        onDragEnd={handleDragEnd}
                      >
                        <CardContent className="py-4">
                          <div className="flex items-center justify-between gap-4">
                            <div className="flex items-center gap-3 flex-1">
                              <GripVertical className="w-4 h-4 text-muted-foreground/50" />
                              <div className="min-w-0 flex-1">
                                <div className="flex items-center gap-2">
                                  <span className="font-medium">{ingredient.name}</span>
                                  {recipes.length > 0 && (
                                    <Badge 
                                      variant="secondary" 
                                      className={`text-xs px-1.5 py-0 h-5 ${
                                        recipes.length <= 2 
                                          ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400' 
                                          : recipes.length <= 5 
                                            ? 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400'
                                            : 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400'
                                      }`}
                                    >
                                      {recipes.length} recipe{recipes.length > 1 ? 's' : ''}
                                    </Badge>
                                  )}
                                </div>
                                <p className="text-sm text-muted-foreground">{ingredient.category}</p>
                                {recipes.length > 0 && (
                                  <HoverCard>
                                    <HoverCardTrigger asChild>
                                      <div className="flex items-center gap-1.5 mt-1 flex-wrap cursor-pointer hover:opacity-80 transition-opacity">
                                        <UtensilsCrossed className="w-3 h-3 text-muted-foreground shrink-0" />
                                        <span className="text-xs text-muted-foreground truncate">
                                          {recipes.slice(0, 2).map(r => r.name).join(', ')}
                                          {recipes.length > 2 && (
                                            <span className="text-primary ml-1 font-medium">+{recipes.length - 2} more</span>
                                          )}
                                        </span>
                                      </div>
                                    </HoverCardTrigger>
                                    <HoverCardContent className="w-64" align="start">
                                      <div className="space-y-2">
                                        <h4 className="text-sm font-semibold flex items-center gap-2">
                                          <UtensilsCrossed className="w-4 h-4" />
                                          Used in {recipes.length} recipe{recipes.length > 1 ? 's' : ''}
                                        </h4>
                                        <ul className="text-sm text-muted-foreground space-y-1 max-h-48 overflow-y-auto">
                                          {recipes.map(recipe => (
                                            <li key={recipe.id} className="truncate">• {recipe.name}</li>
                                          ))}
                                        </ul>
                                      </div>
                                    </HoverCardContent>
                                  </HoverCard>
                                )}
                              </div>
                            </div>

                          <div className="flex items-center gap-3">
                            <div className="flex items-center gap-1">
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => quickAdd(ingredient.id, 0.5)}
                                disabled={isNotStocked}
                              >
                                +0.5
                              </Button>
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => quickAdd(ingredient.id, 1)}
                                disabled={isNotStocked}
                              >
                                +1
                              </Button>
                            </div>

                            <div className="flex items-center gap-2">
                              <Input
                                type="number"
                                value={inventoryCounts[ingredient.id] || ''}
                                onChange={(e) => updateCount(ingredient.id, parseFloat(e.target.value) || 0)}
                                className="w-20 h-9"
                                placeholder="0"
                                disabled={isNotStocked}
                              />
                              <span className="text-sm text-muted-foreground w-16">{ingredient.unit}</span>
                            </div>

                            <div className="flex items-center gap-2">
                              <span className="text-xs text-muted-foreground">Not stocked</span>
                              <Switch
                                checked={isNotStocked}
                                onCheckedChange={() => toggleNotStocked(ingredient.id)}
                              />
                            </div>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  );
                })
              )}
              </div>
            </TabsContent>
          ))}
        </Tabs>

        <div className="flex justify-between pt-4">
          <Button variant="outline" onClick={() => setPhase('method')}>
            Back to Method
          </Button>
          <Button 
            onClick={() => setPhase('summary')}
            disabled={countedItems === 0}
          >
            Review & Save
          </Button>
        </div>
      </div>
    </OnboardingLayout>
  );
  }

  // Summary phase - review before saving
  const countedIngredients = ingredients.filter(
    ing => inventoryCounts[ing.id] !== undefined || notStocked.includes(ing.id)
  );
  
  const groupedBySummary = storageLocations.map(location => ({
    location,
    items: countedIngredients.filter(ing => ing.storageKey === location.id),
  })).filter(group => group.items.length > 0);

  return (
    <OnboardingLayout {...layoutProps} title="Review Inventory Count" subtitle="Confirm your counts before saving">
      <div className="space-y-6">
        <div className="bg-muted/50 rounded-lg p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="font-medium">{countedItems} items counted</p>
              <p className="text-sm text-muted-foreground">
                {Object.keys(inventoryCounts).length} with quantities, {notStocked.length} marked as not stocked
              </p>
            </div>
            <Badge variant="secondary" className="text-lg px-4 py-2">
              Ready to save
            </Badge>
          </div>
        </div>

        <div className="space-y-4 max-h-[400px] overflow-y-auto">
          {groupedBySummary.map(({ location, items }) => {
            const Icon = location.icon;
            return (
              <Card key={location.id}>
                <CardContent className="py-4">
                  <div className="flex items-center gap-2 mb-3">
                    <Icon className={`w-5 h-5 ${location.color}`} />
                    <h3 className="font-semibold">{location.name}</h3>
                    <Badge variant="outline">{items.length} items</Badge>
                  </div>
                  <div className="space-y-2">
                    {items.map(ingredient => {
                      const isMarkedNotStocked = notStocked.includes(ingredient.id);
                      const count = inventoryCounts[ingredient.id];
                      return (
                        <div 
                          key={ingredient.id} 
                          className="flex items-center justify-between py-2 px-3 bg-muted/30 rounded-lg"
                        >
                          <div>
                            <span className="font-medium">{ingredient.name}</span>
                            <span className="text-sm text-muted-foreground ml-2">({ingredient.category})</span>
                          </div>
                          {isMarkedNotStocked ? (
                            <Badge variant="secondary" className="text-muted-foreground">Not stocked</Badge>
                          ) : (
                            <span className="font-mono font-medium">
                              {count} {ingredient.unit}
                            </span>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>

        {countedItems === 0 && (
          <div className="text-center py-8 text-muted-foreground">
            <Package className="w-12 h-12 mx-auto mb-3 opacity-30" />
            <p>No items counted yet</p>
            <p className="text-sm">Go back to count your inventory</p>
          </div>
        )}

        <div className="flex justify-between pt-4">
          <Button variant="outline" onClick={() => setPhase('count')}>
            Back to Count
          </Button>
          <Button 
            onClick={async () => {
              setIsSaving(true);
              
              try {
                // Save inventory counts to database
                const updateIngredientStock = async (ingredientId: string, newStock: number) => {
                  const { error } = await supabase
                    .from('ingredients')
                    .update({ current_stock: newStock })
                    .eq('id', ingredientId);
                  if (error) throw error;
                };
                
                const logInventoryEvent = async (
                  ingredientId: string, 
                  quantity: number, 
                  previousStock: number, 
                  newStock: number, 
                  notes: string
                ) => {
                  const { error } = await supabase
                    .from('inventory_events')
                    .insert({
                      ingredient_id: ingredientId,
                      event_type: 'count' as const,
                      quantity,
                      previous_stock: previousStock,
                      new_stock: newStock,
                      source: 'onboarding',
                      notes,
                    });
                  if (error) throw error;
                };
                
                const updates: Promise<void>[] = [];
                
                for (const ingredient of ingredients) {
                  const count = inventoryCounts[ingredient.id];
                  const isMarkedNotStocked = notStocked.includes(ingredient.id);
                  
                  // Only update if user entered a count or marked as not stocked
                  if (count !== undefined || isMarkedNotStocked) {
                    const newStock = isMarkedNotStocked ? 0 : (count || 0);
                    
                    // Find original ingredient to get previous stock
                    const originalIngredient = dbIngredients?.find(i => i.id === ingredient.id);
                    const previousStock = originalIngredient?.current_stock || 0;
                    
                    const notes = isMarkedNotStocked 
                      ? 'Marked as not stocked during onboarding' 
                      : 'Initial count during onboarding';
                    
                    updates.push(updateIngredientStock(ingredient.id, newStock));
                    updates.push(logInventoryEvent(ingredient.id, newStock - previousStock, previousStock, newStock, notes));
                  }
                }
                
                if (updates.length > 0) {
                  await Promise.all(updates);
                  toast({
                    title: 'Inventory saved',
                    description: `${countedItems} items saved successfully.`,
                  });
                }
                
                props.updateHealthScore(15);
                props.onNext();
              } catch (error) {
                console.error('Failed to save inventory counts:', error);
                toast({
                  title: 'Error saving',
                  description: 'Failed to save inventory counts. Please try again.',
                  variant: 'destructive',
                });
              } finally {
                setIsSaving(false);
              }
            }}
            disabled={isSaving || countedItems === 0}
          >
            {isSaving ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : null}
            {isSaving ? 'Saving...' : 'Confirm & Save'}
          </Button>
        </div>
      </div>
    </OnboardingLayout>
  );
}
