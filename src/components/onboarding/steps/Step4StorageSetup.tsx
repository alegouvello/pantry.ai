import { useState, useEffect, useRef } from 'react';
import { OnboardingLayout } from '../OnboardingLayout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Warehouse, Snowflake, Package, Wine, Coffee, Plus, Trash2, Upload, ListChecks, FileSpreadsheet, Loader2 } from 'lucide-react';
import { useStorageLocations, useCreateStorageLocation } from '@/hooks/useOnboarding';
import { useOnboardingContext } from '@/contexts/OnboardingContext';
import { useToast } from '@/hooks/use-toast';
import { useSyncNotification } from '@/hooks/useSyncNotification';
import { supabase } from '@/integrations/supabase/client';
import { useIngredients } from '@/hooks/useIngredients';

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

export function Step4StorageSetup(props: StepProps) {
  const { toast } = useToast();
  const { conceptType } = useOnboardingContext();
  const { notify: syncNotify } = useSyncNotification();
  const [phase, setPhase] = useState<'storage' | 'method' | 'count'>('storage');
  const [storageLocations, setStorageLocations] = useState<StorageLocationItem[]>(defaultStorageLocations);
  const [newLocationName, setNewLocationName] = useState('');
  const [selectedMethod, setSelectedMethod] = useState<string | null>(null);
  const [activeStorageTab, setActiveStorageTab] = useState('default-1');
  const [inventoryCounts, setInventoryCounts] = useState<Record<string, number>>({});
  const [notStocked, setNotStocked] = useState<string[]>([]);
  const [isSaving, setIsSaving] = useState(false);
  
  const isLocalUpdateRef = useRef(false);
  
  // Merge conceptType with props for OnboardingLayout
  const layoutProps = { ...props, conceptType };

  const { data: existingLocations, refetch } = useStorageLocations(props.restaurantId || undefined);
  const createStorageLocation = useCreateStorageLocation();
  
  // Fetch real ingredients from the database
  const { data: dbIngredients } = useIngredients();
  
  // Transform database ingredients to our format
  const ingredients: IngredientItem[] = (dbIngredients || []).map(ing => ({
    id: ing.id,
    name: ing.name,
    category: ing.category,
    unit: ing.unit,
    storageKey: mapStorageLocationToId(ing.storage_location),
  }));

  // Initialize from database if locations exist
  useEffect(() => {
    if (existingLocations && existingLocations.length > 0) {
      const mappedLocations = existingLocations.map(loc => {
        const { icon, color } = getIconForName(loc.name);
        return {
          id: loc.id,
          name: loc.name,
          icon,
          color,
          isNew: false,
        };
      });
      setStorageLocations(mappedLocations);
      setActiveStorageTab(mappedLocations[0]?.id || 'default-1');
    }
  }, [existingLocations]);

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

  const ingredientsByStorage = (storageId: string) =>
    ingredients.filter(ing => ing.storageKey === storageId);

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

  return (
    <OnboardingLayout {...layoutProps} title="Guided Inventory Count" subtitle={`${countedItems} of ${totalItems} items counted`}>
      <div className="space-y-6">
        <div className="bg-muted/50 rounded-lg p-4 text-sm text-muted-foreground">
          💡 We've prioritized the top items based on your menu. Focus on these first for 80/20 accuracy.
        </div>

        <Tabs value={activeStorageTab} onValueChange={setActiveStorageTab}>
          <TabsList className="w-full justify-start overflow-x-auto">
            {storageLocations.map(location => {
              const Icon = location.icon;
              const itemCount = ingredientsByStorage(location.id).length;
              return (
                <TabsTrigger key={location.id} value={location.id} className="flex items-center gap-2">
                  <Icon className="w-4 h-4" />
                  {location.name}
                  <Badge variant="secondary" className="ml-1">{itemCount}</Badge>
                </TabsTrigger>
              );
            })}
          </TabsList>

          {storageLocations.map(location => (
            <TabsContent key={location.id} value={location.id} className="mt-6">
              <div className="space-y-3">
                {ingredientsByStorage(location.id).map(ingredient => {
                  const isNotStocked = notStocked.includes(ingredient.id);
                  return (
                    <Card key={ingredient.id} className={isNotStocked ? 'opacity-50' : ''}>
                      <CardContent className="py-4">
                        <div className="flex items-center justify-between gap-4">
                          <div className="flex-1">
                            <div className="flex items-center gap-2">
                              <span className="font-medium">{ingredient.name}</span>
                            </div>
                            <p className="text-sm text-muted-foreground">{ingredient.category}</p>
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
                })}
              </div>
            </TabsContent>
          ))}
        </Tabs>

        <div className="flex justify-between pt-4">
          <Button variant="outline" onClick={() => setPhase('method')}>
            Back to Method
          </Button>
          <Button onClick={() => {
            props.updateHealthScore(15);
            props.onNext();
          }}>
            Save & Continue
          </Button>
        </div>
      </div>
    </OnboardingLayout>
  );
}
