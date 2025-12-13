import { useState, createContext, useContext, ReactNode } from 'react';
import type { OnboardingProgress, Restaurant, ConceptType } from '@/types/onboarding';

interface OnboardingContextType {
  progress: OnboardingProgress | null;
  setProgress: (progress: OnboardingProgress | null) => void;
  restaurant: Restaurant | null;
  setRestaurant: (restaurant: Restaurant | null) => void;
  currentStep: number;
  setCurrentStep: (step: number) => void;
  setupHealthScore: number;
  updateHealthScore: (delta: number) => void;
  conceptType: ConceptType | null;
  setConceptType: (type: ConceptType | null) => void;
}

const OnboardingContext = createContext<OnboardingContextType | undefined>(undefined);

export function OnboardingProvider({ children }: { children: ReactNode }) {
  const [progress, setProgress] = useState<OnboardingProgress | null>(null);
  const [restaurant, setRestaurant] = useState<Restaurant | null>(null);
  const [currentStep, setCurrentStep] = useState(1);
  const [setupHealthScore, setSetupHealthScore] = useState(0);
  const [conceptType, setConceptType] = useState<ConceptType | null>(null);

  const updateHealthScore = (delta: number) => {
    setSetupHealthScore(prev => Math.min(100, Math.max(0, prev + delta)));
  };

  return (
    <OnboardingContext.Provider value={{
      progress,
      setProgress,
      restaurant,
      setRestaurant,
      currentStep,
      setCurrentStep,
      setupHealthScore,
      updateHealthScore,
      conceptType,
      setConceptType,
    }}>
      {children}
    </OnboardingContext.Provider>
  );
}

export function useOnboardingContext() {
  const context = useContext(OnboardingContext);
  if (!context) {
    throw new Error('useOnboardingContext must be used within OnboardingProvider');
  }
  return context;
}
