import { cn } from '@/lib/utils';
import { CONCEPT_IMAGES, CONCEPT_LABELS, type ConceptType } from '@/types/onboarding';
import { Check } from 'lucide-react';

interface ConceptSelectorProps {
  selected: ConceptType | null;
  onSelect: (concept: ConceptType) => void;
}

const concepts: ConceptType[] = [
  'fine_dining',
  'casual',
  'quick_service',
  'bar',
  'coffee',
  'bakery',
  'cocktail',
  'multi',
];

export function ConceptSelector({ selected, onSelect }: ConceptSelectorProps) {
  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
      {concepts.map((concept) => (
        <button
          key={concept}
          onClick={() => onSelect(concept)}
          className={cn(
            "relative rounded-xl overflow-hidden aspect-[4/3] group transition-all",
            "border-2 hover:border-primary/50",
            selected === concept 
              ? "border-primary ring-2 ring-primary/20" 
              : "border-border"
          )}
        >
          <img
            src={CONCEPT_IMAGES[concept]}
            alt={CONCEPT_LABELS[concept]}
            className="w-full h-full object-cover transition-transform group-hover:scale-105"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-background/90 to-transparent" />
          <div className="absolute bottom-0 left-0 right-0 p-3">
            <span className="text-sm font-medium text-foreground">
              {CONCEPT_LABELS[concept]}
            </span>
          </div>
          {selected === concept && (
            <div className="absolute top-2 right-2 w-6 h-6 rounded-full bg-primary flex items-center justify-center">
              <Check className="w-4 h-4 text-primary-foreground" />
            </div>
          )}
        </button>
      ))}
    </div>
  );
}
