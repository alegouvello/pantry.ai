import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Upload, Link as LinkIcon, ShoppingBag, PenLine, FileText, Loader2, Sparkles, Check, X, ChevronRight, UtensilsCrossed, Pencil, Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { OnboardingLayout } from '../OnboardingLayout';
import { useOnboardingContext, ParsedDish } from '@/contexts/OnboardingContext';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';
import { supabase } from '@/integrations/supabase/client';

interface Step2Props {
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

type ImportMethod = 'upload' | 'url' | 'pos' | 'manual' | 'auto';

export function Step2MenuImport({
  currentStep,
  completedSteps,
  setupHealthScore,
  onNext,
  onBack,
  onSave,
  updateHealthScore,
}: Step2Props) {
  const { t } = useTranslation();
  const { toast } = useToast();
  const { conceptType, restaurant, setParsedDishes, setPrepRecipes } = useOnboardingContext();
  const [method, setMethod] = useState<ImportMethod | null>(null);
  const [menuUrl, setMenuUrl] = useState('');
  const [isMonitored, setIsMonitored] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [processingStatus, setProcessingStatus] = useState('');
  const [uploadedFile, setUploadedFile] = useState<File | null>(null);
  
  // Preview state
  const [showPreview, setShowPreview] = useState(false);
  const [previewDishes, setPreviewDishes] = useState<ParsedDish[]>([]);
  const [previewPrepRecipes, setPreviewPrepRecipes] = useState<ParsedDish[]>([]);
  const [selectedDishes, setSelectedDishes] = useState<Set<string>>(new Set());
  const [editingDishId, setEditingDishId] = useState<string | null>(null);

  const importMethods = [
    {
      id: 'auto' as ImportMethod,
      title: t('step2Menu.autoFind'),
      description: t('step2Menu.autoFindDesc'),
      icon: Sparkles,
      recommended: true,
      disabled: !restaurant?.name,
    },
    {
      id: 'upload' as ImportMethod,
      title: t('step2Menu.uploadMenu'),
      description: t('step2Menu.uploadDesc'),
      icon: Upload,
    },
    {
      id: 'url' as ImportMethod,
      title: t('step2Menu.pasteUrl'),
      description: t('step2Menu.urlDesc'),
      icon: LinkIcon,
    },
    {
      id: 'pos' as ImportMethod,
      title: t('step2Menu.importPos'),
      description: t('step2Menu.posDesc'),
      icon: ShoppingBag,
    },
    {
      id: 'manual' as ImportMethod,
      title: t('step2Menu.manualEntry'),
      description: t('step2Menu.manualDesc'),
      icon: PenLine,
    },
  ];

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setUploadedFile(file);
      toast({
        title: t('step2Menu.fileUploaded'),
        description: t('step2Menu.fileReady', { name: file.name }),
      });
    }
  };

  const extractTextFromFile = async (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      
      if (file.type === 'application/pdf') {
        reader.onload = (e) => {
          const text = e.target?.result as string;
          resolve(text);
        };
        reader.onerror = reject;
        reader.readAsText(file);
      } else if (file.type.startsWith('image/')) {
        reader.onload = (e) => {
          const base64 = e.target?.result as string;
          resolve(`[IMAGE MENU]\nBase64 image data provided for OCR/vision processing.\n${base64}`);
        };
        reader.onerror = reject;
        reader.readAsDataURL(file);
      } else {
        reader.onload = (e) => {
          resolve(e.target?.result as string);
        };
        reader.onerror = reject;
        reader.readAsText(file);
      }
    });
  };

  const scrapeMenuUrl = async (url: string): Promise<string> => {
    const { data, error } = await supabase.functions.invoke('scrape-menu-url', {
      body: { url },
    });

    if (error) {
      throw new Error(error.message || 'Failed to fetch menu from URL');
    }

    if (!data?.success) {
      throw new Error(data?.error || 'Failed to fetch menu from URL');
    }

    return data.content;
  };

  const findMenuOnline = async (): Promise<string> => {
    const { data, error } = await supabase.functions.invoke('find-menu', {
      body: { 
        restaurantName: restaurant?.name,
        website: restaurant?.website,
        city: restaurant?.address?.city,
      },
    });

    if (error) {
      throw new Error(error.message || 'Failed to find menu online');
    }

    if (!data?.success) {
      throw new Error(data?.error || 'Failed to find menu online');
    }

    return data.content;
  };

  const handleImportMenu = async () => {
    if (method === 'manual') {
      setParsedDishes([]);
      setPrepRecipes([]);
      onNext();
      return;
    }

    if (method === 'upload' && !uploadedFile) {
      toast({
        title: t('step2Menu.noFileSelected'),
        description: t('step2Menu.uploadFile'),
        variant: 'destructive',
      });
      return;
    }

    if (method === 'url' && !menuUrl) {
      toast({
        title: t('step2Menu.noUrlProvided'),
        description: t('step2Menu.enterUrl'),
        variant: 'destructive',
      });
      return;
    }

    setIsProcessing(true);

    try {
      let menuContent = '';

      if (method === 'auto') {
        setProcessingStatus(t('step2Menu.searchingWeb'));
        menuContent = await findMenuOnline();
        setProcessingStatus(t('step2Menu.analyzingAI'));
      } else if (method === 'upload' && uploadedFile) {
        setProcessingStatus(t('step2Menu.extracting'));
        menuContent = await extractTextFromFile(uploadedFile);
        setProcessingStatus(t('step2Menu.analyzingAI'));
      } else if (method === 'url') {
        setProcessingStatus(t('step2Menu.fetching'));
        menuContent = await scrapeMenuUrl(menuUrl);
        setProcessingStatus(t('step2Menu.analyzingAI'));
      }

      // Call the parse-menu edge function
      const { data, error } = await supabase.functions.invoke('parse-menu', {
        body: { 
          menuContent, 
          menuType: method,
          detailLevel: 'standard'
        },
      });

      if (error) {
        throw new Error(error.message || 'Failed to parse menu');
      }

      if (!data?.success) {
        throw new Error(data?.error || 'Failed to parse menu');
      }

      const dishes = data.dishes || [];
      const prepRecipes = data.prepRecipes || [];
      
      // Show preview instead of immediately moving to next step
      setPreviewDishes(dishes);
      setPreviewPrepRecipes(prepRecipes);
      setSelectedDishes(new Set(dishes.map((d: ParsedDish) => d.id)));
      setShowPreview(true);

      toast({
        title: t('step2Menu.parseSuccess'),
        description: t('step2Menu.reviewDishes'),
      });

    } catch (error) {
      console.error('Menu parsing error:', error);
      toast({
        title: t('step2Menu.parseFailed'),
        description: error instanceof Error ? error.message : t('step2Menu.tryManual'),
        variant: 'destructive',
      });
    } finally {
      setIsProcessing(false);
      setProcessingStatus('');
    }
  };

  const toggleDishSelection = (dishId: string) => {
    setSelectedDishes(prev => {
      const newSet = new Set(prev);
      if (newSet.has(dishId)) {
        newSet.delete(dishId);
      } else {
        newSet.add(dishId);
      }
      return newSet;
    });
  };

  const selectAllDishes = () => {
    setSelectedDishes(new Set(previewDishes.map(d => d.id)));
  };

  const deselectAllDishes = () => {
    setSelectedDishes(new Set());
  };

  const updateDish = (dishId: string, field: 'name' | 'description' | 'price' | 'tags', value: string | number | string[]) => {
    setPreviewDishes(prev => prev.map(dish => 
      dish.id === dishId ? { ...dish, [field]: value } : dish
    ));
  };

  const addNewDish = () => {
    const newDish: ParsedDish = {
      id: `manual-${Date.now()}`,
      name: '',
      description: '',
      price: 0,
      section: 'Other',
      tags: [],
      confidence: 'high',
      ingredients: [],
    };
    setPreviewDishes(prev => [...prev, newDish]);
    setSelectedDishes(prev => new Set([...prev, newDish.id]));
    setEditingDishId(newDish.id);
  };

  const handleConfirmDishes = () => {
    const selectedDishList = previewDishes.filter(d => selectedDishes.has(d.id));
    setParsedDishes(selectedDishList);
    setPrepRecipes(previewPrepRecipes);
    updateHealthScore(15);
    onNext();
  };

  const handleBackToImport = () => {
    setShowPreview(false);
    setPreviewDishes([]);
    setPreviewPrepRecipes([]);
    setSelectedDishes(new Set());
  };

  // Group dishes by section
  const groupedDishes = previewDishes.reduce((acc, dish) => {
    const section = dish.section || 'Other';
    if (!acc[section]) {
      acc[section] = [];
    }
    acc[section].push(dish);
    return acc;
  }, {} as Record<string, ParsedDish[]>);

  // Preview View
  if (showPreview) {
    return (
      <OnboardingLayout
        currentStep={currentStep}
        completedSteps={completedSteps}
        setupHealthScore={setupHealthScore}
        title={t('step2Menu.reviewTitle', 'Review Imported Menu')}
        subtitle={t('step2Menu.reviewSubtitle', 'Select the dishes you want to include in your recipe library')}
        onNext={handleConfirmDishes}
        onBack={handleBackToImport}
        onSave={onSave}
        nextLabel={t('step2Menu.confirmDishes', { count: selectedDishes.size })}
        nextDisabled={selectedDishes.size === 0}
        conceptType={conceptType}
      >
        <div className="space-y-6">
          {/* Summary Bar */}
          <div className="flex items-center justify-between bg-muted/50 rounded-lg p-4">
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2">
                <UtensilsCrossed className="w-5 h-5 text-primary" />
                <span className="font-medium">
                  {selectedDishes.size} / {previewDishes.length} {t('step2Menu.dishesSelected', 'dishes selected')}
                </span>
              </div>
              {previewPrepRecipes.length > 0 && (
                <Badge variant="secondary">
                  +{previewPrepRecipes.length} {t('step2Menu.prepRecipes', 'prep recipes')}
                </Badge>
              )}
            </div>
            <div className="flex gap-2">
              <Button variant="ghost" size="sm" onClick={selectAllDishes}>
                {t('step2Menu.selectAll', 'Select All')}
              </Button>
              <Button variant="ghost" size="sm" onClick={deselectAllDishes}>
                {t('step2Menu.deselectAll', 'Deselect All')}
              </Button>
              <Button variant="outline" size="sm" onClick={addNewDish}>
                <Plus className="w-4 h-4 mr-1" />
                {t('step2Menu.addDish', 'Add Dish')}
              </Button>
            </div>
          </div>

          {/* Dishes List */}
          <ScrollArea className="h-[400px] pr-4">
            <div className="space-y-6">
              {Object.entries(groupedDishes).map(([section, dishes]) => (
                <div key={section}>
                  <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-3">
                    {section} ({dishes.filter(d => selectedDishes.has(d.id)).length}/{dishes.length})
                  </h3>
                  <div className="space-y-2">
                    {dishes.map((dish) => (
                      <div
                        key={dish.id}
                        className={cn(
                          "w-full flex items-center gap-3 p-3 rounded-lg border transition-all",
                          selectedDishes.has(dish.id)
                            ? "border-primary bg-primary/5"
                            : "border-border hover:border-muted-foreground/30 opacity-60"
                        )}
                      >
                        <button
                          onClick={() => toggleDishSelection(dish.id)}
                          className={cn(
                            "w-5 h-5 rounded-full border-2 flex items-center justify-center flex-shrink-0",
                            selectedDishes.has(dish.id)
                              ? "border-primary bg-primary"
                              : "border-muted-foreground/40"
                          )}
                        >
                          {selectedDishes.has(dish.id) && (
                            <Check className="w-3 h-3 text-primary-foreground" />
                          )}
                        </button>
                        <div className="flex-1 min-w-0">
                          {editingDishId === dish.id ? (
                            <div className="space-y-2" onClick={(e) => e.stopPropagation()}>
                              <Input
                                value={dish.name}
                                onChange={(e) => updateDish(dish.id, 'name', e.target.value)}
                                className="h-8 font-medium"
                                placeholder={t('step2Menu.dishName', 'Dish name')}
                                autoFocus
                              />
                              <Input
                                value={dish.description || ''}
                                onChange={(e) => updateDish(dish.id, 'description', e.target.value)}
                                placeholder={t('step2Menu.addDescription', 'Add description...')}
                                className="h-8 text-sm"
                              />
                              <div className="flex gap-2">
                                <div className="relative w-24">
                                  <span className="absolute left-2 top-1/2 -translate-y-1/2 text-muted-foreground text-sm">$</span>
                                  <Input
                                    type="number"
                                    step="0.01"
                                    min="0"
                                    value={dish.price || ''}
                                    onChange={(e) => updateDish(dish.id, 'price', e.target.value ? parseFloat(e.target.value) : 0)}
                                    placeholder="0.00"
                                    className="h-8 text-sm pl-5"
                                  />
                                </div>
                                <Input
                                  value={dish.tags?.join(', ') || ''}
                                  onChange={(e) => updateDish(dish.id, 'tags', e.target.value.split(',').map(t => t.trim()).filter(Boolean))}
                                  placeholder={t('step2Menu.addTags', 'Tags (comma separated)')}
                                  className="h-8 text-sm flex-1"
                                />
                              </div>
                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={() => setEditingDishId(null)}
                                className="h-7 text-xs"
                              >
                                <Check className="w-3 h-3 mr-1" />
                                {t('common.done', 'Done')}
                              </Button>
                            </div>
                          ) : (
                            <div className="flex items-center gap-2 group">
                              <div className="flex-1 min-w-0">
                                <p className="font-medium text-foreground truncate">{dish.name}</p>
                                {dish.description && (
                                  <p className="text-sm text-muted-foreground truncate">{dish.description}</p>
                                )}
                              </div>
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setEditingDishId(dish.id);
                                }}
                                className="opacity-0 group-hover:opacity-100 p-1 rounded hover:bg-muted transition-opacity"
                              >
                                <Pencil className="w-3.5 h-3.5 text-muted-foreground" />
                              </button>
                            </div>
                          )}
                        </div>
                        {dish.price && !editingDishId && (
                          <span className="text-sm font-medium text-muted-foreground flex-shrink-0">
                            ${dish.price.toFixed(2)}
                          </span>
                        )}
                        {dish.tags && dish.tags.length > 0 && !editingDishId && (
                          <div className="flex gap-1 flex-shrink-0">
                            {dish.tags.slice(0, 2).map((tag) => (
                              <Badge key={tag} variant="outline" className="text-xs">
                                {tag}
                              </Badge>
                            ))}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              ))}

              {/* Prep Recipes Section */}
              {previewPrepRecipes.length > 0 && (
                <div>
                  <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-3">
                    {t('step2Menu.prepRecipesTitle', 'Prep Recipes (Auto-detected)')}
                  </h3>
                  <Card className="p-4 bg-muted/30">
                    <p className="text-sm text-muted-foreground mb-3">
                      {t('step2Menu.prepRecipesNote', 'These house-made items will be created as sub-recipes:')}
                    </p>
                    <div className="flex flex-wrap gap-2">
                      {previewPrepRecipes.map((prep) => (
                        <Badge key={prep.id} variant="secondary">
                          {prep.name}
                        </Badge>
                      ))}
                    </div>
                  </Card>
                </div>
              )}
            </div>
          </ScrollArea>
        </div>
      </OnboardingLayout>
    );
  }

  // Import Method Selection View
  return (
    <OnboardingLayout
      currentStep={currentStep}
      completedSteps={completedSteps}
      setupHealthScore={setupHealthScore}
      title={t('step2Menu.title')}
      subtitle={t('step2Menu.subtitle')}
      onNext={handleImportMenu}
      onBack={onBack}
      onSave={onSave}
      nextLabel={isProcessing ? t('step2Menu.processing') : t('step2Menu.importMenu', 'Import Menu')}
      nextDisabled={!method || isProcessing}
      conceptType={conceptType}
    >
      <div className="space-y-8">
        {/* Method Selection */}
        <div className="grid gap-3 sm:gap-4 grid-cols-2 lg:grid-cols-3">
          {importMethods.map((m) => (
            <button
              key={m.id}
              onClick={() => !m.disabled && setMethod(m.id)}
              disabled={isProcessing || m.disabled}
              className={cn(
                "relative p-4 sm:p-6 rounded-xl border-2 text-left transition-all hover:border-primary/50",
                method === m.id 
                  ? "border-primary bg-primary/5" 
                  : "border-border",
                (isProcessing || m.disabled) && "opacity-50 cursor-not-allowed"
              )}
            >
              {m.recommended && !m.disabled && (
                <span className="absolute top-2 right-2 sm:top-3 sm:right-3 text-[10px] sm:text-xs bg-primary text-primary-foreground px-1.5 sm:px-2 py-0.5 rounded-full">
                  {t('step2Menu.best')}
                </span>
              )}
              <m.icon className={cn(
                "w-6 h-6 sm:w-8 sm:h-8 mb-2 sm:mb-3",
                method === m.id ? "text-primary" : "text-muted-foreground"
              )} />
              <h3 className="font-semibold text-foreground mb-0.5 sm:mb-1 text-sm sm:text-base">{m.title}</h3>
              <p className="text-xs sm:text-sm text-muted-foreground line-clamp-2">{m.description}</p>
            </button>
          ))}
        </div>

        {/* Upload Area */}
        {method === 'upload' && !isProcessing && (
          <Card variant="elevated" className="p-8">
            <div className="flex flex-col items-center">
              <input
                type="file"
                id="menu-upload"
                accept=".pdf,.jpg,.jpeg,.png,.txt"
                onChange={handleFileUpload}
                className="hidden"
              />
              <label
                htmlFor="menu-upload"
                className="flex flex-col items-center cursor-pointer"
              >
                {uploadedFile ? (
                  <>
                    <FileText className="w-12 h-12 text-primary mb-4" />
                    <p className="font-medium text-foreground">{uploadedFile.name}</p>
                    <p className="text-sm text-muted-foreground mt-1">
                      {t('step2Menu.clickToChange')}
                    </p>
                  </>
                ) : (
                  <>
                    <Upload className="w-12 h-12 text-muted-foreground mb-4" />
                    <p className="font-medium text-foreground">
                      {t('step2Menu.dropMenu')}
                    </p>
                    <p className="text-sm text-muted-foreground mt-1">
                      {t('step2Menu.fileTypes')}
                    </p>
                  </>
                )}
              </label>
            </div>
          </Card>
        )}

        {/* URL Input */}
        {method === 'url' && !isProcessing && (
          <Card variant="elevated" className="p-6">
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="menu-url">{t('step2Menu.menuUrl')}</Label>
                <Input
                  id="menu-url"
                  type="url"
                  value={menuUrl}
                  onChange={(e) => setMenuUrl(e.target.value)}
                  placeholder={t('step2Menu.menuUrlPlaceholder')}
                />
                <p className="text-xs text-muted-foreground">
                  {t('step2Menu.scrapeNote')}
                </p>
              </div>
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-foreground">{t('step2Menu.monitorChanges')}</p>
                  <p className="text-xs text-muted-foreground">
                    {t('step2Menu.monitorDesc')}
                  </p>
                </div>
                <Switch
                  checked={isMonitored}
                  onCheckedChange={setIsMonitored}
                />
              </div>
            </div>
          </Card>
        )}

        {/* POS Connect */}
        {method === 'pos' && !isProcessing && (
          <Card variant="elevated" className="p-6">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-lg bg-orange-500/10 flex items-center justify-center">
                <span className="text-2xl">🍞</span>
              </div>
              <div className="flex-1">
                <h3 className="font-semibold text-foreground">{t('step2Menu.toastPos')}</h3>
                <p className="text-sm text-muted-foreground">
                  {t('step2Menu.connectToImport')}
                </p>
              </div>
              <Button variant="outline">{t('step2Menu.connect')}</Button>
            </div>
          </Card>
        )}

        {/* Manual Entry */}
        {method === 'manual' && !isProcessing && (
          <Card variant="elevated" className="p-6 text-center">
            <PenLine className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
            <h3 className="font-semibold text-foreground mb-2">{t('step2Menu.manualEntryTitle')}</h3>
            <p className="text-sm text-muted-foreground max-w-md mx-auto">
              {t('step2Menu.manualEntryDesc')}
            </p>
          </Card>
        )}

        {/* Auto Find */}
        {method === 'auto' && !isProcessing && (
          <Card variant="elevated" className="p-6 text-center">
            <Sparkles className="w-12 h-12 text-primary mx-auto mb-4" />
            <h3 className="font-semibold text-foreground mb-2">{t('step2Menu.autoFindTitle')}</h3>
            <p className="text-sm text-muted-foreground max-w-md mx-auto">
              {t('step2Menu.autoFindExplain', { name: restaurant?.name || 'your restaurant' })}
            </p>
          </Card>
        )}

        {/* Processing State */}
        {isProcessing && (
          <div className="flex flex-col items-center py-8">
            <Loader2 className="w-8 h-8 animate-spin text-primary mb-4" />
            <p className="font-medium text-foreground">{t('step2Menu.processingMenu')}</p>
            <p className="text-sm text-muted-foreground">{processingStatus || t('step2Menu.thisMayTake')}</p>
          </div>
        )}
      </div>
    </OnboardingLayout>
  );
}
