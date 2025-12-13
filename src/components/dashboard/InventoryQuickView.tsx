import { Package, TrendingDown, AlertTriangle } from 'lucide-react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Ingredient } from '@/types/inventory';
import { cn } from '@/lib/utils';

interface InventoryQuickViewProps {
  ingredients: Ingredient[];
}

export function InventoryQuickView({ ingredients }: InventoryQuickViewProps) {
  const lowStockItems = ingredients
    .filter((i) => i.currentStock <= i.reorderPoint)
    .slice(0, 5);

  const getStockPercentage = (current: number, par: number) => {
    return Math.min(100, Math.round((current / par) * 100));
  };

  const getStockStatus = (current: number, reorder: number, par: number) => {
    if (current <= reorder * 0.5) return 'critical';
    if (current <= reorder) return 'low';
    if (current <= par * 0.7) return 'medium';
    return 'good';
  };

  return (
    <Card variant="elevated">
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <CardTitle className="text-base font-semibold flex items-center gap-2">
          <Package className="h-4 w-4 text-primary" />
          Low Stock Items
        </CardTitle>
        <Badge variant="warning" className="text-xs">
          {lowStockItems.length} items
        </Badge>
      </CardHeader>
      <CardContent className="space-y-4">
        {lowStockItems.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-4">
            All items are well-stocked!
          </p>
        ) : (
          lowStockItems.map((item) => {
            const percentage = getStockPercentage(item.currentStock, item.parLevel);
            const status = getStockStatus(item.currentStock, item.reorderPoint, item.parLevel);

            return (
              <div key={item.id} className="space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    {status === 'critical' && (
                      <AlertTriangle className="h-3.5 w-3.5 text-destructive animate-pulse-subtle" />
                    )}
                    {status === 'low' && (
                      <TrendingDown className="h-3.5 w-3.5 text-warning" />
                    )}
                    <span className="text-sm font-medium text-foreground">
                      {item.name}
                    </span>
                  </div>
                  <span className="text-xs text-muted-foreground">
                    {item.currentStock} / {item.parLevel} {item.unit}
                  </span>
                </div>
                <Progress
                  value={percentage}
                  className={cn(
                    "h-1.5",
                    status === 'critical' && "[&>div]:bg-destructive",
                    status === 'low' && "[&>div]:bg-warning",
                    status === 'medium' && "[&>div]:bg-accent",
                    status === 'good' && "[&>div]:bg-success"
                  )}
                />
              </div>
            );
          })
        )}
      </CardContent>
    </Card>
  );
}
