import { TrendingUp } from 'lucide-react';
import { cn } from '@/lib/utils';

interface SetupHealthScoreProps {
  score: number;
  className?: string;
}

export function SetupHealthScore({ score, className }: SetupHealthScoreProps) {
  const getScoreColor = () => {
    if (score >= 80) return 'text-primary';
    if (score >= 50) return 'text-warning';
    return 'text-muted-foreground';
  };

  const getProgressColor = () => {
    if (score >= 80) return 'bg-primary';
    if (score >= 50) return 'bg-warning';
    return 'bg-muted-foreground';
  };

  return (
    <div className={cn("flex items-center gap-3", className)}>
      <TrendingUp className={cn("h-4 w-4", getScoreColor())} />
      <div className="flex-1">
        <div className="flex items-center justify-between mb-1">
          <span className="text-xs text-muted-foreground">Setup Health</span>
          <span className={cn("text-sm font-semibold", getScoreColor())}>
            {score}%
          </span>
        </div>
        <div className="h-1.5 bg-muted rounded-full overflow-hidden">
          <div 
            className={cn("h-full transition-all duration-500 rounded-full", getProgressColor())}
            style={{ width: `${score}%` }}
          />
        </div>
      </div>
    </div>
  );
}
