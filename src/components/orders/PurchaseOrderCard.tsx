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
  const statusConfig = {
    draft: {
      label: 'Draft',
      variant: 'muted' as const,
      icon: Clock,
    },
    approved: {
      label: 'Approved',
      variant: 'accent' as const,
      icon: Check,
    },
    sent: {
      label: 'Sent',
      variant: 'warning' as const,
      icon: Send,
    },
    received: {
      label: 'Received',
      variant: 'success' as const,
      icon: Check,
    },
    partial: {
      label: 'Partial',
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
            <p className="text-xs text-muted-foreground">PO #{order.id}</p>
          </div>
        </div>
        <Badge variant={config.variant} className="flex items-center gap-1">
          <StatusIcon className="h-3 w-3" />
          {config.label}
        </Badge>
      </div>

      <div className="space-y-3 mb-4">
        <div className="flex items-center justify-between text-sm">
          <span className="text-muted-foreground">Items</span>
          <span className="text-foreground">{order.items.length} items</span>
        </div>
        <div className="flex items-center justify-between text-sm">
          <span className="text-muted-foreground">Total</span>
          <span className="font-semibold text-foreground">
            ${order.totalAmount.toFixed(2)}
          </span>
        </div>
        {order.expectedDelivery && (
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground flex items-center gap-1">
              <Calendar className="h-3.5 w-3.5" />
              Expected
            </span>
            <span className="text-foreground">
              {format(order.expectedDelivery, 'MMM d, yyyy')}
            </span>
          </div>
        )}
      </div>

      <div className="border-t border-border pt-4">
        <p className="text-xs text-muted-foreground mb-2">Order Items:</p>
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
              +{order.items.length - 3} more items
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
              Approve
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
              Send to Vendor
            </Button>
          )}
        </div>
      )}
    </Card>
  );
}
