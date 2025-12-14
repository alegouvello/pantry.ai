import { useState, useCallback } from 'react';
import { motion } from 'framer-motion';
import { TrendingDown, Package, ArrowRight, Sparkles, Minus, Plus } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import type { SuggestedOrder, SuggestedOrderItem } from '@/hooks/useSuggestedOrders';

interface SuggestedOrderCardProps {
  suggestion: SuggestedOrder;
  onCreateOrder: (suggestion: SuggestedOrder) => void;
}

export function SuggestedOrderCard({ suggestion, onCreateOrder }: SuggestedOrderCardProps) {
  const [editedItems, setEditedItems] = useState<Record<string, number>>(() => 
    Object.fromEntries(suggestion.items.map(item => [item.ingredientId, item.suggestedQuantity]))
  );

  const updateQuantity = useCallback((ingredientId: string, delta: number) => {
    setEditedItems(prev => ({
      ...prev,
      [ingredientId]: Math.max(0, (prev[ingredientId] || 0) + delta)
    }));
  }, []);

  const setQuantity = useCallback((ingredientId: string, value: number) => {
    setEditedItems(prev => ({
      ...prev,
      [ingredientId]: Math.max(0, value)
    }));
  }, []);

  const getEditedTotal = useCallback(() => {
    return suggestion.items.reduce((sum, item) => {
      const qty = editedItems[item.ingredientId] ?? item.suggestedQuantity;
      return sum + (qty * item.unitCost);
    }, 0);
  }, [suggestion.items, editedItems]);

  const handleCreateOrder = useCallback(() => {
    const editedSuggestion: SuggestedOrder = {
      ...suggestion,
      items: suggestion.items
        .map(item => ({
          ...item,
          suggestedQuantity: editedItems[item.ingredientId] ?? item.suggestedQuantity
        }))
        .filter(item => item.suggestedQuantity > 0),
      totalAmount: getEditedTotal()
    };
    onCreateOrder(editedSuggestion);
  }, [suggestion, editedItems, getEditedTotal, onCreateOrder]);

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

  const activeItemCount = suggestion.items.filter(
    item => (editedItems[item.ingredientId] ?? item.suggestedQuantity) > 0
  ).length;

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
                  {activeItemCount} item{activeItemCount !== 1 ? 's' : ''} in order
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

          {/* Items Preview with Editable Quantities */}
          <div className="space-y-2 max-h-64 overflow-y-auto">
            {suggestion.items.map((item) => {
              const currentQty = editedItems[item.ingredientId] ?? item.suggestedQuantity;
              const itemTotal = currentQty * item.unitCost;
              
              return (
                <div
                  key={item.ingredientId}
                  className="flex items-center justify-between py-2 px-3 rounded-lg bg-muted/30"
                >
                  <div className="flex items-center gap-2 min-w-0 flex-1">
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
                  
                  <div className="flex items-center gap-2 flex-shrink-0 ml-2">
                    <div className="flex items-center gap-1">
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-6 w-6"
                        onClick={() => updateQuantity(item.ingredientId, -1)}
                        disabled={currentQty <= 0}
                      >
                        <Minus className="h-3 w-3" />
                      </Button>
                      <Input
                        type="number"
                        value={currentQty}
                        onChange={(e) => setQuantity(item.ingredientId, parseFloat(e.target.value) || 0)}
                        className="h-7 w-16 text-center text-sm px-1"
                        min={0}
                      />
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-6 w-6"
                        onClick={() => updateQuantity(item.ingredientId, 1)}
                      >
                        <Plus className="h-3 w-3" />
                      </Button>
                    </div>
                    <span className="text-xs text-muted-foreground w-8">{item.unit}</span>
                    <span className="text-sm font-medium w-16 text-right">
                      ${itemTotal.toFixed(2)}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Total & Action */}
          <div className="flex items-center justify-between pt-2 border-t border-border">
            <div>
              <p className="text-xs text-muted-foreground">Estimated Total</p>
              <p className="text-lg font-bold text-foreground">
                ${getEditedTotal().toFixed(2)}
              </p>
            </div>
            <Button
              variant="accent"
              size="sm"
              onClick={handleCreateOrder}
              disabled={suggestion.vendorId === 'unassigned' || activeItemCount === 0}
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
