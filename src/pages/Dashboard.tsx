import {
  Package,
  AlertTriangle,
  Clock,
  DollarSign,
  TrendingUp,
  ShoppingCart,
} from 'lucide-react';
import { MetricCard } from '@/components/dashboard/MetricCard';
import { AlertCard } from '@/components/dashboard/AlertCard';
import { InventoryQuickView } from '@/components/dashboard/InventoryQuickView';
import { RecentActivity } from '@/components/dashboard/RecentActivity';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import {
  mockIngredients,
  mockAlerts,
  mockDashboardMetrics,
} from '@/data/mockData';

export default function Dashboard() {
  const handleResolveAlert = (id: string) => {
    console.log('Resolving alert:', id);
  };

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Dashboard</h1>
          <p className="text-muted-foreground">
            Good morning! Here's your inventory overview.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline">
            <Clock className="h-4 w-4 mr-2" />
            Cycle Count
          </Button>
          <Button variant="accent">
            <ShoppingCart className="h-4 w-4 mr-2" />
            New Order
          </Button>
        </div>
      </div>

      {/* Metrics Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <MetricCard
          title="Total Items"
          value={mockDashboardMetrics.totalIngredients}
          subtitle="Across all locations"
          icon={Package}
        />
        <MetricCard
          title="Low Stock"
          value={mockDashboardMetrics.lowStockItems}
          subtitle="Needs attention"
          icon={AlertTriangle}
          variant="warning"
        />
        <MetricCard
          title="Inventory Value"
          value={`$${mockDashboardMetrics.totalInventoryValue.toLocaleString()}`}
          subtitle="Total cost value"
          icon={DollarSign}
          variant="accent"
          trend={{ value: 5.2, isPositive: true }}
        />
        <MetricCard
          title="Weekly Usage"
          value={`$${mockDashboardMetrics.weeklyUsage.toLocaleString()}`}
          subtitle="Cost of goods sold"
          icon={TrendingUp}
          variant="success"
          trend={{ value: 2.1, isPositive: false }}
        />
      </div>

      {/* Main Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Alerts Section */}
        <div className="lg:col-span-2 space-y-4">
          <Card variant="elevated">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-base font-semibold flex items-center gap-2">
                <AlertTriangle className="h-4 w-4 text-warning" />
                Active Alerts
              </CardTitle>
              <Button variant="ghost" size="sm">
                View All
              </Button>
            </CardHeader>
            <CardContent className="space-y-3">
              {mockAlerts.slice(0, 3).map((alert) => (
                <AlertCard
                  key={alert.id}
                  alert={alert}
                  onResolve={handleResolveAlert}
                />
              ))}
            </CardContent>
          </Card>
        </div>

        {/* Sidebar Widgets */}
        <div className="space-y-6">
          <InventoryQuickView ingredients={mockIngredients} />
          <RecentActivity />
        </div>
      </div>
    </div>
  );
}
