import { useState } from 'react';
import { OnboardingLayout } from '../OnboardingLayout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Warehouse, Snowflake, Package, Wine, Coffee, Plus, Trash2, Upload, ListChecks, FileSpreadsheet } from 'lucide-react';

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

const defaultStorageLocations = [
  { id: '1', name: 'Walk-in Cooler', icon: Warehouse, color: 'text-blue-500' },
  { id: '2', name: 'Freezer', icon: Snowflake, color: 'text-cyan-500' },
  { id: '3', name: 'Dry Storage', icon: Package, color: 'text-amber-500' },
  { id: '4', name: 'Bar', icon: Wine, color: 'text-purple-500' },
  { id: '5', name: 'Coffee Station', icon: Coffee, color: 'text-orange-500' },
];

// Mock ingredients for inventory count
const mockIngredients = [
  { id: '1', name: 'Fresh Mozzarella', category: 'Dairy', unit: 'kg', suggested: true, storageId: '1' },
  { id: '2', name: 'San Marzano Tomatoes', category: 'Canned Goods', unit: 'cans', suggested: true, storageId: '3' },
  { id: '3', name: 'Olive Oil', category: 'Oils', unit: 'L', suggested: true, storageId: '3' },
  { id: '4', name: 'Fresh Basil', category: 'Herbs', unit: 'bunch', suggested: true, storageId: '1' },
  { id: '5', name: 'Pizza Dough', category: 'Prepared', unit: 'portions', suggested: true, storageId: '1' },
  { id: '6', name: 'Parmesan', category: 'Dairy', unit: 'kg', suggested: true, storageId: '1' },
  { id: '7', name: 'Romaine Lettuce', category: 'Produce', unit: 'heads', suggested: true, storageId: '1' },
  { id: '8', name: 'Salmon Fillet', category: 'Seafood', unit: 'kg', suggested: true, storageId: '2' },
  { id: '9', name: 'Butter', category: 'Dairy', unit: 'kg', suggested: true, storageId: '1' },
  { id: '10', name: 'Lemons', category: 'Produce', unit: 'pieces', suggested: false, storageId: '1' },
];

export function Step4StorageSetup(props: StepProps) {
  const [phase, setPhase] = useState<'storage' | 'method' | 'count'>('storage');
  const [storageLocations, setStorageLocations] = useState(defaultStorageLocations);
  const [newLocationName, setNewLocationName] = useState('');
  const [selectedMethod, setSelectedMethod] = useState<string | null>(null);
  const [activeStorageTab, setActiveStorageTab] = useState('1');
  const [inventoryCounts, setInventoryCounts] = useState<Record<string, number>>({});
  const [notStocked, setNotStocked] = useState<string[]>([]);

  const addStorageLocation = () => {
    if (newLocationName.trim()) {
      setStorageLocations([
        ...storageLocations,
        {
          id: Date.now().toString(),
          name: newLocationName.trim(),
          icon: Package,
          color: 'text-gray-500',
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
    mockIngredients.filter(ing => ing.storageId === storageId);

  const countedItems = Object.keys(inventoryCounts).length + notStocked.length;
  const totalItems = mockIngredients.length;

  if (phase === 'storage') {
    return (
      <OnboardingLayout {...props} title="Set Up Storage Locations" subtitle="Define where ingredients are stored">
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

          <Button onClick={() => setPhase('method')} className="w-full" size="lg">
            Continue to Inventory Count
          </Button>
        </div>
      </OnboardingLayout>
    );
  }

  if (phase === 'method') {
    return (
      <OnboardingLayout {...props} title="Baseline Inventory" subtitle="Choose how to enter your current inventory">
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
    <OnboardingLayout {...props} title="Guided Inventory Count" subtitle={`${countedItems} of ${totalItems} items counted`}>
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
                              {ingredient.suggested && (
                                <Badge variant="secondary" className="text-xs">Critical</Badge>
                              )}
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
