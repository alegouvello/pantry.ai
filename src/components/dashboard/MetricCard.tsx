import { LucideIcon } from 'lucide-react';
import { motion } from 'framer-motion';
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

  const glowClass = {
    default: 'group-hover:shadow-primary/20',
    warning: 'group-hover:shadow-warning/20',
    success: 'group-hover:shadow-success/20',
    accent: 'group-hover:shadow-accent/20',
  }[variant];

  return (
    <motion.div
      whileHover={{ y: -2, scale: 1.01 }}
      transition={{ duration: 0.2 }}
    >
      <Card 
        variant="elevated" 
        className={cn(
          "group p-6 backdrop-blur-sm bg-card/80 border-border/50",
          "transition-shadow duration-300 hover:shadow-lg",
          glowClass
        )}
      >
        <div className="flex items-start justify-between">
          <div className="space-y-2">
            <p className="text-sm text-muted-foreground font-medium">{title}</p>
            <div className="flex items-baseline gap-2">
              <p className="text-4xl font-bold text-foreground tracking-tight">{value}</p>
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
          <motion.div 
            className={cn("p-3 rounded-xl", bgColorClass)}
            whileHover={{ rotate: 5, scale: 1.1 }}
            transition={{ duration: 0.2 }}
          >
            <Icon className={cn("h-6 w-6", iconColorClass)} />
          </motion.div>
        </div>
      </Card>
    </motion.div>
  );
}
