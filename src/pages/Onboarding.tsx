import { useState, useEffect, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Loader2 } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { useOnboardingProgress, useCreateOnboarding, useUpdateOnboardingProgress, useRestaurant } from '@/hooks/useOnboarding';
import { OnboardingProvider } from '@/contexts/OnboardingContext';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';

// Step components
import { Step1RestaurantBasics } from '@/components/onboarding/steps/Step1RestaurantBasics';
import { Step2MenuImport } from '@/components/onboarding/steps/Step2MenuImport';
import { Step3RecipeApproval } from '@/components/onboarding/steps/Step3RecipeApproval';
import { Step4StorageSetup } from '@/components/onboarding/steps/Step4StorageSetup';
import { Step5VendorSetup } from '@/components/onboarding/steps/Step5VendorSetup';
import { Step6POSConnect } from '@/components/onboarding/steps/Step6POSConnect';
import { Step7Automation } from '@/components/onboarding/steps/Step7Automation';
import { Step8GoLive } from '@/components/onboarding/steps/Step8GoLive';

export default function Onboarding() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { user, loading: authLoading } = useAuth();
  const [currentStep, setCurrentStep] = useState(1);
  const [completedSteps, setCompletedSteps] = useState<number[]>([]);
  const [setupHealthScore, setSetupHealthScore] = useState(0);
  const [orgId, setOrgId] = useState<string | null>(null);
  const [progressId, setProgressId] = useState<string | null>(null);
  const [createError, setCreateError] = useState<string | null>(null);
  
  // Track if initial load is complete and if update is from local action
  const initializedRef = useRef(false);
  const isLocalUpdateRef = useRef(false);
  const createAttemptedRef = useRef(false);

  const { data: progress, isLoading: progressLoading } = useOnboardingProgress(user?.id);
  const { data: restaurant } = useRestaurant(orgId || undefined);
  const createOnboarding = useCreateOnboarding();
  const updateProgress = useUpdateOnboardingProgress();
  
  const restaurantId = restaurant?.id || null;

  // Initialize from database
  useEffect(() => {
    if (!authLoading && !user) {
      navigate('/onboarding/welcome');
      return;
    }

    if (progress && !initializedRef.current) {
      setCurrentStep(progress.current_step);
      setCompletedSteps(progress.completed_steps || []);
      setSetupHealthScore(progress.setup_health_score);
      setOrgId(progress.org_id);
      setProgressId(progress.id);
      initializedRef.current = true;
    } else if (user && !progressLoading && !progress && !createOnboarding.isPending && !createAttemptedRef.current) {
      // Create new onboarding progress - only attempt once
      createAttemptedRef.current = true;
      createOnboarding.mutate({ userId: user.id }, {
        onSuccess: (data) => {
          setOrgId(data.org.id);
          setProgressId(data.progress.id);
          initializedRef.current = true;
          setCreateError(null);
        },
        onError: (error: Error) => {
          console.error('Failed to create onboarding:', error);
          setCreateError(error.message);
          // Reset attempt flag after a delay to allow retry
          setTimeout(() => {
            createAttemptedRef.current = false;
          }, 5000);
        },
      });
    }
  }, [user, authLoading, progress, progressLoading, createOnboarding.isPending]);

  // Real-time sync for multi-tab support
  useEffect(() => {
    if (!progressId) return;

    const channel = supabase
      .channel(`onboarding-progress-${progressId}`)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'onboarding_progress',
          filter: `id=eq.${progressId}`,
        },
        (payload) => {
          // Skip if this was a local update
          if (isLocalUpdateRef.current) {
            isLocalUpdateRef.current = false;
            return;
          }

          const newData = payload.new as {
            current_step: number;
            completed_steps: number[];
            setup_health_score: number;
          };

          console.log('Realtime update received:', newData);
          
          setCurrentStep(newData.current_step);
          setCompletedSteps(newData.completed_steps || []);
          setSetupHealthScore(newData.setup_health_score);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [progressId]);

  // Persist progress changes to database
  const saveProgress = useCallback(async (updates: {
    currentStep?: number;
    completedSteps?: number[];
    setupHealthScore?: number;
  }) => {
    if (!progressId) return;
    
    // Mark as local update to prevent realtime echo
    isLocalUpdateRef.current = true;
    
    try {
      await updateProgress.mutateAsync({
        id: progressId,
        currentStep: updates.currentStep,
        completedSteps: updates.completedSteps,
        setupHealthScore: updates.setupHealthScore,
      });
    } catch (error) {
      console.error('Failed to save progress:', error);
      isLocalUpdateRef.current = false;
    }
  }, [progressId, updateProgress]);

  if (createError) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center max-w-md px-4">
          <p className="text-destructive mb-4">Failed to set up your workspace</p>
          <p className="text-muted-foreground text-sm mb-6">{createError}</p>
          <button 
            onClick={() => {
              setCreateError(null);
              createAttemptedRef.current = false;
            }}
            className="px-4 py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90"
          >
            Try Again
          </button>
        </div>
      </div>
    );
  }

  if (authLoading || progressLoading || createOnboarding.isPending) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center">
          <Loader2 className="w-8 h-8 animate-spin text-primary mx-auto mb-4" />
          <p className="text-muted-foreground">Setting up your workspace...</p>
        </div>
      </div>
    );
  }

  const handleNext = () => {
    const newCompletedSteps = completedSteps.includes(currentStep) 
      ? completedSteps 
      : [...completedSteps, currentStep];
    const newStep = Math.min(currentStep + 1, 8);
    
    setCompletedSteps(newCompletedSteps);
    setCurrentStep(newStep);
    
    // Persist to database
    saveProgress({
      currentStep: newStep,
      completedSteps: newCompletedSteps,
      setupHealthScore,
    });
  };

  const handleBack = () => {
    const newStep = Math.max(currentStep - 1, 1);
    setCurrentStep(newStep);
    
    // Persist to database
    saveProgress({ currentStep: newStep });
  };

  const handleSave = async () => {
    // Save current progress before navigating
    await saveProgress({
      currentStep,
      completedSteps,
      setupHealthScore,
    });
    
    toast({
      title: 'Progress saved',
      description: 'You can continue where you left off anytime.',
    });
    
    navigate('/');
  };

  const updateHealthScore = (delta: number) => {
    const newScore = Math.min(100, Math.max(0, setupHealthScore + delta));
    setSetupHealthScore(newScore);
    
    // Debounce health score updates (save with next navigation)
  };

  const stepProps = {
    currentStep,
    completedSteps,
    setupHealthScore,
    orgId,
    restaurantId,
    onNext: handleNext,
    onBack: currentStep > 1 ? handleBack : undefined,
    onSave: handleSave,
    updateHealthScore,
  };

  const renderStep = () => {
    switch (currentStep) {
      case 1:
        return <Step1RestaurantBasics {...stepProps} />;
      case 2:
        return <Step2MenuImport {...stepProps} />;
      case 3:
        return <Step3RecipeApproval {...stepProps} />;
      case 4:
        return <Step4StorageSetup {...stepProps} />;
      case 5:
        return <Step5VendorSetup {...stepProps} />;
      case 6:
        return <Step6POSConnect {...stepProps} />;
      case 7:
        return <Step7Automation {...stepProps} />;
      case 8:
        return <Step8GoLive {...stepProps} />;
      default:
        return <Step1RestaurantBasics {...stepProps} />;
    }
  };

  return (
    <OnboardingProvider>
      {renderStep()}
    </OnboardingProvider>
  );
}
