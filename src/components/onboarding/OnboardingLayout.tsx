import { ReactNode } from 'react';
import { ArrowLeft, ArrowRight, Save } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { OnboardingProgressBar } from './OnboardingProgressBar';
import { SetupHealthScore } from './SetupHealthScore';

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
  heroImage?: string;
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
  heroImage,
}: OnboardingLayoutProps) {
  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b border-border bg-card/50 backdrop-blur-sm sticky top-0 z-10">
        <div className="max-w-5xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-gradient-primary flex items-center justify-center">
                <span className="text-primary-foreground font-bold text-lg">P</span>
              </div>
              <div className="hidden sm:block">
                <h1 className="font-semibold text-foreground">Pantry Setup</h1>
                <p className="text-xs text-muted-foreground">~15-25 min remaining</p>
              </div>
            </div>
            
            {showProgress && (
              <div className="flex-1 max-w-md hidden md:block">
                <OnboardingProgressBar 
                  currentStep={currentStep}
                  totalSteps={totalSteps}
                  completedSteps={completedSteps}
                />
              </div>
            )}

            <div className="flex items-center gap-3">
              <SetupHealthScore score={setupHealthScore} className="hidden sm:flex" />
              {onSave && (
                <Button variant="outline" size="sm" onClick={onSave}>
                  <Save className="w-4 h-4 mr-2" />
                  Save & Exit
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
      <main className="max-w-5xl mx-auto px-4 py-8">
        {heroImage && (
          <div className="mb-8 rounded-2xl overflow-hidden h-48 relative">
            <img 
              src={heroImage} 
              alt="" 
              className="w-full h-full object-cover"
            />
            <div className="absolute inset-0 bg-gradient-to-r from-background/80 to-transparent" />
            <div className="absolute bottom-6 left-6">
              <h2 className="text-2xl font-bold text-foreground mb-1">{title}</h2>
              {subtitle && (
                <p className="text-muted-foreground">{subtitle}</p>
              )}
            </div>
          </div>
        )}

        {!heroImage && (
          <div className="mb-8">
            <h2 className="text-2xl font-bold text-foreground mb-1">{title}</h2>
            {subtitle && (
              <p className="text-muted-foreground">{subtitle}</p>
            )}
          </div>
        )}

        <Card variant="elevated" className="p-6 md:p-8">
          {children}
        </Card>

        {/* Navigation */}
        <div className="flex items-center justify-between mt-8">
          <div>
            {onBack && (
              <Button variant="ghost" onClick={onBack}>
                <ArrowLeft className="w-4 h-4 mr-2" />
                Back
              </Button>
            )}
          </div>
          <div className="flex items-center gap-3">
            {onNext && (
              <Button variant="accent" onClick={onNext} disabled={nextDisabled}>
                {nextLabel}
                <ArrowRight className="w-4 h-4 ml-2" />
              </Button>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}
