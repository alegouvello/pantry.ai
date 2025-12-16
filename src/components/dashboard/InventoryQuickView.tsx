import { Package, TrendingDown, AlertTriangle } from 'lucide-react';
import { motion } from 'framer-motion';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Ingredient } from '@/types/inventory';
import { cn } from '@/lib/utils';
import { useTranslation } from 'react-i18next';

interface InventoryQuickViewProps {
  ingredients: Ingredient[];
}

export function InventoryQuickView({ ingredients }: InventoryQuickViewProps) {
  const { t } = useTranslation();
  
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
    <Card variant="elevated" className="backdrop-blur-sm bg-card/80 border-border/50">
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <CardTitle className="text-base font-semibold flex items-center gap-2">
          <div className="p-1.5 rounded-lg bg-warning/10">
            <Package className="h-4 w-4 text-warning" />
          </div>
          {t('dashboard.lowStock.title')}
        </CardTitle>
        <Badge variant="warning" className="text-xs">
          {lowStockItems.length} {t('dashboard.lowStock.items')}
        </Badge>
      </CardHeader>
      <CardContent className="space-y-2">
        {lowStockItems.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            <div className="w-12 h-12 mx-auto mb-3 rounded-full bg-success/10 flex items-center justify-center">
              <Package className="h-6 w-6 text-success" />
            </div>
            <p className="text-sm font-medium text-foreground">{t('dashboard.lowStock.allStocked')}</p>
            <p className="text-xs mt-1">{t('dashboard.lowStock.wellStocked')}</p>
          </div>
        ) : (
          lowStockItems.map((item, index) => {
            const percentage = getStockPercentage(item.currentStock, item.parLevel);
            const status = getStockStatus(item.currentStock, item.reorderPoint, item.parLevel);

            return (
              <motion.div 
                key={item.id} 
                className="p-3 rounded-lg bg-muted/20 border border-border/30 space-y-2"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.05 }}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    {status === 'critical' && (
                      <AlertTriangle className="h-3.5 w-3.5 text-destructive animate-pulse" />
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
              </motion.div>
            );
          })
        )}
      </CardContent>
    </Card>
  );
}
