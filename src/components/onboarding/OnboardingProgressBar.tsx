import { Check } from 'lucide-react';
import { cn } from '@/lib/utils';

interface OnboardingProgressBarProps {
  currentStep: number;
  totalSteps: number;
  completedSteps: number[];
}

const STEP_LABELS = [
  'Basics',
  'Menu',
  'Recipes',
  'Storage',
  'Vendors',
  'POS',
  'Rules',
  'Launch',
];

export function OnboardingProgressBar({ currentStep, totalSteps, completedSteps }: OnboardingProgressBarProps) {
  return (
    <div className="w-full">
      {/* Progress line with dots */}
      <div className="flex items-center justify-between relative">
        {/* Background line */}
        <div className="absolute left-0 right-0 top-1/2 h-0.5 bg-border -translate-y-1/2 rounded-full" />
        
        {/* Progress line */}
        <div 
          className="absolute left-0 top-1/2 h-0.5 bg-primary -translate-y-1/2 transition-all duration-500 rounded-full"
          style={{ width: `${((currentStep - 1) / (totalSteps - 1)) * 100}%` }}
        />
        
        {/* Step indicators */}
        {Array.from({ length: totalSteps }, (_, i) => {
          const stepNumber = i + 1;
          const isCompleted = completedSteps.includes(stepNumber);
          const isCurrent = stepNumber === currentStep;
          const isPast = stepNumber < currentStep;
          
          return (
            <div key={stepNumber} className="relative z-10 flex flex-col items-center">
              <div
                className={cn(
                  "w-8 h-8 rounded-full flex items-center justify-center text-xs font-semibold transition-all duration-300",
                  "border-2 shadow-sm",
                  isCompleted || isPast
                    ? "bg-primary border-primary text-primary-foreground"
                    : isCurrent
                    ? "bg-background border-primary text-primary ring-4 ring-primary/20"
                    : "bg-background border-muted-foreground/30 text-muted-foreground"
                )}
              >
                {isCompleted || isPast ? (
                  <Check className="w-4 h-4" />
                ) : (
                  stepNumber
                )}
              </div>
              <span 
                className={cn(
                  "absolute -bottom-6 text-[10px] font-medium whitespace-nowrap hidden lg:block",
                  isCurrent ? "text-primary" : isPast ? "text-foreground" : "text-muted-foreground"
                )}
              >
                {STEP_LABELS[i]}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
