import { useState } from 'react';
import { OnboardingLayout } from '../OnboardingLayout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Bell, Zap, Shield, Clock, TrendingUp, AlertTriangle, Settings2 } from 'lucide-react';

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

// Mock top ingredients for par level setup
const topIngredients = [
  { id: '1', name: 'Fresh Mozzarella', unit: 'kg', suggestedReorder: 5, suggestedPar: 15 },
  { id: '2', name: 'San Marzano Tomatoes', unit: 'cans', suggestedReorder: 10, suggestedPar: 30 },
  { id: '3', name: 'Olive Oil', unit: 'L', suggestedReorder: 3, suggestedPar: 10 },
  { id: '4', name: 'Salmon Fillet', unit: 'kg', suggestedReorder: 4, suggestedPar: 12 },
  { id: '5', name: 'Romaine Lettuce', unit: 'heads', suggestedReorder: 8, suggestedPar: 20 },
  { id: '6', name: 'Pizza Dough', unit: 'portions', suggestedReorder: 20, suggestedPar: 50 },
];

export function Step7Automation(props: StepProps) {
  const [phase, setPhase] = useState<'settings' | 'pars'>('settings');
  
  // Automation settings
  const [autoAlert, setAutoAlert] = useState(true);
  const [autoGeneratePO, setAutoGeneratePO] = useState(true);
  const [requireApproval, setRequireApproval] = useState(true);
  const [safetyBuffer, setSafetyBuffer] = useState('medium');
  const [forecastHorizon, setForecastHorizon] = useState('7');

  // Par levels
  const [parLevels, setParLevels] = useState<Record<string, { reorderPoint: number; par: number; vendorId?: string }>>(
    Object.fromEntries(
      topIngredients.map(ing => [ing.id, { reorderPoint: ing.suggestedReorder, par: ing.suggestedPar }])
    )
  );

  const updateParLevel = (ingredientId: string, field: 'reorderPoint' | 'par' | 'vendorId', value: any) => {
    setParLevels(prev => ({
      ...prev,
      [ingredientId]: { ...prev[ingredientId], [field]: value },
    }));
  };

  if (phase === 'settings') {
    return (
      <OnboardingLayout {...props} title="Set Your Autopilot" subtitle="Configure alerts and automation rules">
        <div className="max-w-2xl mx-auto space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Bell className="w-5 h-5 text-primary" />
                Alert Settings
              </CardTitle>
              <CardDescription>
                Get notified when inventory needs attention
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between py-2">
                <div>
                  <Label className="font-medium">Low stock alerts</Label>
                  <p className="text-sm text-muted-foreground">
                    Alert when projected to go below reorder point
                  </p>
                </div>
                <Switch checked={autoAlert} onCheckedChange={setAutoAlert} />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Zap className="w-5 h-5 text-primary" />
                Auto-Ordering
              </CardTitle>
              <CardDescription>
                Automatically generate purchase orders
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between py-2">
                <div>
                  <Label className="font-medium">Auto-generate draft POs</Label>
                  <p className="text-sm text-muted-foreground">
                    Create order drafts when items need restocking
                  </p>
                </div>
                <Switch checked={autoGeneratePO} onCheckedChange={setAutoGeneratePO} />
              </div>

              <div className="flex items-center justify-between py-2 border-t pt-4">
                <div>
                  <Label className="font-medium">Require approval before sending</Label>
                  <p className="text-sm text-muted-foreground">
                    Always review orders before they're sent to vendors
                  </p>
                </div>
                <Switch checked={requireApproval} onCheckedChange={setRequireApproval} />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Shield className="w-5 h-5 text-primary" />
                Safety Buffer
              </CardTitle>
              <CardDescription>
                How much extra stock to keep on hand
              </CardDescription>
            </CardHeader>
            <CardContent>
              <RadioGroup value={safetyBuffer} onValueChange={setSafetyBuffer} className="space-y-3">
                <div className="flex items-center space-x-3 p-3 border rounded-lg hover:bg-muted/50">
                  <RadioGroupItem value="low" id="low" />
                  <div className="flex-1">
                    <Label htmlFor="low" className="font-medium cursor-pointer">Low</Label>
                    <p className="text-sm text-muted-foreground">Minimal buffer, higher risk of stockouts</p>
                  </div>
                  <Badge variant="outline">-10%</Badge>
                </div>
                <div className="flex items-center space-x-3 p-3 border rounded-lg bg-primary/5 border-primary/20">
                  <RadioGroupItem value="medium" id="medium" />
                  <div className="flex-1">
                    <Label htmlFor="medium" className="font-medium cursor-pointer">Medium</Label>
                    <p className="text-sm text-muted-foreground">Balanced approach for most operations</p>
                  </div>
                  <Badge>Recommended</Badge>
                </div>
                <div className="flex items-center space-x-3 p-3 border rounded-lg hover:bg-muted/50">
                  <RadioGroupItem value="high" id="high" />
                  <div className="flex-1">
                    <Label htmlFor="high" className="font-medium cursor-pointer">High</Label>
                    <p className="text-sm text-muted-foreground">Extra cushion, higher carrying costs</p>
                  </div>
                  <Badge variant="outline">+20%</Badge>
                </div>
              </RadioGroup>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <TrendingUp className="w-5 h-5 text-primary" />
                Forecast Horizon
              </CardTitle>
              <CardDescription>
                How far ahead to project inventory needs
              </CardDescription>
            </CardHeader>
            <CardContent>
              <RadioGroup value={forecastHorizon} onValueChange={setForecastHorizon} className="flex gap-4">
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="3" id="3days" />
                  <Label htmlFor="3days">3 days</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="7" id="7days" />
                  <Label htmlFor="7days">7 days</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="14" id="14days" />
                  <Label htmlFor="14days">14 days</Label>
                </div>
              </RadioGroup>
            </CardContent>
          </Card>

          <Button onClick={() => setPhase('pars')} className="w-full" size="lg">
            Continue to Par Levels
          </Button>
        </div>
      </OnboardingLayout>
    );
  }

  return (
    <OnboardingLayout {...props} title="Set Par Levels & Reorder Points" subtitle="Configure stocking targets for your top ingredients">
      <div className="space-y-6">
        <div className="bg-muted/50 rounded-lg p-4 text-sm text-muted-foreground flex items-start gap-2">
          <Settings2 className="w-4 h-4 mt-0.5 shrink-0" />
          <div>
            <p className="font-medium text-foreground">AI-suggested levels based on your menu</p>
            <p>These are starting points—adjust based on your actual usage patterns.</p>
          </div>
        </div>

        <Card>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Ingredient</TableHead>
                <TableHead className="text-center">
                  <div className="flex items-center justify-center gap-1">
                    <AlertTriangle className="w-4 h-4 text-amber-500" />
                    Reorder Point
                  </div>
                </TableHead>
                <TableHead className="text-center">
                  <div className="flex items-center justify-center gap-1">
                    <TrendingUp className="w-4 h-4 text-green-500" />
                    Par Level
                  </div>
                </TableHead>
                <TableHead>Preferred Vendor</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {topIngredients.map(ingredient => (
                <TableRow key={ingredient.id}>
                  <TableCell>
                    <div>
                      <span className="font-medium">{ingredient.name}</span>
                      <p className="text-xs text-muted-foreground">{ingredient.unit}</p>
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center justify-center gap-2">
                      <Input
                        type="number"
                        className="w-20 text-center"
                        value={parLevels[ingredient.id]?.reorderPoint || ''}
                        onChange={(e) => updateParLevel(ingredient.id, 'reorderPoint', parseFloat(e.target.value))}
                      />
                      <span className="text-sm text-muted-foreground">{ingredient.unit}</span>
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center justify-center gap-2">
                      <Input
                        type="number"
                        className="w-20 text-center"
                        value={parLevels[ingredient.id]?.par || ''}
                        onChange={(e) => updateParLevel(ingredient.id, 'par', parseFloat(e.target.value))}
                      />
                      <span className="text-sm text-muted-foreground">{ingredient.unit}</span>
                    </div>
                  </TableCell>
                  <TableCell>
                    <Select
                      value={parLevels[ingredient.id]?.vendorId || ''}
                      onValueChange={(value) => updateParLevel(ingredient.id, 'vendorId', value)}
                    >
                      <SelectTrigger className="w-40">
                        <SelectValue placeholder="Select..." />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="sysco">Sysco</SelectItem>
                        <SelectItem value="usfoods">US Foods</SelectItem>
                        <SelectItem value="local">Local Supplier</SelectItem>
                      </SelectContent>
                    </Select>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </Card>

        <div className="flex justify-between">
          <Button variant="outline" onClick={() => setPhase('settings')}>
            Back to Settings
          </Button>
          <Button onClick={() => {
            props.updateHealthScore(10);
            props.onNext();
          }}>
            Save & Continue
          </Button>
        </div>
      </div>
    </OnboardingLayout>
  );
}
