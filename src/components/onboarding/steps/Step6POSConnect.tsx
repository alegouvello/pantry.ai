import { useState, useEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { OnboardingLayout } from '../OnboardingLayout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { CreditCard, FileSpreadsheet, Check, AlertCircle, Link, ArrowRight, Search, Sparkles, RefreshCw, Loader2 } from 'lucide-react';
import { useIntegrations, useCreateIntegration } from '@/hooks/useOnboarding';
import { useRecipes } from '@/hooks/useRecipes';
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

// POS items will be derived from approved recipes for demo (would come from POS sync in production)
interface PosItem {
  id: string;
  name: string;
  category: string;
}

export function Step6POSConnect(props: StepProps) {
  const { t } = useTranslation();
  const { toast } = useToast();
  const { notify: syncNotify } = useSyncNotification();
  const [phase, setPhase] = useState<'select' | 'connect' | 'mapping'>('select');
  const [selectedIntegration, setSelectedIntegration] = useState<string | null>(null);
  const [isConnecting, setIsConnecting] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [mappings, setMappings] = useState<Record<string, string>>({});
  
  const isLocalUpdateRef = useRef(false);

  const { data: existingIntegrations, refetch: refetchIntegrations } = useIntegrations(props.restaurantId || undefined);
  const { data: recipes, refetch: refetchRecipes, isRefetching } = useRecipes();
  const createIntegration = useCreateIntegration();

  // Derive POS items from approved recipes (simulating what would come from real POS sync)
  // Deduplicate by name to avoid showing the same item multiple times
  const posItems: PosItem[] = (() => {
    const approvedRecipes = (recipes || []).filter(r => r.status === 'Approved');
    const seen = new Set<string>();
    return approvedRecipes
      .filter(r => {
        const key = r.name.toLowerCase();
        if (seen.has(key)) return false;
        seen.add(key);
        return true;
      })
      .map(r => ({
        id: `pos-${r.id}`,
        name: r.name,
        category: r.category,
      }));
  })();

  // Check if already connected
  const connectedIntegration = existingIntegrations?.find(i => i.status === 'connected');
  const isConnected = !!connectedIntegration;

  // Initialize state from existing data
  useEffect(() => {
    if (isConnected && phase === 'select') {
      setSelectedIntegration(connectedIntegration.type);
      setPhase('mapping');
    }
  }, [isConnected, connectedIntegration, phase]);

  // Real-time sync for integrations
  useEffect(() => {
    if (!props.restaurantId) return;

    const channel = supabase
      .channel('integrations-realtime')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'integrations',
          filter: `restaurant_id=eq.${props.restaurantId}`,
        },
        (payload) => {
          if (isLocalUpdateRef.current) {
            isLocalUpdateRef.current = false;
            return;
          }
          console.log('Integrations realtime update:', payload);
          refetchIntegrations();
          syncNotify('POS integration updated');
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [props.restaurantId, refetchIntegrations, syncNotify]);

  // Auto-map POS items to their corresponding recipes (since they're derived from recipes)
  useEffect(() => {
    if (posItems.length > 0 && recipes && recipes.length > 0) {
      const suggestions: Record<string, string> = {};
      posItems.forEach(posItem => {
        // Extract the original recipe ID from the POS item ID (pos-{recipeId})
        const recipeId = posItem.id.replace('pos-', '');
        const matchingRecipe = recipes.find(r => r.id === recipeId);
        if (matchingRecipe) {
          suggestions[posItem.id] = matchingRecipe.id;
        }
      });
      setMappings(prev => ({ ...suggestions, ...prev }));
    }
  }, [posItems, recipes]);

  const handleConnect = async () => {
    if (!props.restaurantId || !selectedIntegration) return;
    
    setIsConnecting(true);
    isLocalUpdateRef.current = true;
    
    try {
      await createIntegration.mutateAsync({
        restaurant_id: props.restaurantId,
        type: selectedIntegration,
        status: 'connected',
      });
      
      props.updateHealthScore(10);
      toast({
        title: t('step6POS.connectedSuccessTitle'),
        description: t('step6POS.connectedSuccess'),
      });
      
      setTimeout(() => setPhase('mapping'), 500);
    } catch (error) {
      console.error('Failed to create integration:', error);
      isLocalUpdateRef.current = false;
      toast({
        title: t('step6POS.connectionFailed'),
        description: t('step6POS.tryAgain'),
        variant: 'destructive',
      });
    } finally {
      setIsConnecting(false);
    }
  };

  const updateMapping = (posItemId: string, recipeId: string) => {
    setMappings(prev => ({ ...prev, [posItemId]: recipeId }));
  };

  const handleSaveAndContinue = async () => {
    // In production, would save POS recipe mappings here
    props.updateHealthScore(10);
    props.onNext();
  };

  const filteredPosItems = posItems.filter(item =>
    item.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const mappedCount = Object.values(mappings).filter(Boolean).length;
  const unmappedCount = posItems.length - mappedCount;

  if (phase === 'select') {
    return (
      <OnboardingLayout {...props} title={t('step6POS.title')} subtitle={t('step6POS.subtitle')}>
        <div className="max-w-2xl mx-auto space-y-6">
          <div className="grid gap-4">
            <Card
              className={`cursor-pointer transition-all hover:border-primary ${
                selectedIntegration === 'toast' ? 'border-primary bg-primary/5' : ''
              }`}
              onClick={() => setSelectedIntegration('toast')}
            >
              <CardContent className="flex items-start gap-4 py-6">
                <div className="w-14 h-14 rounded-lg bg-orange-500/10 flex items-center justify-center shrink-0">
                  <CreditCard className="w-7 h-7 text-orange-500" />
                </div>
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <h3 className="font-semibold">{t('step6POS.toastPOS')}</h3>
                    <Badge>{t('step6POS.recommended')}</Badge>
                  </div>
                  <p className="text-sm text-muted-foreground mt-1">
                    {t('step6POS.toastDesc')}
                  </p>
                  <div className="flex items-center gap-2 mt-3 text-xs text-muted-foreground">
                    <Check className="w-3 h-3 text-green-500" />
                    {t('step6POS.realTimeSync')}
                    <Check className="w-3 h-3 text-green-500 ml-2" />
                    {t('step6POS.menuImport')}
                    <Check className="w-3 h-3 text-green-500 ml-2" />
                    {t('step6POS.modifiers')}
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card
              className={`cursor-pointer transition-all hover:border-primary ${
                selectedIntegration === 'csv' ? 'border-primary bg-primary/5' : ''
              }`}
              onClick={() => setSelectedIntegration('csv')}
            >
              <CardContent className="flex items-start gap-4 py-6">
                <div className="w-14 h-14 rounded-lg bg-muted flex items-center justify-center shrink-0">
                  <FileSpreadsheet className="w-7 h-7 text-muted-foreground" />
                </div>
                <div className="flex-1">
                  <h3 className="font-semibold">{t('step6POS.csvImport')}</h3>
                  <p className="text-sm text-muted-foreground mt-1">
                    {t('step6POS.csvDesc')}
                  </p>
                  <p className="text-xs text-muted-foreground mt-3">
                    {t('step6POS.csvCompat')}
                  </p>
                </div>
              </CardContent>
            </Card>
          </div>

          <Button
            onClick={() => setPhase('connect')}
            className="w-full"
            size="lg"
            disabled={!selectedIntegration}
          >
            {t('step6POS.continue')}
          </Button>

          <Button variant="ghost" onClick={props.onNext} className="w-full text-muted-foreground">
            {t('step6POS.skipForNow')}
          </Button>
        </div>
      </OnboardingLayout>
    );
  }

  if (phase === 'connect') {
    return (
      <OnboardingLayout {...props} title={t('step6POS.connectTitle')} subtitle={t('step6POS.connectSubtitle')}>
        <div className="max-w-lg mx-auto space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <CreditCard className="w-5 h-5 text-orange-500" />
                {selectedIntegration === 'toast' ? t('step6POS.toastIntegration') : t('step6POS.csvImportTitle')}
              </CardTitle>
              <CardDescription>
                {selectedIntegration === 'toast' 
                  ? t('step6POS.toastAccessDesc')
                  : t('step6POS.csvSetupDesc')}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {isConnected ? (
                <div className="flex items-center gap-3 p-4 bg-green-500/10 rounded-lg">
                  <Check className="w-5 h-5 text-green-500" />
                  <div>
                    <p className="font-medium text-green-700">{t('step6POS.connectedSuccess')}</p>
                    <p className="text-sm text-green-600">{t('step6POS.foundItems', { count: posItems.length })}</p>
                  </div>
                </div>
              ) : (
                <>
                  <div className="space-y-3">
                    <div className="flex items-center gap-2 text-sm">
                      <Check className="w-4 h-4 text-green-500" />
                      {t('step6POS.viewMenu')}
                    </div>
                    <div className="flex items-center gap-2 text-sm">
                      <Check className="w-4 h-4 text-green-500" />
                      {t('step6POS.readSales')}
                    </div>
                    <div className="flex items-center gap-2 text-sm">
                      <Check className="w-4 h-4 text-green-500" />
                      {t('step6POS.accessModifiers')}
                    </div>
                  </div>

                  <div className="border-t pt-4">
                    <p className="text-sm text-muted-foreground mb-4">
                      Click below to authorize. You'll be redirected back after.
                    </p>
                    <Button onClick={handleConnect} className="w-full" disabled={isConnecting}>
                      {isConnecting ? (
                        <>
                          <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                          Connecting...
                        </>
                      ) : (
                        <>
                          <Link className="w-4 h-4 mr-2" />
                          {t('step6POS.connectTo', { name: selectedIntegration === 'toast' ? 'Toast' : 'CSV Import' })}
                        </>
                      )}
                    </Button>
                  </div>
                </>
              )}
            </CardContent>
          </Card>

          {isConnected && (
            <Button onClick={() => setPhase('mapping')} className="w-full" size="lg">
              Continue to Recipe Mapping
              <ArrowRight className="w-4 h-4 ml-2" />
            </Button>
          )}
        </div>
      </OnboardingLayout>
    );
  }

  return (
    <OnboardingLayout
      {...props}
      title="Map POS Items to Recipes"
      subtitle={`${mappedCount} mapped, ${unmappedCount} need attention`}
    >
      <div className="space-y-6">
        <div className="flex items-center gap-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              className="pl-10"
              placeholder="Search POS items..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={() => refetchRecipes()}
            disabled={isRefetching}
          >
            <RefreshCw className={`w-4 h-4 mr-2 ${isRefetching ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
          <Badge variant="outline" className="whitespace-nowrap">
            <Sparkles className="w-3 h-3 mr-1" />
            AI-suggested mappings applied
          </Badge>
        </div>

        <Card>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{t('step6POS.posItem')}</TableHead>
                <TableHead>{t('step6POS.category')}</TableHead>
                <TableHead>{t('step6POS.mappedRecipe')}</TableHead>
                <TableHead className="w-24">{t('step6POS.status')}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredPosItems.map(posItem => {
                const currentMapping = mappings[posItem.id];
                const isUnmapped = !currentMapping;

                return (
                  <TableRow key={posItem.id} className={isUnmapped ? 'bg-amber-50/50' : ''}>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <span className="font-medium">{posItem.name}</span>
                        {isUnmapped && (
                          <AlertCircle className="w-4 h-4 text-amber-500" />
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant="secondary">{posItem.category}</Badge>
                    </TableCell>
                    <TableCell>
                      <Select
                        value={currentMapping || 'unmapped'}
                        onValueChange={(value) => updateMapping(posItem.id, value === 'unmapped' ? '' : value)}
                      >
                        <SelectTrigger className="w-56">
                          <SelectValue placeholder={t('step6POS.selectRecipe')} />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="unmapped">{t('step6POS.unmapped')}</SelectItem>
                          {recipes?.filter(r => r.id).map(recipe => (
                            <SelectItem key={recipe.id} value={recipe.id}>{recipe.name}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </TableCell>
                    <TableCell>
                      {currentMapping ? (
                        <Badge variant="default">{t('step6POS.mapped')}</Badge>
                      ) : (
                        <Badge variant="outline">{t('step6POS.pending')}</Badge>
                      )}
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </Card>

        {/* Test Sync Preview - shows actual mapped recipes with their ingredients */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">{t('step6POS.testSync')}</CardTitle>
            <CardDescription>
              {t('step6POS.testSyncDesc')}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="bg-muted/50 rounded-lg p-4 text-sm">
              <p className="font-medium mb-2">{t('step6POS.sampleOrder', { id: '1234' })}</p>
              <ul className="space-y-1 text-muted-foreground">
                {(() => {
                  // Get first 2 mapped recipes to show as sample
                  const mappedRecipeIds = Object.values(mappings).filter(Boolean).slice(0, 2);
                  if (mappedRecipeIds.length === 0) {
                    return <li className="text-muted-foreground italic">Map recipes above to see inventory impact</li>;
                  }
                  return mappedRecipeIds.map((recipeId, idx) => {
                    const recipe = recipes?.find(r => r.id === recipeId);
                    if (!recipe) return null;
                    const qty = idx === 0 ? 1 : 2;
                    const ingredients = recipe.recipe_ingredients?.slice(0, 3) || [];
                    const ingredientText = ingredients.length > 0
                      ? ingredients.map(ri => `-${ri.quantity * qty}${ri.unit} ${ri.ingredients?.name || 'ingredient'}`).join(', ')
                      : 'no ingredients';
                    return (
                      <li key={recipeId}>
                        • {qty}x {recipe.name} → {ingredientText}
                      </li>
                    );
                  });
                })()}
              </ul>
            </div>
          </CardContent>
        </Card>

        <div className="flex justify-between">
          <Button variant="outline" onClick={() => setPhase('connect')}>
            Back
          </Button>
          <Button onClick={handleSaveAndContinue}>
            Save Mappings & Continue
          </Button>
        </div>
      </div>
    </OnboardingLayout>
  );
}