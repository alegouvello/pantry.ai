import {
  Package,
  AlertTriangle,
  Clock,
  DollarSign,
  TrendingUp,
  ShoppingCart,
  LogIn,
  ChefHat,
  Utensils,
} from 'lucide-react';
import { MetricCard } from '@/components/dashboard/MetricCard';
import { AlertCard } from '@/components/dashboard/AlertCard';
import { InventoryQuickView } from '@/components/dashboard/InventoryQuickView';
import { RecentActivity } from '@/components/dashboard/RecentActivity';
import { RecipeSummary } from '@/components/dashboard/RecipeSummary';
import { FoodCostChart } from '@/components/dashboard/FoodCostChart';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { useIngredients, useLowStockIngredients } from '@/hooks/useIngredients';
import { useActiveAlerts, useResolveAlert } from '@/hooks/useAlerts';
import { usePurchaseOrdersByStatus } from '@/hooks/usePurchaseOrders';
import { useRecipes } from '@/hooks/useRecipes';
import { useAuth } from '@/hooks/useAuth';
import { Link } from 'react-router-dom';

export default function Dashboard() {
  const { user, loading: authLoading } = useAuth();
  const { data: ingredients, isLoading: ingredientsLoading } = useIngredients();
  const { data: lowStockItems, isLoading: lowStockLoading } = useLowStockIngredients();
  const { data: activeAlerts, isLoading: alertsLoading } = useActiveAlerts();
  const { data: pendingOrders } = usePurchaseOrdersByStatus(['draft', 'approved', 'sent']);
  const { data: recipes } = useRecipes();
  const resolveAlert = useResolveAlert();

  const handleResolveAlert = (id: string) => {
    resolveAlert.mutate(id);
  };

  // Calculate metrics
  const totalIngredients = ingredients?.length ?? 0;
  const lowStockCount = lowStockItems?.length ?? 0;
  const pendingOrdersCount = pendingOrders?.length ?? 0;
  
  // Recipe metrics
  const dishRecipes = recipes?.filter(r => r.recipe_type !== 'Prep') || [];
  const totalDishes = dishRecipes.length;

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

  // Get time-appropriate greeting
  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Good morning';
    if (hour < 17) return 'Good afternoon';
    return 'Good evening';
  };

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Dashboard</h1>
          <p className="text-muted-foreground">
            {getGreeting()}! Here's your restaurant overview.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Link to="/inventory">
            <Button variant="outline">
              <Clock className="h-4 w-4 mr-2" />
              Cycle Count
            </Button>
          </Link>
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
              title="Menu Items"
              value={totalDishes}
              subtitle="Active dishes"
              icon={Utensils}
            />
            <MetricCard
              title="Ingredients"
              value={totalIngredients}
              subtitle="In inventory"
              icon={Package}
            />
            <MetricCard
              title="Low Stock"
              value={lowStockCount}
              subtitle="Needs reorder"
              icon={AlertTriangle}
              variant="warning"
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
        {/* Left Column - Alerts */}
        <div className="lg:col-span-2 space-y-6">
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
                  {[...Array(2)].map((_, i) => (
                    <Skeleton key={i} className="h-20 w-full" />
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
                  <p className="text-sm">No active alerts</p>
                  <p className="text-xs mt-1">Your inventory looks great!</p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Low Stock Quick View */}
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
        </div>

        {/* Right Column - Recipe Summary, Food Cost & Activity */}
        <div className="space-y-6">
          <RecipeSummary />
          <FoodCostChart />
          <RecentActivity />
        </div>
      </div>
    </div>
  );
}