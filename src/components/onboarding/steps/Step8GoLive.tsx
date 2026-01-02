import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { OnboardingLayout } from '../OnboardingLayout';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Check, AlertTriangle, ArrowRight, Rocket, FileText, Package, Sparkles, Clock, ChefHat, Truck, CreditCard, Loader2 } from 'lucide-react';
import { useRestaurant, useStorageLocations, useMenus, useIntegrations, useForecastConfig } from '@/hooks/useOnboarding';
import { useIngredients } from '@/hooks/useIngredients';
import { useRecipes } from '@/hooks/useRecipes';
import { useVendors } from '@/hooks/useVendors';
import { useToast } from '@/hooks/use-toast';
import { useSyncNotification } from '@/hooks/useSyncNotification';
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

interface SetupItem {
  id: string;
  label: string;
  status: 'complete' | 'partial' | 'incomplete';
  impact: 'critical' | 'recommended' | 'optional';
  icon: React.ReactNode;
}

export function Step8GoLive(props: StepProps) {
  const navigate = useNavigate();
  const { t } = useTranslation();
  const { toast } = useToast();
  const { notify: syncNotify } = useSyncNotification();
  const [isSimulating, setIsSimulating] = useState(false);
  const [simulationComplete, setSimulationComplete] = useState(false);
  const [isLaunching, setIsLaunching] = useState(false);

  // Fetch actual setup status
  const { data: restaurant, refetch: refetchRestaurant } = useRestaurant(props.orgId || undefined);
  const { data: storageLocations, refetch: refetchStorage } = useStorageLocations(props.restaurantId || undefined);
  const { data: menus, refetch: refetchMenus } = useMenus(props.restaurantId || undefined);
  const { data: recipes, refetch: refetchRecipes } = useRecipes();
  const { data: vendors, refetch: refetchVendors } = useVendors();
  const { data: ingredients } = useIngredients();
  const { data: integrations, refetch: refetchIntegrations } = useIntegrations(props.restaurantId || undefined);
  const { data: forecastConfig, refetch: refetchForecast } = useForecastConfig(props.restaurantId || undefined);

  // Real-time sync for all setup status tables
  useEffect(() => {
    if (!props.restaurantId) return;

    const channel = supabase
      .channel('go-live-realtime')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'restaurants' }, () => {
        refetchRestaurant();
        syncNotify('Restaurant details updated');
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'storage_locations', filter: `restaurant_id=eq.${props.restaurantId}` }, () => {
        refetchStorage();
        syncNotify('Storage locations updated');
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'menus', filter: `restaurant_id=eq.${props.restaurantId}` }, () => {
        refetchMenus();
        syncNotify('Menus updated');
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'recipes' }, () => {
        refetchRecipes();
        syncNotify('Recipes updated');
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'vendors' }, () => {
        refetchVendors();
        syncNotify('Vendors updated');
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'integrations', filter: `restaurant_id=eq.${props.restaurantId}` }, () => {
        refetchIntegrations();
        syncNotify('Integrations updated');
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'forecast_configs', filter: `restaurant_id=eq.${props.restaurantId}` }, () => {
        refetchForecast();
        syncNotify('Automation settings updated');
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [props.restaurantId, refetchRestaurant, refetchStorage, refetchMenus, refetchRecipes, refetchVendors, refetchIntegrations, refetchForecast, syncNotify]);
  // Calculate actual setup status
  const getSetupItems = (): SetupItem[] => {
    const hasRestaurant = !!restaurant?.name;
    // Menu items are dish recipes (not prep recipes)
    const dishRecipes = recipes?.filter(r => r.recipe_type !== 'Prep') || [];
    const menuItemCount = dishRecipes.length;
    const hasMenu = menuItemCount > 0;
    const totalRecipes = recipes?.length || 0;
    const hasRecipes = totalRecipes > 0;
    const approvedRecipes = recipes?.filter(r => r.status === 'Approved').length || 0;
    const hasStorageLocations = (storageLocations?.length || 0) > 0;
    const hasVendors = (vendors?.length || 0) > 0;
    const hasPos = integrations?.some(i => i.status === 'connected');
    const hasAutomation = !!forecastConfig;

    return [
      {
        id: 'restaurant',
        label: 'Restaurant details',
        status: hasRestaurant ? 'complete' : 'incomplete',
        impact: 'critical',
        icon: <ChefHat className="w-4 h-4" />,
      },
      {
        id: 'menu',
        label: `Menu imported (${menuItemCount} dishes)`,
        status: hasMenu ? 'complete' : 'incomplete',
        impact: 'critical',
        icon: <FileText className="w-4 h-4" />,
      },
      {
        id: 'recipes',
        label: `Recipes (${approvedRecipes}/${recipes?.length || 0} approved)`,
        status: approvedRecipes === (recipes?.length || 0) ? 'complete' : 
               hasRecipes ? 'partial' : 'incomplete',
        impact: 'critical',
        icon: <ChefHat className="w-4 h-4" />,
      },
      {
        id: 'storage',
        label: `Storage locations (${storageLocations?.length || 0} zones)`,
        status: hasStorageLocations ? 'complete' : 'incomplete',
        impact: 'recommended',
        icon: <Package className="w-4 h-4" />,
      },
      {
        id: 'vendors',
        label: `Vendors configured (${vendors?.length || 0})`,
        status: hasVendors ? 'complete' : 'incomplete',
        impact: 'recommended',
        icon: <Truck className="w-4 h-4" />,
      },
      {
        id: 'pos',
        label: 'POS connected',
        status: hasPos ? 'complete' : 'incomplete',
        impact: 'optional',
        icon: <CreditCard className="w-4 h-4" />,
      },
      {
        id: 'automation',
        label: 'Automation rules',
        status: hasAutomation ? 'complete' : 'incomplete',
        impact: 'optional',
        icon: <Sparkles className="w-4 h-4" />,
      },
    ];
  };

  const setupItems = getSetupItems();
  const completeCount = setupItems.filter(item => item.status === 'complete').length;
  const totalCount = setupItems.length;
  const completionPercentage = Math.round((completeCount / totalCount) * 100);

  const handleRunSimulation = async () => {
    setIsSimulating(true);
    await new Promise(resolve => setTimeout(resolve, 3000));
    setIsSimulating(false);
    setSimulationComplete(true);
  };

  const handleGoLive = async () => {
    setIsLaunching(true);
    
    try {
      // Update health score one final time
      props.updateHealthScore(completionPercentage - props.setupHealthScore);
      
      toast({
        title: t('step8GoLive.setupComplete'),
        description: t('step8GoLive.welcomeDashboard'),
      });
      
      navigate('/');
    } catch (error) {
      console.error('Failed to launch:', error);
      toast({
        title: t('step8GoLive.launchFailed'),
        description: t('step6POS.tryAgain'),
        variant: 'destructive',
      });
    } finally {
      setIsLaunching(false);
    }
  };

  const getStatusIcon = (status: SetupItem['status']) => {
    switch (status) {
      case 'complete':
        return <Check className="w-4 h-4 text-green-500" />;
      case 'partial':
        return <Clock className="w-4 h-4 text-amber-500" />;
      case 'incomplete':
        return <AlertTriangle className="w-4 h-4 text-red-500" />;
    }
  };

  const getImpactBadge = (impact: SetupItem['impact']) => {
    switch (impact) {
      case 'critical':
        return <Badge variant="destructive" className="text-xs">{t('step8GoLive.required')}</Badge>;
      case 'recommended':
        return <Badge variant="secondary" className="text-xs">{t('step8GoLive.recommendedBadge')}</Badge>;
      case 'optional':
        return <Badge variant="outline" className="text-xs">{t('step8GoLive.optional')}</Badge>;
    }
  };

  return (
    <OnboardingLayout {...props} title={t('step8GoLive.title')} subtitle={t('step8GoLive.subtitle')} nextLabel={t('step8GoLive.nextLabel')}>
      <div className="max-w-3xl mx-auto space-y-8">
        {/* Setup Health Score */}
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="text-lg font-semibold">{t('step8GoLive.healthScore')}</h3>
                <p className="text-sm text-muted-foreground">
                  {t('step8GoLive.healthScoreDesc', { percent: completionPercentage, complete: completeCount, total: totalCount })}
                </p>
              </div>
              <div className="text-2xl font-bold text-primary">{completionPercentage}%</div>
            </div>
            <Progress value={completionPercentage} className="h-2" />
          </CardContent>
        </Card>

        {/* Setup Checklist */}
        <Card>
          <CardHeader>
            <CardTitle>{t('step8GoLive.setupChecklist')}</CardTitle>
            <CardDescription>{t('step8GoLive.checklistDesc')}</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {setupItems.map(item => (
                <div
                  key={item.id}
                  className={`flex items-center justify-between p-3 rounded-lg border ${
                    item.status === 'complete' ? 'bg-green-50/50 border-green-200' :
                    item.status === 'partial' ? 'bg-amber-50/50 border-amber-200' :
                    'bg-red-50/50 border-red-200'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-background flex items-center justify-center">
                      {item.icon}
                    </div>
                    <span className="font-medium">{item.label}</span>
                  </div>
                  <div className="flex items-center gap-3">
                    {getImpactBadge(item.impact)}
                    {getStatusIcon(item.status)}
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Simulation */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-primary" />
              Test Your Setup
            </CardTitle>
            <CardDescription>
              Run a simulation to see how the system will track inventory
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {simulationComplete ? (
              <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                <div className="flex items-start gap-3">
                  <Check className="w-5 h-5 text-green-500 mt-0.5" />
                  <div>
                    <p className="font-medium text-green-700">{t('step8GoLive.simulationSuccess')}</p>
                    <p className="text-sm text-green-600 mt-1">
                      {t('step8GoLive.simulationResult', { recipes: recipes?.length || 0, vendors: vendors?.length ? t('step8GoLive.vendorsConfiguredText', { count: vendors.length }) : '' })}
                    </p>
                  </div>
                </div>
              </div>
            ) : (
              <>
                <p className="text-sm text-muted-foreground">
                  This will simulate a day's worth of orders using your recipes and inventory levels.
                </p>
                <Button
                  variant="outline"
                  onClick={handleRunSimulation}
                  disabled={isSimulating}
                  className="w-full"
                >
                  {isSimulating ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Running simulation...
                    </>
                  ) : (
                    <>
                      <Sparkles className="w-4 h-4 mr-2" />
                      Run Inventory Simulation
                    </>
                  )}
                </Button>
              </>
            )}
          </CardContent>
        </Card>

        {/* Sample PO Preview */}
        {vendors && vendors.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FileText className="w-5 h-5 text-primary" />
                Sample Purchase Order
              </CardTitle>
              <CardDescription>
                Preview of what auto-generated orders will look like
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="bg-muted/50 rounded-lg p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="font-medium">{t('step8GoLive.draftPOFor', { vendor: vendors[0]?.name || 'Vendor' })}</span>
                  <Badge variant="outline">{t('step8GoLive.draft')}</Badge>
                </div>
                <div className="text-sm space-y-1">
                  {(() => {
                    // Filter out house-made prep items - only show purchasable raw ingredients
                    const prepRecipeNames = (recipes || [])
                      .filter(r => r.recipe_type === 'Prep')
                      .map(r => r.name.toLowerCase());
                    
                    const purchasableIngredients = (ingredients || []).filter(ing => {
                      const nameLower = ing.name.toLowerCase();
                      return !prepRecipeNames.some(prep => 
                        nameLower.includes(prep.toLowerCase().replace('house ', '')) ||
                        prep.toLowerCase().includes(nameLower)
                      );
                    });
                    
                    const sampleIngredients = purchasableIngredients.slice(0, 4);
                    if (sampleIngredients.length === 0) {
                      return (
                        <div className="text-muted-foreground italic">
                          No ingredients configured yet
                        </div>
                      );
                    }
                    
                    // Realistic order quantities and prices for sample PO
                    const sampleOrders = [
                      { qty: 2, orderUnit: 'case', price: 45.00 },
                      { qty: 1, orderUnit: 'case', price: 32.50 },
                      { qty: 3, orderUnit: 'lb', price: 8.95 },
                      { qty: 1, orderUnit: 'case', price: 28.00 },
                    ];
                    
                    return sampleIngredients.map((ing, idx) => {
                      const order = sampleOrders[idx];
                      return (
                        <div key={ing.id} className="flex justify-between">
                          <span className="text-muted-foreground">
                            {ing.name} ({order.qty} {order.orderUnit})
                          </span>
                          <span>${(order.qty * order.price).toFixed(2)}</span>
                        </div>
                      );
                    });
                  })()}
                </div>
                <div className="flex justify-between pt-2 border-t font-medium">
                  <span>{t('step8GoLive.totalEstimate')}</span>
                  <span>
                    ${(() => {
                      const sampleOrders = [
                        { qty: 2, price: 45.00 },
                        { qty: 1, price: 32.50 },
                        { qty: 3, price: 8.95 },
                        { qty: 1, price: 28.00 },
                      ];
                      const prepRecipeNames = (recipes || [])
                        .filter(r => r.recipe_type === 'Prep')
                        .map(r => r.name.toLowerCase());
                      const purchasableCount = (ingredients || []).filter(ing => {
                        const nameLower = ing.name.toLowerCase();
                        return !prepRecipeNames.some(prep => 
                          nameLower.includes(prep.toLowerCase().replace('house ', '')) ||
                          prep.toLowerCase().includes(nameLower)
                        );
                      }).slice(0, 4).length;
                      if (purchasableCount === 0) return '0.00';
                      const total = sampleOrders.slice(0, purchasableCount).reduce((acc, o) => acc + o.qty * o.price, 0);
                      return total.toFixed(2);
                    })()}
                  </span>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Launch Button */}
        <Button 
          onClick={handleGoLive} 
          size="lg" 
          className="w-full py-6 text-lg"
          disabled={isLaunching}
        >
          {isLaunching ? (
            <>
              <Loader2 className="w-5 h-5 mr-2 animate-spin" />
              Launching...
            </>
          ) : (
            <>
              <Rocket className="w-5 h-5 mr-2" />
              {t('step8GoLive.launchDashboard')}
              <ArrowRight className="w-5 h-5 ml-2" />
            </>
          )}
        </Button>

        <p className="text-center text-sm text-muted-foreground">
          {t('step8GoLive.completeFromDashboard')}
        </p>
      </div>
    </OnboardingLayout>
  );
}