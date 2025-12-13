import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';
import { SERVICE_LABELS, type ServiceType } from '@/types/onboarding';

interface ServiceChipsProps {
  selected: ServiceType[];
  onChange: (services: ServiceType[]) => void;
}

const services: ServiceType[] = [
  'lunch',
  'dinner',
  'brunch',
  'delivery',
  'catering',
  'tasting_menu',
  'seasonal_menu',
];

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.03,
      delayChildren: 0.05,
    }
  }
};

const chipVariants = {
  hidden: { opacity: 0, scale: 0.8 },
  visible: { 
    opacity: 1, 
    scale: 1,
    transition: { duration: 0.2, ease: "easeOut" as const }
  }
};

export function ServiceChips({ selected, onChange }: ServiceChipsProps) {
  const toggleService = (service: ServiceType) => {
    if (selected.includes(service)) {
      onChange(selected.filter(s => s !== service));
    } else {
      onChange([...selected, service]);
    }
  };

  return (
    <motion.div 
      className="flex flex-wrap gap-2"
      variants={containerVariants}
      initial="hidden"
      animate="visible"
    >
      {services.map((service) => {
        const isSelected = selected.includes(service);
        return (
          <motion.button
            key={service}
            variants={chipVariants}
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={() => toggleService(service)}
            className={cn(
              "px-4 py-2 rounded-full text-sm font-medium transition-colors",
              "border hover:border-primary/50",
              isSelected 
                ? "bg-primary text-primary-foreground border-primary" 
                : "bg-muted/50 text-muted-foreground border-border hover:text-foreground"
            )}
          >
            {SERVICE_LABELS[service]}
          </motion.button>
        );
      })}
    </motion.div>
  );
}
