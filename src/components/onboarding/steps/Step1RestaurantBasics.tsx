import { useState } from 'react';
import { Search, Sparkles, Loader2 } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { OnboardingLayout } from '../OnboardingLayout';
import { ConceptSelector } from '../ConceptSelector';
import { ServiceChips } from '../ServiceChips';
import { useCreateRestaurant, useRestaurant, useUpdateRestaurant } from '@/hooks/useOnboarding';
import { useToast } from '@/hooks/use-toast';
import type { ConceptType, ServiceType, RestaurantAddress } from '@/types/onboarding';
import { CONCEPT_IMAGES } from '@/types/onboarding';

interface Step1Props {
  currentStep: number;
  completedSteps: number[];
  setupHealthScore: number;
  orgId: string | null;
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
  const { toast } = useToast();
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

  const handleFindDetails = async () => {
    if (!name || !address.city) {
      toast({
        title: 'Missing information',
        description: 'Please enter restaurant name and city first.',
        variant: 'destructive',
      });
      return;
    }

    setIsSearching(true);
    // TODO: Integrate with AI enrichment
    await new Promise(resolve => setTimeout(resolve, 2000));
    setIsSearching(false);
    
    toast({
      title: 'Details found',
      description: 'We found some information about your restaurant.',
    });
    updateHealthScore(5);
  };

  const handleContinue = async () => {
    if (!name.trim()) {
      toast({
        title: 'Name required',
        description: 'Please enter your restaurant name.',
        variant: 'destructive',
      });
      return;
    }

    if (!address.city) {
      toast({
        title: 'Address required',
        description: 'Please enter at least your city.',
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
        title: 'Error',
        description: error instanceof Error ? error.message : 'Failed to save',
        variant: 'destructive',
      });
    }
  };

  const isLoading = createRestaurant.isPending || updateRestaurant.isPending;
  const heroImage = conceptType ? CONCEPT_IMAGES[conceptType] : undefined;

  return (
    <OnboardingLayout
      currentStep={currentStep}
      completedSteps={completedSteps}
      setupHealthScore={setupHealthScore}
      title="Tell us about your restaurant"
      subtitle="We'll use this to personalize your experience"
      onNext={handleContinue}
      onSave={onSave}
      nextLabel={isLoading ? 'Saving...' : 'Continue'}
      nextDisabled={isLoading || !name.trim() || !address.city}
      heroImage={heroImage}
    >
      <div className="space-y-8">
        {/* Basic Info */}
        <div className="grid gap-6 md:grid-cols-2">
          <div className="space-y-2 md:col-span-2">
            <Label htmlFor="name">Restaurant Name *</Label>
            <Input
              id="name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="The Golden Fork"
              className="text-lg"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="street">Street Address</Label>
            <Input
              id="street"
              value={address.street || ''}
              onChange={(e) => setAddress({ ...address, street: e.target.value })}
              placeholder="123 Main Street"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="city">City *</Label>
            <Input
              id="city"
              value={address.city || ''}
              onChange={(e) => setAddress({ ...address, city: e.target.value })}
              placeholder="New York"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="state">State</Label>
            <Input
              id="state"
              value={address.state || ''}
              onChange={(e) => setAddress({ ...address, state: e.target.value })}
              placeholder="NY"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="zip">ZIP Code</Label>
            <Input
              id="zip"
              value={address.zip || ''}
              onChange={(e) => setAddress({ ...address, zip: e.target.value })}
              placeholder="10001"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="phone">Phone (optional)</Label>
            <Input
              id="phone"
              type="tel"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="(555) 123-4567"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="website">Website (optional)</Label>
            <Input
              id="website"
              type="url"
              value={website}
              onChange={(e) => setWebsite(e.target.value)}
              placeholder="https://example.com"
            />
          </div>

          <div className="space-y-2 md:col-span-2">
            <Label htmlFor="instagram">Instagram (optional)</Label>
            <Input
              id="instagram"
              value={instagram}
              onChange={(e) => setInstagram(e.target.value)}
              placeholder="@yourrestaurant"
            />
          </div>
        </div>

        {/* AI Search Button */}
        <div className="flex justify-center">
          <Button
            variant="outline"
            onClick={handleFindDetails}
            disabled={isSearching || !name || !address.city}
            className="gap-2"
          >
            {isSearching ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Sparkles className="w-4 h-4" />
            )}
            {isSearching ? 'Searching...' : 'Find details online'}
          </Button>
        </div>

        {/* Concept Type */}
        <div className="space-y-4">
          <Label>What type of establishment?</Label>
          <ConceptSelector selected={conceptType} onSelect={setConceptType} />
        </div>

        {/* Services */}
        <div className="space-y-4">
          <Label>What services do you offer?</Label>
          <ServiceChips selected={services} onChange={setServices} />
        </div>
      </div>
    </OnboardingLayout>
  );
}
