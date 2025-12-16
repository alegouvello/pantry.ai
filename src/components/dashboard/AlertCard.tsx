import { useTranslation } from 'react-i18next';
import { AlertTriangle, CheckCircle, Clock, ArrowRight } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Alert } from '@/types/inventory';
import { cn } from '@/lib/utils';

interface AlertCardProps {
  alert: Alert;
  onResolve?: (id: string) => void;
}

export function AlertCard({ alert, onResolve }: AlertCardProps) {
  const { t } = useTranslation();

  const severityConfig = {
    high: {
      icon: AlertTriangle,
      badgeVariant: 'low' as const,
      borderClass: 'border-destructive/30',
      iconClass: 'text-destructive',
    },
    medium: {
      icon: Clock,
      badgeVariant: 'medium' as const,
      borderClass: 'border-warning/30',
      iconClass: 'text-warning',
    },
    low: {
      icon: CheckCircle,
      badgeVariant: 'high' as const,
      borderClass: 'border-success/30',
      iconClass: 'text-success',
    },
  };

  const config = severityConfig[alert.severity];
  const Icon = config.icon;

  return (
    <Card
      className={cn(
        "p-4 transition-all duration-200 hover:shadow-lg",
        config.borderClass,
        alert.isResolved && "opacity-60"
      )}
    >
      <div className="flex gap-4">
        <div className={cn("mt-0.5", config.iconClass)}>
          <Icon className="h-5 w-5" />
        </div>
        <div className="flex-1 space-y-2">
          <div className="flex items-start justify-between gap-2">
            <div>
              <h4 className="font-medium text-foreground">{alert.title}</h4>
              <p className="text-sm text-muted-foreground mt-1">
                {alert.description}
              </p>
            </div>
            <Badge variant={config.badgeVariant} className="shrink-0">
              {alert.severity}
            </Badge>
          </div>
          <div className="flex items-center justify-between pt-2">
            <p className="text-xs text-muted-foreground">
              {alert.suggestedAction}
            </p>
            {!alert.isResolved && onResolve && (
              <Button
                variant="ghost"
                size="sm"
                className="gap-1 text-primary hover:text-primary"
                onClick={() => onResolve(alert.id)}
              >
                {t('alertCard.takeAction')}
                <ArrowRight className="h-3 w-3" />
              </Button>
            )}
          </div>
        </div>
      </div>
    </Card>
  );
}
