import { useState, useEffect, useRef } from 'react';
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
import { Bell, Zap, Shield, TrendingUp, AlertTriangle, Settings2, Loader2 } from 'lucide-react';
import { useForecastConfig, useUpsertForecastConfig, useReorderRules, useUpsertReorderRule } from '@/hooks/useOnboarding';
import { useIngredients } from '@/hooks/useIngredients';
import { useVendors } from '@/hooks/useVendors';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';

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

export function Step7Automation(props: StepProps) {
  const { toast } = useToast();
  const [phase, setPhase] = useState<'settings' | 'pars'>('settings');
  const [isSaving, setIsSaving] = useState(false);
  
  const isLocalUpdateRef = useRef(false);

  // Automation settings
  const [autoAlert, setAutoAlert] = useState(true);
  const [autoGeneratePO, setAutoGeneratePO] = useState(true);
  const [requireApproval, setRequireApproval] = useState(true);
  const [safetyBuffer, setSafetyBuffer] = useState('medium');
  const [forecastHorizon, setForecastHorizon] = useState('7');

  // Par levels
  const [parLevels, setParLevels] = useState<Record<string, { reorderPoint: number; par: number; vendorId?: string }>>({});

  const { data: forecastConfig, refetch: refetchConfig } = useForecastConfig(props.restaurantId || undefined);
  const { data: reorderRules, refetch: refetchRules } = useReorderRules(props.restaurantId || undefined);
  const { data: ingredients } = useIngredients();
  const { data: vendors } = useVendors();
  const upsertForecastConfig = useUpsertForecastConfig();
  const upsertReorderRule = useUpsertReorderRule();

  // Get top ingredients for par level setup
  const topIngredients = ingredients?.slice(0, 6) || [];

  // Initialize from existing data
  useEffect(() => {
    if (forecastConfig) {
      setAutoAlert(forecastConfig.auto_alert ?? true);
      setAutoGeneratePO(forecastConfig.auto_generate_po ?? true);
      setRequireApproval(forecastConfig.require_approval ?? true);
      setForecastHorizon(String(forecastConfig.horizon_days ?? 7));
    }
  }, [forecastConfig]);

  useEffect(() => {
    if (reorderRules && reorderRules.length > 0) {
      const levels: Record<string, { reorderPoint: number; par: number; vendorId?: string }> = {};
      reorderRules.forEach((rule: any) => {
        levels[rule.ingredient_id] = {
          reorderPoint: rule.reorder_point_qty || 0,
          par: rule.par_qty || 0,
          vendorId: rule.preferred_vendor_id || undefined,
        };
      });
      setParLevels(prev => ({ ...prev, ...levels }));
    }
  }, [reorderRules]);

  // Initialize par levels for ingredients without rules
  useEffect(() => {
    if (topIngredients.length > 0) {
      setParLevels(prev => {
        const newLevels = { ...prev };
        topIngredients.forEach(ing => {
          if (!newLevels[ing.id]) {
            newLevels[ing.id] = {
              reorderPoint: ing.reorder_point || 5,
              par: ing.par_level || 15,
            };
          }
        });
        return newLevels;
      });
    }
  }, [topIngredients]);

  // Real-time sync for forecast config
  useEffect(() => {
    if (!props.restaurantId) return;

    const channel = supabase
      .channel('automation-realtime')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'forecast_configs',
          filter: `restaurant_id=eq.${props.restaurantId}`,
        },
        (payload) => {
          if (isLocalUpdateRef.current) {
            isLocalUpdateRef.current = false;
            return;
          }
          console.log('Forecast config realtime update:', payload);
          refetchConfig();
        }
      )
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'reorder_rules',
          filter: `restaurant_id=eq.${props.restaurantId}`,
        },
        (payload) => {
          if (isLocalUpdateRef.current) {
            isLocalUpdateRef.current = false;
            return;
          }
          console.log('Reorder rules realtime update:', payload);
          refetchRules();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [props.restaurantId, refetchConfig, refetchRules]);

  const handleSaveSettings = async () => {
    if (!props.restaurantId) return;
    
    setIsSaving(true);
    isLocalUpdateRef.current = true;
    
    try {
      await upsertForecastConfig.mutateAsync({
        restaurant_id: props.restaurantId,
        auto_alert: autoAlert,
        auto_generate_po: autoGeneratePO,
        require_approval: requireApproval,
        horizon_days: parseInt(forecastHorizon),
        method: 'DOW_AVG',
      });
      
      toast({
        title: 'Settings saved',
        description: 'Automation settings have been configured',
      });
      
      setPhase('pars');
    } catch (error) {
      console.error('Failed to save settings:', error);
      isLocalUpdateRef.current = false;
      toast({
        title: 'Save failed',
        description: 'Please try again',
        variant: 'destructive',
      });
    } finally {
      setIsSaving(false);
    }
  };

  const handleSaveParLevels = async () => {
    if (!props.restaurantId) return;
    
    setIsSaving(true);
    isLocalUpdateRef.current = true;
    
    try {
      // Save all par levels
      const promises = Object.entries(parLevels).map(([ingredientId, levels]) => 
        upsertReorderRule.mutateAsync({
          restaurant_id: props.restaurantId!,
          ingredient_id: ingredientId,
          reorder_point_qty: levels.reorderPoint,
          par_qty: levels.par,
          preferred_vendor_id: levels.vendorId,
          safety_buffer_level: safetyBuffer,
        })
      );
      
      await Promise.all(promises);
      
      props.updateHealthScore(10);
      toast({
        title: 'Par levels saved',
        description: 'Reorder rules have been configured',
      });
      
      props.onNext();
    } catch (error) {
      console.error('Failed to save par levels:', error);
      isLocalUpdateRef.current = false;
      toast({
        title: 'Save failed',
        description: 'Please try again',
        variant: 'destructive',
      });
    } finally {
      setIsSaving(false);
    }
  };

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

          <Button onClick={handleSaveSettings} className="w-full" size="lg" disabled={isSaving}>
            {isSaving ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Saving...
              </>
            ) : (
              'Continue to Par Levels'
            )}
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
                        onChange={(e) => updateParLevel(ingredient.id, 'reorderPoint', parseFloat(e.target.value) || 0)}
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
                        onChange={(e) => updateParLevel(ingredient.id, 'par', parseFloat(e.target.value) || 0)}
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
                        {vendors?.map(vendor => (
                          <SelectItem key={vendor.id} value={vendor.id}>{vendor.name}</SelectItem>
                        ))}
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
          <Button onClick={handleSaveParLevels} disabled={isSaving}>
            {isSaving ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Saving...
              </>
            ) : (
              'Save & Continue'
            )}
          </Button>
        </div>
      </div>
    </OnboardingLayout>
  );
}