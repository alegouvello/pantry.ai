import { Clock, Package, ShoppingCart, AlertTriangle, Check } from 'lucide-react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { cn } from '@/lib/utils';

interface Activity {
  id: string;
  type: 'order' | 'inventory' | 'alert' | 'delivery';
  message: string;
  time: string;
}

const mockActivities: Activity[] = [
  {
    id: '1',
    type: 'order',
    message: 'PO #1234 sent to Premium Foods Co.',
    time: '10 min ago',
  },
  {
    id: '2',
    type: 'inventory',
    message: 'Chicken Breast depleted by 8 lb (POS sync)',
    time: '25 min ago',
  },
  {
    id: '3',
    type: 'delivery',
    message: 'Delivery received from Fresh Farm Direct',
    time: '1 hour ago',
  },
  {
    id: '4',
    type: 'alert',
    message: 'Low stock alert triggered for Roma Tomatoes',
    time: '2 hours ago',
  },
  {
    id: '5',
    type: 'inventory',
    message: 'Cycle count completed for Walk-in Cooler',
    time: '3 hours ago',
  },
];

export function RecentActivity() {
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
    }
  };

  return (
    <Card variant="elevated">
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <CardTitle className="text-base font-semibold flex items-center gap-2">
          <Clock className="h-4 w-4 text-primary" />
          Recent Activity
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {mockActivities.map((activity, index) => {
            const Icon = getIcon(activity.type);
            const colorClass = getIconColor(activity.type);

            return (
              <div
                key={activity.id}
                className={cn(
                  "flex items-start gap-3 animate-fade-in",
                  index !== mockActivities.length - 1 && "pb-4 border-b border-border"
                )}
                style={{ animationDelay: `${index * 50}ms` }}
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
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}
