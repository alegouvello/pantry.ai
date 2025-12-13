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

export function ServiceChips({ selected, onChange }: ServiceChipsProps) {
  const toggleService = (service: ServiceType) => {
    if (selected.includes(service)) {
      onChange(selected.filter(s => s !== service));
    } else {
      onChange([...selected, service]);
    }
  };

  return (
    <div className="flex flex-wrap gap-2">
      {services.map((service) => {
        const isSelected = selected.includes(service);
        return (
          <button
            key={service}
            onClick={() => toggleService(service)}
            className={cn(
              "px-4 py-2 rounded-full text-sm font-medium transition-all",
              "border hover:border-primary/50",
              isSelected 
                ? "bg-primary text-primary-foreground border-primary" 
                : "bg-muted/50 text-muted-foreground border-border hover:text-foreground"
            )}
          >
            {SERVICE_LABELS[service]}
          </button>
        );
      })}
    </div>
  );
}
