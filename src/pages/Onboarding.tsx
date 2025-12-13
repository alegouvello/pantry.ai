import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Loader2 } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { useOnboardingProgress, useCreateOnboarding } from '@/hooks/useOnboarding';
import { OnboardingProvider } from '@/contexts/OnboardingContext';

// Step components
import { Step1RestaurantBasics } from '@/components/onboarding/steps/Step1RestaurantBasics';
import { Step2MenuImport } from '@/components/onboarding/steps/Step2MenuImport';
import { 
  Step3RecipeApproval, 
  Step4StorageSetup, 
  Step5VendorSetup, 
  Step6POSConnect, 
  Step7Automation, 
  Step8GoLive 
} from '@/components/onboarding/steps/RemainingSteps';

export default function Onboarding() {
  const navigate = useNavigate();
  const { user, loading: authLoading } = useAuth();
  const [currentStep, setCurrentStep] = useState(1);
  const [completedSteps, setCompletedSteps] = useState<number[]>([]);
  const [setupHealthScore, setSetupHealthScore] = useState(0);
  const [orgId, setOrgId] = useState<string | null>(null);

  const { data: progress, isLoading: progressLoading } = useOnboardingProgress(user?.id);
  const createOnboarding = useCreateOnboarding();

  useEffect(() => {
    if (!authLoading && !user) {
      navigate('/onboarding/welcome');
      return;
    }

    if (progress) {
      setCurrentStep(progress.current_step);
      setCompletedSteps(progress.completed_steps || []);
      setSetupHealthScore(progress.setup_health_score);
      setOrgId(progress.org_id);
    } else if (user && !progressLoading) {
      // Create new onboarding progress
      createOnboarding.mutate({ userId: user.id }, {
        onSuccess: (data) => {
          setOrgId(data.org.id);
        },
      });
    }
  }, [user, authLoading, progress, progressLoading]);

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
    if (!completedSteps.includes(currentStep)) {
      setCompletedSteps([...completedSteps, currentStep]);
    }
    setCurrentStep(prev => Math.min(prev + 1, 8));
  };

  const handleBack = () => {
    setCurrentStep(prev => Math.max(prev - 1, 1));
  };

  const handleSave = () => {
    navigate('/');
  };

  const updateHealthScore = (delta: number) => {
    setSetupHealthScore(prev => Math.min(100, Math.max(0, prev + delta)));
  };

  const stepProps = {
    currentStep,
    completedSteps,
    setupHealthScore,
    orgId,
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
