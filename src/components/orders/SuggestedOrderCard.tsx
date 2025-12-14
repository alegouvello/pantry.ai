import { motion } from 'framer-motion';
import { AlertTriangle, TrendingDown, Package, ArrowRight, Sparkles } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import type { SuggestedOrder } from '@/hooks/useSuggestedOrders';

interface SuggestedOrderCardProps {
  suggestion: SuggestedOrder;
  onCreateOrder: (suggestion: SuggestedOrder) => void;
}

export function SuggestedOrderCard({ suggestion, onCreateOrder }: SuggestedOrderCardProps) {
  const urgencyStyles = {
    high: 'border-destructive/50 bg-destructive/5',
    medium: 'border-warning/50 bg-warning/5',
    low: 'border-border',
  };

  const urgencyBadge = {
    high: { variant: 'destructive' as const, label: 'Urgent' },
    medium: { variant: 'warning' as const, label: 'Soon' },
    low: { variant: 'secondary' as const, label: 'Optional' },
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
    >
      <Card className={`${urgencyStyles[suggestion.urgency]} transition-all hover:shadow-md`}>
        <CardHeader className="pb-3">
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-3">
              <div className={`flex h-10 w-10 items-center justify-center rounded-xl ${
                suggestion.urgency === 'high' ? 'bg-destructive/20 text-destructive' :
                suggestion.urgency === 'medium' ? 'bg-warning/20 text-warning' :
                'bg-primary/10 text-primary'
              }`}>
                <Sparkles className="h-5 w-5" />
              </div>
              <div>
                <CardTitle className="text-base font-semibold">
                  {suggestion.vendorName}
                </CardTitle>
                <p className="text-xs text-muted-foreground mt-0.5">
                  {suggestion.items.length} item{suggestion.items.length !== 1 ? 's' : ''} suggested
                </p>
              </div>
            </div>
            <Badge variant={urgencyBadge[suggestion.urgency].variant}>
              {urgencyBadge[suggestion.urgency].label}
            </Badge>
          </div>
        </CardHeader>
        
        <CardContent className="space-y-4">
          {/* Reason */}
          <p className="text-sm text-muted-foreground">
            {suggestion.reason}
          </p>

          {/* Items Preview */}
          <div className="space-y-2 max-h-48 overflow-y-auto">
            {suggestion.items.slice(0, 5).map((item) => (
              <div
                key={item.ingredientId}
                className="flex items-center justify-between py-2 px-3 rounded-lg bg-muted/30"
              >
                <div className="flex items-center gap-2 min-w-0">
                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <div className={`flex-shrink-0 p-1 rounded ${
                          item.reason === 'low_stock' ? 'bg-destructive/20' : 'bg-primary/20'
                        }`}>
                          {item.reason === 'low_stock' ? (
                            <TrendingDown className="h-3 w-3 text-destructive" />
                          ) : (
                            <Package className="h-3 w-3 text-primary" />
                          )}
                        </div>
                      </TooltipTrigger>
                      <TooltipContent>
                        {item.reason === 'low_stock' 
                          ? 'Below reorder point' 
                          : 'Needed for forecasted demand'}
                      </TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                  <span className="text-sm font-medium truncate">{item.ingredientName}</span>
                </div>
                <div className="text-right flex-shrink-0 ml-2">
                  <span className="text-sm font-semibold">
                    {item.suggestedQuantity} {item.unit}
                  </span>
                  <p className="text-xs text-muted-foreground">
                    ${(item.suggestedQuantity * item.unitCost).toFixed(2)}
                  </p>
                </div>
              </div>
            ))}
            {suggestion.items.length > 5 && (
              <p className="text-xs text-center text-muted-foreground py-1">
                +{suggestion.items.length - 5} more items
              </p>
            )}
          </div>

          {/* Total & Action */}
          <div className="flex items-center justify-between pt-2 border-t border-border">
            <div>
              <p className="text-xs text-muted-foreground">Estimated Total</p>
              <p className="text-lg font-bold text-foreground">
                ${suggestion.totalAmount.toFixed(2)}
              </p>
            </div>
            <Button
              variant="accent"
              size="sm"
              onClick={() => onCreateOrder(suggestion)}
              disabled={suggestion.vendorId === 'unassigned'}
            >
              Create PO
              <ArrowRight className="h-4 w-4 ml-1" />
            </Button>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
}
