import { ReactNode, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowLeft, ArrowRight, Save, ChefHat } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { OnboardingProgressBar } from './OnboardingProgressBar';
import { SetupHealthScore } from './SetupHealthScore';
import { cn } from '@/lib/utils';
import type { ConceptType } from '@/types/onboarding';
import { CONCEPT_IMAGES } from '@/types/onboarding';

const contentVariants = {
  initial: { opacity: 0, y: 20 },
  animate: { 
    opacity: 1, 
    y: 0,
    transition: {
      duration: 0.5,
      ease: "easeOut" as const,
    }
  },
  exit: { 
    opacity: 0, 
    y: -20,
    transition: { duration: 0.3 }
  }
};

const headerVariants = {
  initial: { opacity: 0, y: -10 },
  animate: { 
    opacity: 1, 
    y: 0,
    transition: {
      duration: 0.4,
      delay: 0.1,
    }
  }
};

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
  conceptType?: ConceptType | null;
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
  conceptType,
}: OnboardingLayoutProps) {
  const backgroundImage = useMemo(() => {
    if (conceptType && CONCEPT_IMAGES[conceptType]) {
      return CONCEPT_IMAGES[conceptType];
    }
    return null;
  }, [conceptType]);

  return (
    <div className="min-h-screen bg-background flex flex-col relative overflow-hidden">
      {/* Concept-specific background with parallax effect */}
      <AnimatePresence mode="wait">
        {backgroundImage && (
          <motion.div
            key={conceptType}
            className="absolute inset-0 z-0"
            initial={{ opacity: 0, scale: 1.1 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            transition={{ duration: 0.8, ease: "easeOut" }}
          >
            <img 
              src={backgroundImage} 
              alt="" 
              className="w-full h-full object-cover"
            />
            {/* Multi-layer gradient overlay for readability */}
            <div className="absolute inset-0 bg-gradient-to-r from-background via-background/95 to-background/80" />
            <div className="absolute inset-0 bg-gradient-to-t from-background via-background/70 to-background/50" />
            <div className="absolute inset-0 bg-background/40 backdrop-blur-[2px]" />
          </motion.div>
        )}
      </AnimatePresence>

      {/* Decorative gradient orbs */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none z-0">
        <motion.div 
          className="absolute -top-32 -right-32 w-96 h-96 bg-primary/10 rounded-full blur-3xl"
          animate={{ 
            scale: [1, 1.2, 1],
            opacity: [0.3, 0.5, 0.3],
          }}
          transition={{ duration: 8, repeat: Infinity, ease: "easeInOut" }}
        />
        <motion.div 
          className="absolute -bottom-32 -left-32 w-80 h-80 bg-primary/5 rounded-full blur-3xl"
          animate={{ 
            scale: [1.2, 1, 1.2],
            opacity: [0.2, 0.4, 0.2],
          }}
          transition={{ duration: 10, repeat: Infinity, ease: "easeInOut" }}
        />
      </div>

      {/* Header */}
      <header className="border-b bg-background/80 backdrop-blur-md sticky top-0 z-50">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 py-4">
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <motion.div 
                className="w-10 h-10 rounded-xl bg-primary flex items-center justify-center shadow-lg shadow-primary/25"
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
              >
                <ChefHat className="w-5 h-5 text-primary-foreground" />
              </motion.div>
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
                <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
                  <Button variant="outline" size="sm" onClick={onSave} className="backdrop-blur-sm">
                    <Save className="w-4 h-4 sm:mr-2" />
                    <span className="hidden sm:inline">Save & Exit</span>
                  </Button>
                </motion.div>
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
      <main className="flex-1 py-8 px-4 sm:px-6 relative z-10">
        <div className="max-w-5xl mx-auto">
          {/* Step Header */}
          <motion.div 
            key={`header-${currentStep}`}
            initial="initial"
            animate="animate"
            variants={headerVariants}
            className="text-center mb-10"
          >
            <motion.div 
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.3 }}
              className="inline-flex items-center gap-2 bg-primary/10 backdrop-blur-sm text-primary text-sm font-medium px-4 py-1.5 rounded-full mb-4 border border-primary/20"
            >
              Step {currentStep} of {totalSteps}
            </motion.div>
            <motion.h2 
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4, delay: 0.1 }}
              className="text-3xl md:text-4xl font-bold text-foreground mb-3"
            >
              {title}
            </motion.h2>
            {subtitle && (
              <motion.p 
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.4, delay: 0.2 }}
                className="text-lg text-muted-foreground max-w-2xl mx-auto"
              >
                {subtitle}
              </motion.p>
            )}
          </motion.div>

          {/* Content Card */}
          <AnimatePresence mode="wait">
            <motion.div 
              key={`content-${currentStep}-${title}`}
              initial="initial"
              animate="animate"
              exit="exit"
              variants={contentVariants}
              className={cn(
                "mb-8 bg-card/80 backdrop-blur-md rounded-2xl border border-border/50 shadow-xl p-6 sm:p-8",
                className
              )}
            >
              {children}
            </motion.div>
          </AnimatePresence>
        </div>
      </main>

      {/* Footer Navigation */}
      {(onBack || onNext) && (
        <motion.footer 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3, delay: 0.3 }}
          className="border-t bg-background/80 backdrop-blur-md sticky bottom-0 z-40"
        >
          <div className="max-w-5xl mx-auto px-4 sm:px-6 py-4">
            <div className="flex items-center justify-between">
              <div>
                {onBack && (
                  <motion.div whileHover={{ x: -3 }} whileTap={{ scale: 0.95 }}>
                    <Button variant="ghost" onClick={onBack} className="gap-2">
                      <ArrowLeft className="w-4 h-4" />
                      Back
                    </Button>
                  </motion.div>
                )}
              </div>
              
              <div className="sm:hidden">
                <SetupHealthScore score={setupHealthScore} />
              </div>
              
              {onNext && (
                <motion.div 
                  whileHover={{ x: 3 }} 
                  whileTap={{ scale: 0.95 }}
                >
                  <Button 
                    onClick={onNext} 
                    disabled={nextDisabled}
                    className="gap-2 px-6 shadow-lg shadow-primary/25"
                    size="lg"
                  >
                    {nextLabel}
                    <ArrowRight className="w-4 h-4" />
                  </Button>
                </motion.div>
              )}
            </div>
          </div>
        </motion.footer>
      )}
    </div>
  );
}
