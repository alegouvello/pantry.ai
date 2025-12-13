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
            "relative rounded-2xl overflow-hidden aspect-[4/3] group transition-all duration-300",
            "border-2 hover:border-primary/60 hover:shadow-lg",
            "focus:outline-none focus:ring-2 focus:ring-primary/50",
            selected === concept 
              ? "border-primary ring-4 ring-primary/20 shadow-lg scale-[1.02]" 
              : "border-transparent"
          )}
        >
          <img
            src={CONCEPT_IMAGES[concept]}
            alt={CONCEPT_LABELS[concept]}
            className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent" />
          <div className="absolute bottom-0 left-0 right-0 p-4">
            <span className="text-sm font-semibold text-white drop-shadow-lg">
              {CONCEPT_LABELS[concept]}
            </span>
          </div>
          {selected === concept && (
            <div className="absolute top-3 right-3 w-7 h-7 rounded-full bg-primary flex items-center justify-center shadow-lg">
              <Check className="w-4 h-4 text-primary-foreground" />
            </div>
          )}
          {/* Hover overlay */}
          <div className={cn(
            "absolute inset-0 bg-primary/10 opacity-0 transition-opacity duration-300",
            "group-hover:opacity-100"
          )} />
        </button>
      ))}
    </div>
  );
}
