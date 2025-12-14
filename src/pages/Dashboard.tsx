import { motion } from 'framer-motion';
import {
  Package,
  AlertTriangle,
  TrendingUp,
  ShoppingCart,
  LogIn,
  ChefHat,
  Utensils,
  ArrowRight,
} from 'lucide-react';
import heroImage from '@/assets/dashboard/hero-kitchen.jpg';
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
      staggerChildren: 0.1,
      delayChildren: 0.2,
    },
  },
};

const itemVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.5, ease: [0.4, 0, 0.2, 1] as const },
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
    <motion.div 
      className="space-y-8"
      variants={containerVariants}
      initial="hidden"
      animate="visible"
    >
      {/* Hero Section with Image */}
      <motion.div 
        variants={itemVariants}
        className="relative h-48 md:h-64 rounded-2xl overflow-hidden"
      >
        <img 
          src={heroImage} 
          alt="Kitchen" 
          className="absolute inset-0 w-full h-full object-cover"
        />
        <div className="absolute inset-0 bg-gradient-to-r from-background/90 via-background/70 to-transparent" />
        <div className="absolute inset-0 flex items-center px-8 md:px-12">
          <div className="space-y-3">
            <h1 className="text-3xl md:text-4xl font-bold text-foreground tracking-tight">
              {getGreeting()}
            </h1>
            <p className="text-muted-foreground max-w-md">
              Your kitchen is running smoothly. Here's today's overview.
            </p>
            <div className="flex gap-3 pt-2">
              <Link to="/orders">
                <Button variant="accent" size="sm" className="shadow-lg shadow-accent/25">
                  <ShoppingCart className="h-4 w-4 mr-2" />
                  New Order
                </Button>
              </Link>
              <Link to="/recipes">
                <Button variant="outline" size="sm" className="bg-background/50 backdrop-blur-sm">
                  View Recipes
                  <ArrowRight className="h-4 w-4 ml-2" />
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </motion.div>

      {/* Metrics Grid - Simple and Clean */}
      <motion.div 
        variants={itemVariants}
        className="grid grid-cols-2 lg:grid-cols-4 gap-4"
      >
        {isLoading ? (
          <>
            {[...Array(4)].map((_, i) => (
              <Card key={i} className="p-5">
                <Skeleton className="h-4 w-20 mb-2" />
                <Skeleton className="h-8 w-12" />
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

      {/* Main Content - Two Column Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column - Alerts & Low Stock */}
        <motion.div variants={itemVariants} className="lg:col-span-2 space-y-6">
          {/* Alerts Card */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-3">
              <CardTitle className="text-base font-medium flex items-center gap-2">
                <AlertTriangle className="h-4 w-4 text-warning" />
                Active Alerts
              </CardTitle>
              <Link to="/alerts">
                <Button variant="ghost" size="sm" className="text-muted-foreground">
                  View All
                </Button>
              </Link>
            </CardHeader>
            <CardContent className="space-y-3">
              {alertsLoading ? (
                <div className="space-y-3">
                  {[...Array(2)].map((_, i) => (
                    <Skeleton key={i} className="h-16 w-full" />
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
                  <ChefHat className="h-10 w-10 mx-auto mb-3 text-success/60" />
                  <p className="font-medium text-foreground">All clear!</p>
                  <p className="text-sm">Your inventory looks great.</p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Low Stock */}
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

        {/* Right Column - Summary Cards */}
        <motion.div variants={itemVariants} className="space-y-6">
          <RecipeSummary />
          <FoodCostChart />
          <RecentActivity />
        </motion.div>
      </div>
    </motion.div>
  );
}
