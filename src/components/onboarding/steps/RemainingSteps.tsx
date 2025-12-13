import { OnboardingLayout } from '../OnboardingLayout';

interface StepProps {
  currentStep: number;
  completedSteps: number[];
  setupHealthScore: number;
  orgId: string | null;
  onNext: () => void;
  onBack?: () => void;
  onSave: () => void;
  updateHealthScore: (delta: number) => void;
}

export function Step3RecipeApproval(props: StepProps) {
  return (
    <OnboardingLayout {...props} title="Review AI-Generated Recipes" subtitle="Approve and edit recipe drafts">
      <div className="text-center py-12">
        <p className="text-muted-foreground">Recipe approval studio - Coming soon</p>
      </div>
    </OnboardingLayout>
  );
}

export function Step4StorageSetup(props: StepProps) {
  return (
    <OnboardingLayout {...props} title="Set Up Storage Locations" subtitle="Define where ingredients are stored">
      <div className="text-center py-12">
        <p className="text-muted-foreground">Storage setup - Coming soon</p>
      </div>
    </OnboardingLayout>
  );
}

export function Step5VendorSetup(props: StepProps) {
  return (
    <OnboardingLayout {...props} title="Add Your Vendors" subtitle="Set up supplier information">
      <div className="text-center py-12">
        <p className="text-muted-foreground">Vendor setup - Coming soon</p>
      </div>
    </OnboardingLayout>
  );
}

export function Step6POSConnect(props: StepProps) {
  return (
    <OnboardingLayout {...props} title="Connect Your POS" subtitle="Link sales data for automatic tracking">
      <div className="text-center py-12">
        <p className="text-muted-foreground">POS connection - Coming soon</p>
      </div>
    </OnboardingLayout>
  );
}

export function Step7Automation(props: StepProps) {
  return (
    <OnboardingLayout {...props} title="Set Your Autopilot" subtitle="Configure alerts and automation rules">
      <div className="text-center py-12">
        <p className="text-muted-foreground">Automation setup - Coming soon</p>
      </div>
    </OnboardingLayout>
  );
}

export function Step8GoLive(props: StepProps) {
  return (
    <OnboardingLayout {...props} title="You're Ready to Go Live!" subtitle="Review your setup and launch" nextLabel="Launch Dashboard">
      <div className="text-center py-12">
        <p className="text-muted-foreground">Go live summary - Coming soon</p>
      </div>
    </OnboardingLayout>
  );
}
