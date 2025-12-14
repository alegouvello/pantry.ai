import { Clock, Package, ShoppingCart, AlertTriangle, Check, ChefHat } from 'lucide-react';
import { motion } from 'framer-motion';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { cn } from '@/lib/utils';
import { useInventoryEvents } from '@/hooks/useInventoryEvents';
import { usePurchaseOrdersByStatus } from '@/hooks/usePurchaseOrders';
import { useActiveAlerts } from '@/hooks/useAlerts';
import { formatDistanceToNow } from 'date-fns';

interface Activity {
  id: string;
  type: 'order' | 'inventory' | 'alert' | 'delivery' | 'recipe';
  message: string;
  time: string;
  timestamp: Date;
}

export function RecentActivity() {
  const { data: inventoryEvents } = useInventoryEvents();
  const { data: recentOrders } = usePurchaseOrdersByStatus(['draft', 'approved', 'sent', 'received']);
  const { data: alerts } = useActiveAlerts();

  // Build activities from real data
  const activities: Activity[] = [];

  // Add inventory events (last 3)
  inventoryEvents?.slice(0, 3).forEach(event => {
    activities.push({
      id: `inv-${event.id}`,
      type: 'inventory',
      message: `${event.event_type === 'sale' ? 'Depleted' : event.event_type === 'receiving' ? 'Received' : 'Adjusted'} ${Math.abs(event.quantity)} ${event.ingredients?.name || 'item'}`,
      time: formatDistanceToNow(new Date(event.created_at), { addSuffix: true }),
      timestamp: new Date(event.created_at),
    });
  });

  // Add recent orders (last 2)
  recentOrders?.slice(0, 2).forEach(order => {
    activities.push({
      id: `ord-${order.id}`,
      type: order.status === 'received' ? 'delivery' : 'order',
      message: order.status === 'received' 
        ? `Delivery received from ${order.vendors?.name || 'vendor'}`
        : `PO ${order.status} - ${order.vendors?.name || 'vendor'}`,
      time: formatDistanceToNow(new Date(order.updated_at), { addSuffix: true }),
      timestamp: new Date(order.updated_at),
    });
  });

  // Add recent alerts (last 2)
  alerts?.slice(0, 2).forEach(alert => {
    activities.push({
      id: `alert-${alert.id}`,
      type: 'alert',
      message: alert.title,
      time: formatDistanceToNow(new Date(alert.created_at), { addSuffix: true }),
      timestamp: new Date(alert.created_at),
    });
  });

  // Sort by timestamp and take top 5
  const sortedActivities = activities
    .sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime())
    .slice(0, 5);

  const getIcon = (type: Activity['type']) => {
    switch (type) {
      case 'order':
        return ShoppingCart;
      case 'inventory':
        return Package;
      case 'alert':
        return AlertTriangle;
      case 'delivery':
        return Check;
      case 'recipe':
        return ChefHat;
    }
  };

  const getIconColor = (type: Activity['type']) => {
    switch (type) {
      case 'order':
        return 'text-primary bg-primary/10';
      case 'inventory':
        return 'text-accent bg-accent/10';
      case 'alert':
        return 'text-warning bg-warning/10';
      case 'delivery':
        return 'text-success bg-success/10';
      case 'recipe':
        return 'text-primary bg-primary/10';
    }
  };

  return (
    <Card variant="elevated" className="backdrop-blur-sm bg-card/80 border-border/50">
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <CardTitle className="text-base font-semibold flex items-center gap-2">
          <div className="p-1.5 rounded-lg bg-primary/10">
            <Clock className="h-4 w-4 text-primary" />
          </div>
          Recent Activity
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-1">
          {sortedActivities.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <Clock className="h-8 w-8 mx-auto mb-2 opacity-30" />
              <p className="text-sm">No recent activity</p>
            </div>
          ) : (
            sortedActivities.map((activity, index) => {
              const Icon = getIcon(activity.type);
              const colorClass = getIconColor(activity.type);

              return (
                <motion.div
                  key={activity.id}
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: index * 0.05 }}
                  className={cn(
                    "flex items-start gap-3 p-3 rounded-lg hover:bg-muted/30 transition-colors",
                    index !== sortedActivities.length - 1 && "border-b border-border/30"
                  )}
                >
                  <div className={cn("p-2 rounded-lg shrink-0", colorClass)}>
                    <Icon className="h-3.5 w-3.5" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-foreground">{activity.message}</p>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      {activity.time}
                    </p>
                  </div>
                </motion.div>
              );
            })
          )}
        </div>
      </CardContent>
    </Card>
  );
}
