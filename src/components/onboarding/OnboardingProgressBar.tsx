import { Check } from 'lucide-react';
import { cn } from '@/lib/utils';

interface OnboardingProgressBarProps {
  currentStep: number;
  totalSteps: number;
  completedSteps: number[];
}

const STEP_LABELS = [
  'Identity',
  'Menu',
  'Recipes',
  'Storage',
  'Vendors',
  'POS',
  'Automation',
  'Go Live',
];

export function OnboardingProgressBar({ currentStep, totalSteps, completedSteps }: OnboardingProgressBarProps) {
  return (
    <div className="w-full">
      <div className="flex items-center justify-between mb-2">
        {Array.from({ length: totalSteps }, (_, i) => i + 1).map((step) => {
          const isCompleted = completedSteps.includes(step);
          const isCurrent = step === currentStep;
          const isPast = step < currentStep;

          return (
            <div key={step} className="flex flex-col items-center flex-1">
              <div className="flex items-center w-full">
                {step > 1 && (
                  <div 
                    className={cn(
                      "h-0.5 flex-1 transition-colors",
                      isPast || isCompleted ? "bg-primary" : "bg-border"
                    )} 
                  />
                )}
                <div
                  className={cn(
                    "w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium transition-all shrink-0",
                    isCompleted && "bg-primary text-primary-foreground",
                    isCurrent && !isCompleted && "bg-primary/20 text-primary border-2 border-primary",
                    !isCurrent && !isCompleted && "bg-muted text-muted-foreground"
                  )}
                >
                  {isCompleted ? (
                    <Check className="w-4 h-4" />
                  ) : (
                    step
                  )}
                </div>
                {step < totalSteps && (
                  <div 
                    className={cn(
                      "h-0.5 flex-1 transition-colors",
                      isPast || isCompleted ? "bg-primary" : "bg-border"
                    )} 
                  />
                )}
              </div>
              <span 
                className={cn(
                  "text-xs mt-1 hidden sm:block",
                  isCurrent ? "text-primary font-medium" : "text-muted-foreground"
                )}
              >
                {STEP_LABELS[step - 1]}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
