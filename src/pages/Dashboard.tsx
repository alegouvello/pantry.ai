import { motion } from 'framer-motion';
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

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.08,
      delayChildren: 0.1,
    },
  },
};

const itemVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.4, ease: [0.4, 0, 0.2, 1] as const },
  },
};

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
    <div className="relative min-h-full">
      {/* Decorative gradient orbs - matching onboarding */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <motion.div 
          className="absolute -top-32 -right-32 w-96 h-96 bg-primary/10 rounded-full blur-3xl"
          animate={{ 
            scale: [1, 1.2, 1],
            opacity: [0.2, 0.4, 0.2],
          }}
          transition={{ duration: 8, repeat: Infinity, ease: "easeInOut" }}
        />
        <motion.div 
          className="absolute bottom-0 -left-32 w-80 h-80 bg-accent/5 rounded-full blur-3xl"
          animate={{ 
            scale: [1.2, 1, 1.2],
            opacity: [0.1, 0.3, 0.1],
          }}
          transition={{ duration: 10, repeat: Infinity, ease: "easeInOut" }}
        />
      </div>

      <motion.div 
        className="relative z-10 space-y-8"
        variants={containerVariants}
        initial="hidden"
        animate="visible"
      >
        {/* Header */}
        <motion.div 
          variants={itemVariants}
          className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4"
        >
          <div>
            <h1 className="text-3xl font-bold text-foreground tracking-tight">Dashboard</h1>
            <p className="text-muted-foreground mt-1">
              {getGreeting()}! Here's your restaurant overview.
            </p>
          </div>
          <div className="flex items-center gap-3">
            <Link to="/inventory">
              <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
                <Button variant="outline" className="backdrop-blur-sm bg-background/50">
                  <Clock className="h-4 w-4 mr-2" />
                  Cycle Count
                </Button>
              </motion.div>
            </Link>
            <Link to="/orders">
              <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
                <Button variant="accent" className="shadow-lg shadow-accent/25">
                  <ShoppingCart className="h-4 w-4 mr-2" />
                  New Order
                </Button>
              </motion.div>
            </Link>
          </div>
        </motion.div>

        {/* Metrics Grid */}
        <motion.div 
          variants={itemVariants}
          className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4"
        >
          {isLoading ? (
            <>
              {[...Array(4)].map((_, i) => (
                <Card key={i} variant="elevated" className="p-6 backdrop-blur-sm bg-card/80">
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
        </motion.div>

        {/* Main Content Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left Column - Alerts */}
          <motion.div variants={itemVariants} className="lg:col-span-2 space-y-6">
            <Card variant="elevated" className="backdrop-blur-sm bg-card/80 border-border/50">
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-base font-semibold flex items-center gap-2">
                  <div className="p-1.5 rounded-lg bg-warning/10">
                    <AlertTriangle className="h-4 w-4 text-warning" />
                  </div>
                  Active Alerts
                </CardTitle>
                <Link to="/alerts">
                  <Button variant="ghost" size="sm" className="text-muted-foreground hover:text-foreground">
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
                  activeAlerts.slice(0, 3).map((alert, index) => (
                    <motion.div
                      key={alert.id}
                      initial={{ opacity: 0, x: -10 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: index * 0.1 }}
                    >
                      <AlertCard
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
                    </motion.div>
                  ))
                ) : (
                  <div className="text-center py-12 text-muted-foreground">
                    <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-success/10 flex items-center justify-center">
                      <ChefHat className="h-8 w-8 text-success" />
                    </div>
                    <p className="font-medium text-foreground">All clear!</p>
                    <p className="text-sm mt-1">Your inventory looks great.</p>
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
          </motion.div>

          {/* Right Column - Recipe Summary, Food Cost & Activity */}
          <motion.div variants={itemVariants} className="space-y-6">
            <RecipeSummary />
            <FoodCostChart />
            <RecentActivity />
          </motion.div>
        </div>
      </motion.div>
    </div>
  );
}