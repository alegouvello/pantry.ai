import { LucideIcon } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { cn } from '@/lib/utils';

interface MetricCardProps {
  title: string;
  value: string | number;
  subtitle?: string;
  icon: LucideIcon;
  trend?: {
    value: number;
    isPositive: boolean;
  };
  variant?: 'default' | 'warning' | 'success' | 'accent';
}

export function MetricCard({
  title,
  value,
  subtitle,
  icon: Icon,
  trend,
  variant = 'default',
}: MetricCardProps) {
  const iconColorClass = {
    default: 'text-primary',
    warning: 'text-warning',
    success: 'text-success',
    accent: 'text-accent',
  }[variant];

  const bgColorClass = {
    default: 'bg-primary/10',
    warning: 'bg-warning/10',
    success: 'bg-success/10',
    accent: 'bg-accent/10',
  }[variant];

  return (
    <Card variant="elevated" className="p-6 animate-slide-up">
      <div className="flex items-start justify-between">
        <div className="space-y-2">
          <p className="text-sm text-muted-foreground">{title}</p>
          <div className="flex items-baseline gap-2">
            <p className="text-3xl font-bold text-foreground">{value}</p>
            {trend && (
              <span
                className={cn(
                  "text-sm font-medium",
                  trend.isPositive ? "text-success" : "text-destructive"
                )}
              >
                {trend.isPositive ? '+' : ''}{trend.value}%
              </span>
            )}
          </div>
          {subtitle && (
            <p className="text-xs text-muted-foreground">{subtitle}</p>
          )}
        </div>
        <div className={cn("p-3 rounded-xl", bgColorClass)}>
          <Icon className={cn("h-6 w-6", iconColorClass)} />
        </div>
      </div>
    </Card>
  );
}
