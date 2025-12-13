import { motion } from 'framer-motion';
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

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.05,
      delayChildren: 0.1,
    }
  }
};

const itemVariants = {
  hidden: { opacity: 0, y: 20, scale: 0.95 },
  visible: { 
    opacity: 1, 
    y: 0, 
    scale: 1,
    transition: {
      duration: 0.3,
      ease: "easeOut" as const,
    }
  }
};

export function ConceptSelector({ selected, onSelect }: ConceptSelectorProps) {
  return (
    <motion.div 
      className="grid grid-cols-2 md:grid-cols-4 gap-4"
      variants={containerVariants}
      initial="hidden"
      animate="visible"
    >
      {concepts.map((concept, index) => (
        <motion.button
          key={concept}
          variants={itemVariants}
          whileHover={{ scale: 1.03, y: -4 }}
          whileTap={{ scale: 0.97 }}
          onClick={() => onSelect(concept)}
          className={cn(
            "relative rounded-2xl overflow-hidden aspect-[4/3] group transition-colors duration-300",
            "border-2 focus:outline-none focus:ring-2 focus:ring-primary/50",
            selected === concept 
              ? "border-primary ring-4 ring-primary/20 shadow-lg" 
              : "border-transparent hover:border-primary/60 hover:shadow-lg"
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
            <motion.div 
              initial={{ scale: 0, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ type: "spring", stiffness: 500, damping: 25 }}
              className="absolute top-3 right-3 w-7 h-7 rounded-full bg-primary flex items-center justify-center shadow-lg"
            >
              <Check className="w-4 h-4 text-primary-foreground" />
            </motion.div>
          )}
          {/* Hover overlay */}
          <div className={cn(
            "absolute inset-0 bg-primary/10 opacity-0 transition-opacity duration-300",
            "group-hover:opacity-100"
          )} />
        </motion.button>
      ))}
    </motion.div>
  );
}
