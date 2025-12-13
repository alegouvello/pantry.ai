import { ReactNode } from 'react';
import { ArrowLeft, ArrowRight, Save, ChefHat } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { OnboardingProgressBar } from './OnboardingProgressBar';
import { SetupHealthScore } from './SetupHealthScore';
import { cn } from '@/lib/utils';

interface OnboardingLayoutProps {
  children: ReactNode;
  currentStep: number;
  totalSteps?: number;
  completedSteps?: number[];
  setupHealthScore?: number;
  title: string;
  subtitle?: string;
  onBack?: () => void;
  onNext?: () => void;
  onSave?: () => void;
  nextLabel?: string;
  nextDisabled?: boolean;
  showProgress?: boolean;
  className?: string;
  updateHealthScore?: (delta: number) => void;
  orgId?: string | null;
}

export function OnboardingLayout({
  children,
  currentStep,
  totalSteps = 8,
  completedSteps = [],
  setupHealthScore = 0,
  title,
  subtitle,
  onBack,
  onNext,
  onSave,
  nextLabel = 'Continue',
  nextDisabled = false,
  showProgress = true,
  className,
}: OnboardingLayoutProps) {
  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-muted/20 flex flex-col">
      {/* Header */}
      <header className="border-b bg-background/80 backdrop-blur-sm sticky top-0 z-50">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 py-4">
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-primary flex items-center justify-center shadow-md">
                <ChefHat className="w-5 h-5 text-primary-foreground" />
              </div>
              <div className="hidden sm:block">
                <h1 className="font-bold text-foreground">Pantry</h1>
                <p className="text-xs text-muted-foreground">Setup Wizard</p>
              </div>
            </div>
            
            {showProgress && (
              <div className="flex-1 max-w-xl hidden md:block">
                <OnboardingProgressBar 
                  currentStep={currentStep}
                  totalSteps={totalSteps}
                  completedSteps={completedSteps}
                />
              </div>
            )}

            <div className="flex items-center gap-4">
              <SetupHealthScore score={setupHealthScore} className="hidden sm:flex" />
              {onSave && (
                <Button variant="outline" size="sm" onClick={onSave}>
                  <Save className="w-4 h-4 sm:mr-2" />
                  <span className="hidden sm:inline">Save & Exit</span>
                </Button>
              )}
            </div>
          </div>

          {/* Mobile progress */}
          {showProgress && (
            <div className="md:hidden mt-4">
              <OnboardingProgressBar 
                currentStep={currentStep}
                totalSteps={totalSteps}
                completedSteps={completedSteps}
              />
            </div>
          )}
        </div>
      </header>

      {/* Main content */}
      <main className="flex-1 py-8 px-4 sm:px-6">
        <div className="max-w-5xl mx-auto">
          {/* Step Header */}
          <div className="text-center mb-10">
            <div className="inline-flex items-center gap-2 bg-primary/10 text-primary text-sm font-medium px-4 py-1.5 rounded-full mb-4">
              Step {currentStep} of {totalSteps}
            </div>
            <h2 className="text-3xl md:text-4xl font-bold text-foreground mb-3">
              {title}
            </h2>
            {subtitle && (
              <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
                {subtitle}
              </p>
            )}
          </div>

          {/* Content */}
          <div className={cn("mb-8", className)}>
            {children}
          </div>
        </div>
      </main>

      {/* Footer Navigation */}
      {(onBack || onNext) && (
        <footer className="border-t bg-background/80 backdrop-blur-sm sticky bottom-0">
          <div className="max-w-5xl mx-auto px-4 sm:px-6 py-4">
            <div className="flex items-center justify-between">
              <div>
                {onBack && (
                  <Button variant="ghost" onClick={onBack} className="gap-2">
                    <ArrowLeft className="w-4 h-4" />
                    Back
                  </Button>
                )}
              </div>
              
              <div className="sm:hidden">
                <SetupHealthScore score={setupHealthScore} />
              </div>
              
              {onNext && (
                <Button 
                  onClick={onNext} 
                  disabled={nextDisabled}
                  className="gap-2 px-6"
                  size="lg"
                >
                  {nextLabel}
                  <ArrowRight className="w-4 h-4" />
                </Button>
              )}
            </div>
          </div>
        </footer>
      )}
    </div>
  );
}
