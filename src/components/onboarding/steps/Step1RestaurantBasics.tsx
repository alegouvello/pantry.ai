import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { motion } from 'framer-motion';
import { Sparkles, Loader2 } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { OnboardingLayout } from '../OnboardingLayout';
import { ConceptSelector } from '../ConceptSelector';
import { ServiceChips } from '../ServiceChips';
import { useCreateRestaurant, useRestaurant, useUpdateRestaurant } from '@/hooks/useOnboarding';
import { useOnboardingContext } from '@/contexts/OnboardingContext';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import type { ConceptType, ServiceType, RestaurantAddress } from '@/types/onboarding';

const sectionVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: { 
    opacity: 1, 
    y: 0,
    transition: { duration: 0.4, ease: "easeOut" as const }
  }
};

interface Step1Props {
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

export function Step1RestaurantBasics({
  currentStep,
  completedSteps,
  setupHealthScore,
  orgId,
  onNext,
  onSave,
  updateHealthScore,
}: Step1Props) {
  const { t } = useTranslation();
  const { toast } = useToast();
  const { setConceptType: setContextConceptType } = useOnboardingContext();
  const { data: existingRestaurant } = useRestaurant(orgId || undefined);
  const createRestaurant = useCreateRestaurant();
  const updateRestaurant = useUpdateRestaurant();

  const [name, setName] = useState(existingRestaurant?.name || '');
  const [address, setAddress] = useState<RestaurantAddress>(existingRestaurant?.address || {});
  const [phone, setPhone] = useState(existingRestaurant?.phone || '');
  const [website, setWebsite] = useState(existingRestaurant?.website || '');
  const [instagram, setInstagram] = useState(existingRestaurant?.instagram || '');
  const [conceptType, setConceptType] = useState<ConceptType | null>(
    (existingRestaurant?.concept_type as ConceptType) || null
  );
  const [services, setServices] = useState<ServiceType[]>(
    (existingRestaurant?.services as ServiceType[]) || []
  );
  const [isSearching, setIsSearching] = useState(false);

  // Sync conceptType to context whenever it changes
  useEffect(() => {
    setContextConceptType(conceptType);
  }, [conceptType, setContextConceptType]);

  const handleFindDetails = async () => {
    if (!name.trim()) {
      toast({
        title: t('step1Basics.missingInfo'),
        description: t('step1Basics.enterNameFirst'),
        variant: 'destructive',
      });
      return;
    }

    setIsSearching(true);
    
    try {
      const { data, error } = await supabase.functions.invoke('enrich-restaurant', {
        body: {
          restaurantName: name,
          city: address.city,
          state: address.state,
        },
      });

      if (error) throw error;
      
      if (!data?.success) {
        throw new Error(data?.error || 'Failed to enrich restaurant data');
      }

      const enriched = data.data;
      
      // Update form with enriched data
      setAddress(prev => ({
        street: prev.street || enriched.address?.street || '',
        city: prev.city || enriched.address?.city || '',
        state: prev.state || enriched.address?.state || '',
        zip: prev.zip || enriched.address?.zip || '',
      }));
      setPhone(prev => prev || enriched.phone || '');
      setWebsite(prev => prev || enriched.website || '');
      setInstagram(prev => prev || enriched.instagram || '');
      
      if (enriched.conceptType && !conceptType) {
        setConceptType(enriched.conceptType as ConceptType);
      }
      
      if (enriched.services && services.length === 0) {
        setServices(enriched.services as ServiceType[]);
      }
      
      toast({
        title: t('step1Basics.detailsFound'),
        description: t('step1Basics.detailsFoundDesc', { confidence: enriched.confidence }),
      });
      updateHealthScore(5);
      
    } catch (error) {
      console.error('Error enriching restaurant:', error);
      toast({
        title: t('step1Basics.searchFailed'),
        description: error instanceof Error ? error.message : t('step1Basics.couldNotFind'),
        variant: 'destructive',
      });
    } finally {
      setIsSearching(false);
    }
  };

  const handleContinue = async () => {
    if (!name.trim()) {
      toast({
        title: t('step1Basics.nameRequired'),
        description: t('step1Basics.enterName'),
        variant: 'destructive',
      });
      return;
    }

    if (!address.city) {
      toast({
        title: t('step1Basics.addressRequired'),
        description: t('step1Basics.enterCity'),
        variant: 'destructive',
      });
      return;
    }

    try {
      const restaurantData = {
        name,
        address: address as any,
        phone,
        website,
        instagram,
        concept_type: conceptType,
        services,
      };

      if (existingRestaurant) {
        await updateRestaurant.mutateAsync({ id: existingRestaurant.id, ...restaurantData });
      } else if (orgId) {
        await createRestaurant.mutateAsync({ org_id: orgId, ...restaurantData });
      }
      updateHealthScore(10);
      onNext();
    } catch (error) {
      toast({
        title: t('step1Basics.error'),
        description: error instanceof Error ? error.message : t('step1Basics.failedSave'),
        variant: 'destructive',
      });
    }
  };

  const isLoading = createRestaurant.isPending || updateRestaurant.isPending;

  return (
    <OnboardingLayout
      currentStep={currentStep}
      completedSteps={completedSteps}
      setupHealthScore={setupHealthScore}
      title={t('step1Basics.title')}
      subtitle={t('step1Basics.subtitle')}
      onNext={handleContinue}
      onSave={onSave}
      nextLabel={isLoading ? t('step1Basics.saving') : t('step1Basics.continue')}
      nextDisabled={isLoading || !name.trim() || !address.city}
      conceptType={conceptType}
    >
      <motion.div 
        className="space-y-8"
        initial="hidden"
        animate="visible"
        variants={{
          hidden: { opacity: 0 },
          visible: {
            opacity: 1,
            transition: { staggerChildren: 0.1, delayChildren: 0.1 }
          }
        }}
      >
        {/* Basic Info */}
        <motion.div variants={sectionVariants} className="grid gap-6 md:grid-cols-2">
          <div className="space-y-2 md:col-span-2">
            <Label htmlFor="name">{t('step1Basics.restaurantName')} *</Label>
            <Input
              id="name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder={t('step1Basics.restaurantNamePlaceholder')}
              className="text-lg"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="street">{t('step1Basics.streetAddress')}</Label>
            <Input
              id="street"
              value={address.street || ''}
              onChange={(e) => setAddress({ ...address, street: e.target.value })}
              placeholder={t('step1Basics.streetPlaceholder')}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="city">{t('step1Basics.city')} *</Label>
            <Input
              id="city"
              value={address.city || ''}
              onChange={(e) => setAddress({ ...address, city: e.target.value })}
              placeholder={t('step1Basics.cityPlaceholder')}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="state">{t('step1Basics.state')}</Label>
            <Input
              id="state"
              value={address.state || ''}
              onChange={(e) => setAddress({ ...address, state: e.target.value })}
              placeholder={t('step1Basics.statePlaceholder')}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="zip">{t('step1Basics.zip')}</Label>
            <Input
              id="zip"
              value={address.zip || ''}
              onChange={(e) => setAddress({ ...address, zip: e.target.value })}
              placeholder={t('step1Basics.zipPlaceholder')}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="phone">{t('step1Basics.phone')}</Label>
            <Input
              id="phone"
              type="tel"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder={t('step1Basics.phonePlaceholder')}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="website">{t('step1Basics.website')}</Label>
            <Input
              id="website"
              type="url"
              value={website}
              onChange={(e) => setWebsite(e.target.value)}
              placeholder={t('step1Basics.websitePlaceholder')}
            />
          </div>

          <div className="space-y-2 md:col-span-2">
            <Label htmlFor="instagram">{t('step1Basics.instagram')}</Label>
            <Input
              id="instagram"
              value={instagram}
              onChange={(e) => setInstagram(e.target.value)}
              placeholder={t('step1Basics.instagramPlaceholder')}
            />
          </div>
        </motion.div>

        {/* AI Search Button */}
        <motion.div variants={sectionVariants} className="flex justify-center">
          <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
            <Button
              variant="outline"
              onClick={handleFindDetails}
              disabled={isSearching || !name.trim()}
              className="gap-2"
            >
              {isSearching ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Sparkles className="w-4 h-4" />
              )}
              {isSearching ? t('step1Basics.searching') : t('step1Basics.findDetails')}
            </Button>
          </motion.div>
        </motion.div>

        {/* Concept Type */}
        <motion.div variants={sectionVariants} className="space-y-4">
          <Label>{t('step1Basics.whatType')}</Label>
          <ConceptSelector selected={conceptType} onSelect={setConceptType} />
        </motion.div>

        {/* Services */}
        <motion.div variants={sectionVariants} className="space-y-4">
          <Label>{t('step1Basics.whatServices')}</Label>
          <ServiceChips selected={services} onChange={setServices} />
        </motion.div>
      </motion.div>
    </OnboardingLayout>
  );
}
