import { useTranslation } from 'react-i18next';
import { ShoppingCart, Calendar, Truck, Check, Clock, Send } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { PurchaseOrder } from '@/types/inventory';
import { format } from 'date-fns';

interface PurchaseOrderCardProps {
  order: PurchaseOrder;
  onApprove?: (id: string) => void;
  onSend?: (id: string) => void;
}

export function PurchaseOrderCard({ order, onApprove, onSend }: PurchaseOrderCardProps) {
  const { t } = useTranslation();

  const statusConfig = {
    draft: {
      labelKey: 'status.draft',
      variant: 'muted' as const,
      icon: Clock,
    },
    approved: {
      labelKey: 'status.approved',
      variant: 'accent' as const,
      icon: Check,
    },
    sent: {
      labelKey: 'status.sent',
      variant: 'warning' as const,
      icon: Send,
    },
    received: {
      labelKey: 'status.received',
      variant: 'success' as const,
      icon: Check,
    },
    partial: {
      labelKey: 'status.partial',
      variant: 'medium' as const,
      icon: Truck,
    },
  };

  const config = statusConfig[order.status];
  const StatusIcon = config.icon;

  return (
    <Card variant="elevated" className="p-5">
      <div className="flex items-start justify-between mb-4">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-xl bg-accent/10 flex items-center justify-center">
            <ShoppingCart className="h-5 w-5 text-accent" />
          </div>
          <div>
            <h3 className="font-semibold text-foreground">{order.vendorName}</h3>
            <p className="text-xs text-muted-foreground">{t('orderCard.poNumber', { id: order.id.slice(0, 8) })}</p>
          </div>
        </div>
        <Badge variant={config.variant} className="flex items-center gap-1">
          <StatusIcon className="h-3 w-3" />
          {t(config.labelKey)}
        </Badge>
      </div>

      <div className="space-y-3 mb-4">
        <div className="flex items-center justify-between text-sm">
          <span className="text-muted-foreground">{t('common.items')}</span>
          <span className="text-foreground">{t('orderCard.itemCount', { count: order.items.length })}</span>
        </div>
        <div className="flex items-center justify-between text-sm">
          <span className="text-muted-foreground">{t('common.total')}</span>
          <span className="font-semibold text-foreground">
            ${order.totalAmount.toFixed(2)}
          </span>
        </div>
        {order.expectedDelivery && (
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground flex items-center gap-1">
              <Calendar className="h-3.5 w-3.5" />
              {t('orderCard.expected')}
            </span>
            <span className="text-foreground">
              {format(order.expectedDelivery, 'MMM d, yyyy')}
            </span>
          </div>
        )}
      </div>

      <div className="border-t border-border pt-4">
        <p className="text-xs text-muted-foreground mb-2">{t('orderCard.orderItems')}</p>
        <div className="space-y-1.5">
          {order.items.slice(0, 3).map((item) => (
            <div
              key={item.ingredientId}
              className="flex items-center justify-between text-sm"
            >
              <span className="text-foreground">{item.ingredientName}</span>
              <span className="text-muted-foreground">
                {item.quantity} {item.unit}
              </span>
            </div>
          ))}
          {order.items.length > 3 && (
            <p className="text-xs text-muted-foreground">
              {t('orderCard.moreItems', { count: order.items.length - 3 })}
            </p>
          )}
        </div>
      </div>

      {(order.status === 'draft' || order.status === 'approved') && (
        <div className="mt-4 pt-4 border-t border-border flex gap-2">
          {order.status === 'draft' && onApprove && (
            <Button
              variant="accent"
              size="sm"
              className="flex-1"
              onClick={() => onApprove(order.id)}
            >
              <Check className="h-4 w-4 mr-1" />
              {t('orderCard.approve')}
            </Button>
          )}
          {order.status === 'approved' && onSend && (
            <Button
              variant="default"
              size="sm"
              className="flex-1"
              onClick={() => onSend(order.id)}
            >
              <Send className="h-4 w-4 mr-1" />
              {t('orderCard.sendToVendor')}
            </Button>
          )}
        </div>
      )}
    </Card>
  );
}
