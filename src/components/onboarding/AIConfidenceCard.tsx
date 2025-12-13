import { AlertCircle, CheckCircle2, Info, Pencil } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import type { ConfidenceLevel } from '@/types/onboarding';
import { cn } from '@/lib/utils';

interface AIConfidenceCardProps<T> {
  title: string;
  value: T;
  confidence: ConfidenceLevel;
  reason: string;
  onEdit?: () => void;
  onConfirm?: () => void;
  isConfirmed?: boolean;
  renderValue?: (value: T) => React.ReactNode;
  className?: string;
}

const confidenceConfig = {
  high: {
    icon: CheckCircle2,
    color: 'text-primary',
    bg: 'bg-primary/10',
    label: 'High Confidence',
  },
  medium: {
    icon: Info,
    color: 'text-warning',
    bg: 'bg-warning/10',
    label: 'Medium Confidence',
  },
  low: {
    icon: AlertCircle,
    color: 'text-destructive',
    bg: 'bg-destructive/10',
    label: 'Low Confidence',
  },
};

export function AIConfidenceCard<T>({ 
  title, 
  value, 
  confidence, 
  reason, 
  onEdit, 
  onConfirm,
  isConfirmed,
  renderValue,
  className 
}: AIConfidenceCardProps<T>) {
  const config = confidenceConfig[confidence];
  const Icon = config.icon;

  return (
    <Card 
      variant="elevated" 
      className={cn(
        "p-4 transition-all",
        isConfirmed && "border-primary/50 bg-primary/5",
        className
      )}
    >
      <div className="flex items-start justify-between gap-3 mb-3">
        <div className="flex items-center gap-2">
          <h4 className="font-medium text-foreground">{title}</h4>
          <Badge variant="outline" className={cn("text-xs", config.color)}>
            <Icon className="w-3 h-3 mr-1" />
            {config.label}
          </Badge>
        </div>
        {isConfirmed && (
          <Badge variant="success" className="text-xs">
            <CheckCircle2 className="w-3 h-3 mr-1" />
            Confirmed
          </Badge>
        )}
      </div>

      <div className="mb-3">
        {renderValue ? renderValue(value) : (
          <p className="text-sm text-foreground">{String(value)}</p>
        )}
      </div>

      <div className={cn("p-2 rounded-lg mb-3 text-xs", config.bg)}>
        <span className={cn("font-medium", config.color)}>Why: </span>
        <span className="text-muted-foreground">{reason}</span>
      </div>

      {!isConfirmed && (onEdit || onConfirm) && (
        <div className="flex items-center gap-2">
          {onEdit && (
            <Button variant="outline" size="sm" onClick={onEdit}>
              <Pencil className="w-3 h-3 mr-1" />
              Edit
            </Button>
          )}
          {onConfirm && (
            <Button variant="accent" size="sm" onClick={onConfirm}>
              <CheckCircle2 className="w-3 h-3 mr-1" />
              Confirm
            </Button>
          )}
        </div>
      )}
    </Card>
  );
}
