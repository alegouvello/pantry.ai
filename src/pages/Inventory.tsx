import { useState } from 'react';
import { motion } from 'framer-motion';
import { Plus, Upload, Download, LogIn, Package, Sparkles, AlertTriangle, ShoppingCart } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { InventoryTable } from '@/components/inventory/InventoryTable';
import { ParLevelSuggestionDialog } from '@/components/inventory/ParLevelSuggestionDialog';
import { Skeleton } from '@/components/ui/skeleton';
import { Card } from '@/components/ui/card';
import { useIngredients, useUpdateIngredient } from '@/hooks/useIngredients';
import { useSuggestParLevels } from '@/hooks/useSuggestParLevels';
import { useRealtimeAlerts, useLowStockCheck } from '@/hooks/useRealtimeAlerts';
import { useQuickReorder } from '@/hooks/useQuickReorder';
import { useAuth } from '@/hooks/useAuth';
import { Link } from 'react-router-dom';
import { toast } from 'sonner';
import { useTranslation } from 'react-i18next';
import heroImage from '@/assets/pages/hero-inventory.jpg';

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.1, delayChildren: 0.2 },
  },
};

const itemVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.5, ease: [0.4, 0, 0.2, 1] as const },
  },
};

export default function Inventory() {
  const { t } = useTranslation();
  const { user, loading: authLoading } = useAuth();
  const { data: ingredients, isLoading, error } = useIngredients();
  const updateIngredient = useUpdateIngredient();
  const suggestParLevels = useSuggestParLevels();
  const { checkLowStock } = useLowStockCheck();
  const { lowStockCount, createQuickReorder, isCreating } = useQuickReorder();
  
  // Enable realtime alerts
  useRealtimeAlerts();
  
  const [showSuggestionDialog, setShowSuggestionDialog] = useState(false);
  const [suggestions, setSuggestions] = useState<Record<string, { par_level: number; reorder_point: number; reasoning: string }>>({});
  const [isCheckingStock, setIsCheckingStock] = useState(false);

  if (!authLoading && !user) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] space-y-6">
        <div className="text-center space-y-2">
          <Package className="h-16 w-16 text-primary mx-auto mb-4" />
          <h1 className="text-2xl font-bold text-foreground">{t('inventory.signInRequired')}</h1>
          <p className="text-muted-foreground">
            {t('inventory.signInToView')}
          </p>
        </div>
        <Link to="/auth">
          <Button variant="accent" size="lg">
            <LogIn className="h-5 w-5 mr-2" />
            {t('auth.signIn')}
          </Button>
        </Link>
      </div>
    );
  }

  const mappedIngredients = ingredients?.map(item => ({
    id: item.id,
    name: item.name,
    category: item.category,
    unit: item.unit,
    storageLocation: item.storage_location?.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase()) || 'Dry Storage',
    currentStock: item.current_stock,
    parLevel: item.par_level,
    reorderPoint: item.reorder_point,
    unitCost: item.unit_cost,
    lastUpdated: new Date(item.updated_at),
    shelfLifeDays: item.shelf_life_days || undefined,
    allergens: item.allergens || undefined,
    vendorId: item.vendor_id || undefined,
    vendorSku: item.vendor_sku || undefined,
  })) || [];

  const handleSuggestParLevels = async () => {
    if (!ingredients?.length) {
      toast.error(t('inventory.noIngredientsToAnalyze'));
      return;
    }

    setShowSuggestionDialog(true);
    setSuggestions({});

    try {
      const inputIngredients = ingredients.map(ing => ({
        id: ing.id,
        name: ing.name,
        category: ing.category,
        unit: ing.unit,
        currentStock: ing.current_stock,
        storageLocation: ing.storage_location || undefined,
      }));

      const result = await suggestParLevels.mutateAsync({
        ingredients: inputIngredients,
        conceptType: 'casual dining',
      });

      setSuggestions(result);
    } catch (error) {
      console.error('Failed to get suggestions:', error);
    }
  };

  const handleCheckLowStock = async () => {
    setIsCheckingStock(true);
    try {
      await checkLowStock();
    } finally {
      setIsCheckingStock(false);
    }
  };

  const handleApplySuggestions = async (selectedIds: string[]) => {
    let successCount = 0;
    let failCount = 0;

    for (const id of selectedIds) {
      const suggestion = suggestions[id];
      if (suggestion) {
        try {
          await updateIngredient.mutateAsync({
            id,
            par_level: suggestion.par_level,
            reorder_point: suggestion.reorder_point,
          });
          successCount++;
        } catch (error) {
          failCount++;
          console.error(`Failed to update ${id}:`, error);
        }
      }
    }

    if (successCount > 0) {
      toast.success(t('inventory.parLevelsUpdated', { count: successCount }));
    }
    if (failCount > 0) {
      toast.error(t('inventory.parLevelsUpdateFailed', { count: failCount }));
    }
    
    setSuggestions({});
  };

  const dialogIngredients = mappedIngredients.map(ing => ({
    id: ing.id,
    name: ing.name,
    category: ing.category,
    unit: ing.unit,
    currentParLevel: ing.parLevel,
    currentReorderPoint: ing.reorderPoint,
  }));

  return (
    <motion.div 
      className="space-y-8"
      variants={containerVariants}
      initial="hidden"
      animate="visible"
    >
      {/* Hero Section */}
      <motion.div 
        variants={itemVariants}
        className="relative h-48 md:h-56 rounded-2xl overflow-hidden"
      >
        <img 
          src={heroImage} 
          alt={t('inventory.title')} 
          className="absolute inset-0 w-full h-full object-cover"
        />
        <div className="absolute inset-0 bg-gradient-to-r from-background/90 via-background/70 to-transparent" />
        <div className="absolute inset-0 flex items-center px-8 md:px-12">
          <div className="space-y-3">
            <h1 className="text-3xl md:text-4xl font-bold text-foreground tracking-tight">
              {t('inventory.title')}
            </h1>
            <p className="text-muted-foreground max-w-md">
              {t('inventory.subtitle')}
            </p>
            <div className="flex gap-3 pt-2 flex-wrap">
              <Button variant="accent" size="sm">
                <Plus className="h-4 w-4 mr-2" />
                {t('inventory.addItem')}
              </Button>
              {lowStockCount > 0 && (
                <Button 
                  variant="default" 
                  size="sm"
                  onClick={() => createQuickReorder()}
                  disabled={isCreating}
                >
                  <ShoppingCart className="h-4 w-4 mr-2" />
                  {isCreating ? t('inventory.creating') : t('inventory.quickReorder', { count: lowStockCount })}
                </Button>
              )}
              <Button 
                variant="outline" 
                size="sm" 
                className="bg-background/50 backdrop-blur-sm"
                onClick={handleCheckLowStock}
                disabled={!ingredients?.length || isCheckingStock}
              >
                <AlertTriangle className="h-4 w-4 mr-2" />
                {isCheckingStock ? t('inventory.checking') : t('inventory.checkStock')}
              </Button>
              <Button 
                variant="outline" 
                size="sm" 
                className="bg-background/50 backdrop-blur-sm"
                onClick={handleSuggestParLevels}
                disabled={!ingredients?.length || suggestParLevels.isPending}
              >
                <Sparkles className="h-4 w-4 mr-2" />
                {suggestParLevels.isPending ? t('inventory.analyzing') : t('inventory.aiParLevels')}
              </Button>
              <Button variant="outline" size="sm" className="bg-background/50 backdrop-blur-sm">
                <Upload className="h-4 w-4 mr-2" />
                {t('common.import')}
              </Button>
              <Button variant="outline" size="sm" className="bg-background/50 backdrop-blur-sm">
                <Download className="h-4 w-4 mr-2" />
                {t('common.export')}
              </Button>
            </div>
          </div>
        </div>
      </motion.div>

      {/* Content */}
      <motion.div variants={itemVariants}>
        {isLoading ? (
          <Card className="p-6">
            <div className="space-y-4">
              <Skeleton className="h-10 w-full" />
              <Skeleton className="h-64 w-full" />
            </div>
          </Card>
        ) : error ? (
          <Card className="p-8 text-center">
            <p className="text-destructive">{t('inventory.errorLoading', { message: error.message })}</p>
          </Card>
        ) : mappedIngredients.length === 0 ? (
          <Card className="p-12 text-center">
            <Package className="h-12 w-12 mx-auto mb-4 text-muted-foreground/50" />
            <p className="text-muted-foreground mb-4">
              {t('inventory.noIngredients')}
            </p>
            <Button variant="accent">
              <Plus className="h-4 w-4 mr-2" />
              {t('inventory.addFirstIngredient')}
            </Button>
          </Card>
        ) : (
          <InventoryTable ingredients={mappedIngredients} />
        )}
      </motion.div>

      {/* AI Suggestion Dialog */}
      <ParLevelSuggestionDialog
        open={showSuggestionDialog}
        onOpenChange={setShowSuggestionDialog}
        ingredients={dialogIngredients}
        suggestions={suggestions}
        isLoading={suggestParLevels.isPending}
        onApply={handleApplySuggestions}
      />
    </motion.div>
  );
}
