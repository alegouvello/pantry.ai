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

// Helper to extract ingredient name from low_stock alert title
function extractIngredientName(title: string): string | null {
  const match = title.match(/^Low Stock:\s*(.+)$/i);
  return match ? match[1] : null;
}

// Helper to parse low_stock description values
function parseLowStockDescription(description: string): { current: string; reorderPoint: string } | null {
  // Pattern: "X is at Y, below the reorder point of Z."
  const match = description.match(/is at ([\d.,]+\s*\w+), below the reorder point of ([\d.,]+\s*\w+)/i);
  if (match) {
    return { current: match[1], reorderPoint: match[2] };
  }
  return null;
}

// Helper to parse suggested action values
function parseSuggestedAction(action: string): { parLevel: string } | null {
  // Pattern: "Create a purchase order for X to bring stock up to par level (Y)."
  const match = action.match(/par level \(([\d.,]+\s*\w+)\)/i);
  if (match) {
    return { parLevel: match[1] };
  }
  return null;
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

  // Translate alert content based on type
  const getTranslatedContent = () => {
    if (alert.type === 'low_stock') {
      const ingredientName = extractIngredientName(alert.title);
      const descValues = parseLowStockDescription(alert.description);
      const actionValues = parseSuggestedAction(alert.suggestedAction);

      if (ingredientName) {
        return {
          title: t('alerts.lowStock.title', { name: ingredientName }),
          description: descValues 
            ? t('alerts.lowStock.description', { 
                name: ingredientName, 
                current: descValues.current, 
                reorderPoint: descValues.reorderPoint 
              })
            : alert.description,
          suggestedAction: actionValues
            ? t('alerts.lowStock.suggestedAction', { 
                name: ingredientName, 
                parLevel: actionValues.parLevel 
              })
            : alert.suggestedAction,
        };
      }
    }

    if (alert.type === 'expiring') {
      return {
        title: t('alerts.expiring.title', { defaultValue: alert.title }),
        description: alert.description,
        suggestedAction: alert.suggestedAction,
      };
    }

    // Default: return original values
    return {
      title: alert.title,
      description: alert.description,
      suggestedAction: alert.suggestedAction,
    };
  };

  const content = getTranslatedContent();

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
              <h4 className="font-medium text-foreground">{content.title}</h4>
              <p className="text-sm text-muted-foreground mt-1">
                {content.description}
              </p>
            </div>
            <Badge variant={config.badgeVariant} className="shrink-0">
              {t(`severity.${alert.severity}`)}
            </Badge>
          </div>
          <div className="flex items-center justify-between pt-2">
            <p className="text-xs text-muted-foreground">
              {content.suggestedAction}
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