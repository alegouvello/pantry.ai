import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Upload, Link as LinkIcon, ShoppingBag, PenLine, FileText, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { OnboardingLayout } from '../OnboardingLayout';
import { useOnboardingContext } from '@/contexts/OnboardingContext';
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

type ImportMethod = 'upload' | 'url' | 'pos' | 'manual';

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
  const { conceptType, setParsedDishes, setPrepRecipes } = useOnboardingContext();
  const [method, setMethod] = useState<ImportMethod | null>(null);
  const [menuUrl, setMenuUrl] = useState('');
  const [isMonitored, setIsMonitored] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [processingStatus, setProcessingStatus] = useState('');
  const [uploadedFile, setUploadedFile] = useState<File | null>(null);

  const importMethods = [
    {
      id: 'upload' as ImportMethod,
      title: t('step2Menu.uploadMenu'),
      description: t('step2Menu.uploadDesc'),
      icon: Upload,
      recommended: true,
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

  const handleContinue = async () => {
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

      if (method === 'upload' && uploadedFile) {
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
      
      setParsedDishes(dishes);
      setPrepRecipes(prepRecipes);

      const prepMessage = prepRecipes.length > 0 
        ? t('step2Menu.detectedPrep', { count: prepRecipes.length })
        : '';
      
      toast({
        title: t('step2Menu.parseSuccess'),
        description: t('step2Menu.foundDishes', { count: dishes.length, prep: prepMessage }),
      });

      updateHealthScore(15);
      onNext();

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

  return (
    <OnboardingLayout
      currentStep={currentStep}
      completedSteps={completedSteps}
      setupHealthScore={setupHealthScore}
      title={t('step2Menu.title')}
      subtitle={t('step2Menu.subtitle')}
      onNext={handleContinue}
      onBack={onBack}
      onSave={onSave}
      nextLabel={isProcessing ? t('step2Menu.processing') : t('step1Basics.continue')}
      nextDisabled={!method || isProcessing}
      conceptType={conceptType}
    >
      <div className="space-y-8">
        {/* Method Selection */}
        <div className="grid gap-3 sm:gap-4 grid-cols-2">
          {importMethods.map((m) => (
            <button
              key={m.id}
              onClick={() => setMethod(m.id)}
              disabled={isProcessing}
              className={cn(
                "relative p-4 sm:p-6 rounded-xl border-2 text-left transition-all hover:border-primary/50",
                method === m.id 
                  ? "border-primary bg-primary/5" 
                  : "border-border",
                isProcessing && "opacity-50 cursor-not-allowed"
              )}
            >
              {m.recommended && (
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
