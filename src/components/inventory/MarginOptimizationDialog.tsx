import { Lightbulb, TrendingUp, DollarSign, Loader2, RefreshCw, ArrowRight, Scissors, Tag, Package, Wrench } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { OptimizationResult, OptimizationSuggestion } from '@/hooks/useOptimizeMargins';
import { useTranslation } from 'react-i18next';

interface MarginOptimizationDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  recipeName: string;
  result: OptimizationResult | null;
  isLoading: boolean;
  onRetry: () => void;
}

const typeIcons: Record<OptimizationSuggestion['type'], React.ReactNode> = {
  substitution: <RefreshCw className="h-4 w-4" />,
  portion: <Scissors className="h-4 w-4" />,
  pricing: <Tag className="h-4 w-4" />,
  sourcing: <Package className="h-4 w-4" />,
  technique: <Wrench className="h-4 w-4" />,
};

const impactColors: Record<OptimizationSuggestion['impact'], string> = {
  low: 'bg-muted text-muted-foreground',
  medium: 'bg-accent/20 text-accent-foreground',
  high: 'bg-primary/20 text-primary',
};


export function MarginOptimizationDialog({
  open,
  onOpenChange,
  recipeName,
  result,
  isLoading,
  onRetry,
}: MarginOptimizationDialogProps) {
  const { t } = useTranslation();

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Lightbulb className="h-5 w-5 text-primary" />
            {t('marginDialog.title')} {recipeName}
          </DialogTitle>
        </DialogHeader>

        {isLoading ? (
          <div className="flex flex-col items-center justify-center py-12 gap-4">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
            <p className="text-muted-foreground">{t('marginDialog.analyzing')}</p>
          </div>
        ) : result ? (
          <div className="space-y-6">
            {/* Summary */}
            <div className="p-4 rounded-lg bg-muted/50 border border-border">
              <p className="text-sm text-foreground">{result.summary}</p>
              <div className="flex gap-4 mt-3">
                {result.targetFoodCostPct && (
                  <div className="flex items-center gap-2 text-sm">
                    <TrendingUp className="h-4 w-4 text-primary" />
                    <span className="text-muted-foreground">{t('marginDialog.target')}</span>
                    <span className="font-semibold">{result.targetFoodCostPct}%</span>
                  </div>
                )}
                {result.potentialSavings && (
                  <div className="flex items-center gap-2 text-sm">
                    <DollarSign className="h-4 w-4 text-primary" />
                    <span className="text-muted-foreground">{t('marginDialog.potentialSavings')}</span>
                    <span className="font-semibold">${result.potentialSavings.toFixed(2)}{t('marginDialog.perPortion')}</span>
                  </div>
                )}
              </div>
            </div>

            {/* Suggestions */}
            <div className="space-y-3">
              <h4 className="text-sm font-medium text-muted-foreground">{t('marginDialog.recommendations')}</h4>
              {result.suggestions.map((suggestion, index) => (
                <div
                  key={index}
                  className="p-4 rounded-lg border border-border bg-card hover:bg-muted/30 transition-colors animate-fade-in"
                  style={{ animationDelay: `${index * 100}ms` }}
                >
                  <div className="flex items-start gap-3">
                    <div className="p-2 rounded-lg bg-muted">
                      {typeIcons[suggestion.type]}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap mb-1">
                        <h5 className="font-medium text-foreground">{suggestion.title}</h5>
                        <Badge variant="outline" className="text-xs">
                          {t(`marginDialog.types.${suggestion.type}`)}
                        </Badge>
                        <Badge className={`text-xs ${impactColors[suggestion.impact]}`}>
                          {suggestion.impact} {t('marginDialog.impact')}
                        </Badge>
                      </div>
                      <p className="text-sm text-muted-foreground mb-2">
                        {suggestion.description}
                      </p>
                      {suggestion.estimatedSavings && (
                        <div className="flex items-center gap-1 text-sm text-primary">
                          <ArrowRight className="h-3 w-3" />
                          <span className="font-medium">{suggestion.estimatedSavings}</span>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* Retry button */}
            <div className="flex justify-end">
              <Button variant="outline" size="sm" onClick={onRetry}>
                <RefreshCw className="h-4 w-4 mr-2" />
                {t('marginDialog.getNewSuggestions')}
              </Button>
            </div>
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center py-12 gap-4">
            <p className="text-muted-foreground">{t('marginDialog.noSuggestions')}</p>
            <Button variant="outline" onClick={onRetry}>
              {t('marginDialog.tryAgain')}
            </Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
