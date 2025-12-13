import {
  Package,
  AlertTriangle,
  Clock,
  DollarSign,
  TrendingUp,
  ShoppingCart,
  LogIn,
} from 'lucide-react';
import { MetricCard } from '@/components/dashboard/MetricCard';
import { AlertCard } from '@/components/dashboard/AlertCard';
import { InventoryQuickView } from '@/components/dashboard/InventoryQuickView';
import { RecentActivity } from '@/components/dashboard/RecentActivity';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { useIngredients, useLowStockIngredients } from '@/hooks/useIngredients';
import { useActiveAlerts, useResolveAlert } from '@/hooks/useAlerts';
import { usePurchaseOrdersByStatus } from '@/hooks/usePurchaseOrders';
import { useAuth } from '@/hooks/useAuth';
import { Link } from 'react-router-dom';

export default function Dashboard() {
  const { user, loading: authLoading } = useAuth();
  const { data: ingredients, isLoading: ingredientsLoading } = useIngredients();
  const { data: lowStockItems, isLoading: lowStockLoading } = useLowStockIngredients();
  const { data: activeAlerts, isLoading: alertsLoading } = useActiveAlerts();
  const { data: pendingOrders } = usePurchaseOrdersByStatus(['draft', 'approved', 'sent']);
  const resolveAlert = useResolveAlert();

  const handleResolveAlert = (id: string) => {
    resolveAlert.mutate(id);
  };

  // Calculate metrics
  const totalIngredients = ingredients?.length ?? 0;
  const lowStockCount = lowStockItems?.length ?? 0;
  const totalInventoryValue = ingredients?.reduce(
    (sum, item) => sum + (item.current_stock * item.unit_cost),
    0
  ) ?? 0;
  const pendingOrdersCount = pendingOrders?.length ?? 0;

  // Show login prompt if not authenticated
  if (!authLoading && !user) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] space-y-6">
        <div className="text-center space-y-2">
          <Package className="h-16 w-16 text-primary mx-auto mb-4" />
          <h1 className="text-2xl font-bold text-foreground">Welcome to Pantry</h1>
          <p className="text-muted-foreground max-w-md">
            Sign in to access your restaurant's inventory management dashboard.
          </p>
        </div>
        <Link to="/auth">
          <Button variant="accent" size="lg">
            <LogIn className="h-5 w-5 mr-2" />
            Sign In to Continue
          </Button>
        </Link>
      </div>
    );
  }

  const isLoading = ingredientsLoading || lowStockLoading || alertsLoading;

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
          <Link to="/orders">
            <Button variant="accent">
              <ShoppingCart className="h-4 w-4 mr-2" />
              New Order
            </Button>
          </Link>
        </div>
      </div>

      {/* Metrics Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {isLoading ? (
          <>
            {[...Array(4)].map((_, i) => (
              <Card key={i} variant="elevated" className="p-6">
                <Skeleton className="h-4 w-24 mb-2" />
                <Skeleton className="h-8 w-16" />
              </Card>
            ))}
          </>
        ) : (
          <>
            <MetricCard
              title="Total Items"
              value={totalIngredients}
              subtitle="Active ingredients"
              icon={Package}
            />
            <MetricCard
              title="Low Stock"
              value={lowStockCount}
              subtitle="Needs attention"
              icon={AlertTriangle}
              variant="warning"
            />
            <MetricCard
              title="Inventory Value"
              value={`$${totalInventoryValue.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`}
              subtitle="Total cost value"
              icon={DollarSign}
              variant="accent"
            />
            <MetricCard
              title="Pending Orders"
              value={pendingOrdersCount}
              subtitle="Awaiting action"
              icon={TrendingUp}
              variant="success"
            />
          </>
        )}
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
              <Link to="/alerts">
                <Button variant="ghost" size="sm">
                  View All
                </Button>
              </Link>
            </CardHeader>
            <CardContent className="space-y-3">
              {alertsLoading ? (
                <div className="space-y-3">
                  {[...Array(3)].map((_, i) => (
                    <Skeleton key={i} className="h-24 w-full" />
                  ))}
                </div>
              ) : activeAlerts && activeAlerts.length > 0 ? (
                activeAlerts.slice(0, 3).map((alert) => (
                  <AlertCard
                    key={alert.id}
                    alert={{
                      id: alert.id,
                      type: alert.type,
                      severity: alert.severity,
                      title: alert.title,
                      description: alert.description || '',
                      suggestedAction: alert.suggested_action || '',
                      relatedItemId: alert.related_item_id || undefined,
                      createdAt: new Date(alert.created_at),
                      isResolved: alert.is_resolved || false,
                    }}
                    onResolve={handleResolveAlert}
                  />
                ))
              ) : (
                <div className="text-center py-8 text-muted-foreground">
                  <AlertTriangle className="h-8 w-8 mx-auto mb-2 opacity-50" />
                  <p>No active alerts</p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Sidebar Widgets */}
        <div className="space-y-6">
          <InventoryQuickView 
            ingredients={lowStockItems?.map(item => ({
              id: item.id,
              name: item.name,
              category: item.category,
              unit: item.unit,
              storageLocation: item.storage_location || 'dry_storage',
              currentStock: item.current_stock,
              parLevel: item.par_level,
              reorderPoint: item.reorder_point,
              unitCost: item.unit_cost,
              lastUpdated: new Date(item.updated_at),
            })) || []} 
          />
          <RecentActivity />
        </div>
      </div>
    </div>
  );
}
