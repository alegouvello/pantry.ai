import { Plus, FileText, LogIn } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { PurchaseOrderCard } from '@/components/orders/PurchaseOrderCard';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { usePurchaseOrders, useApprovePurchaseOrder, useSendPurchaseOrder } from '@/hooks/usePurchaseOrders';
import { useVendors } from '@/hooks/useVendors';
import { useAuth } from '@/hooks/useAuth';
import { Link } from 'react-router-dom';

export default function Orders() {
  const { user, loading: authLoading } = useAuth();
  const { data: orders, isLoading: ordersLoading } = usePurchaseOrders();
  const { data: vendors, isLoading: vendorsLoading } = useVendors();
  const approveMutation = useApprovePurchaseOrder();
  const sendMutation = useSendPurchaseOrder();

  if (!authLoading && !user) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] space-y-6">
        <div className="text-center space-y-2">
          <h1 className="text-2xl font-bold text-foreground">Sign in required</h1>
          <p className="text-muted-foreground">
            Please sign in to view and manage purchase orders.
          </p>
        </div>
        <Link to="/auth">
          <Button variant="accent" size="lg">
            <LogIn className="h-5 w-5 mr-2" />
            Sign In
          </Button>
        </Link>
      </div>
    );
  }

  const handleApprove = (id: string) => {
    approveMutation.mutate(id);
  };

  const handleSend = (id: string) => {
    sendMutation.mutate(id);
  };

  const draftOrders = orders?.filter((o) => o.status === 'draft') || [];
  const activeOrders = orders?.filter((o) =>
    ['approved', 'sent', 'partial'].includes(o.status)
  ) || [];
  const completedOrders = orders?.filter((o) => o.status === 'received') || [];

  // Map orders to the format expected by PurchaseOrderCard
  const mapOrder = (order: typeof orders extends (infer T)[] | undefined ? T : never) => ({
    id: order.id,
    vendorId: order.vendor_id,
    vendorName: order.vendors?.name || 'Unknown Vendor',
    status: order.status,
    items: order.purchase_order_items?.map(item => ({
      ingredientId: item.ingredient_id,
      ingredientName: item.ingredients?.name || 'Unknown',
      quantity: item.quantity,
      unit: item.unit,
      unitCost: item.unit_cost,
      total: item.quantity * item.unit_cost,
    })) || [],
    totalAmount: order.total_amount,
    createdAt: new Date(order.created_at),
    expectedDelivery: order.expected_delivery ? new Date(order.expected_delivery) : undefined,
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Purchase Orders</h1>
          <p className="text-muted-foreground">
            Manage vendor orders and deliveries
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm">
            <FileText className="h-4 w-4 mr-2" />
            Export
          </Button>
          <Button variant="accent">
            <Plus className="h-4 w-4 mr-2" />
            Create Order
          </Button>
        </div>
      </div>

      {/* Tabs */}
      <Tabs defaultValue="drafts" className="space-y-6">
        <TabsList className="bg-muted/50">
          <TabsTrigger value="drafts" className="gap-2">
            Drafts
            {draftOrders.length > 0 && (
              <Badge variant="warning" className="h-5 px-1.5 text-xs">
                {draftOrders.length}
              </Badge>
            )}
          </TabsTrigger>
          <TabsTrigger value="active" className="gap-2">
            Active
            {activeOrders.length > 0 && (
              <Badge variant="accent" className="h-5 px-1.5 text-xs">
                {activeOrders.length}
              </Badge>
            )}
          </TabsTrigger>
          <TabsTrigger value="completed">Completed</TabsTrigger>
        </TabsList>

        <TabsContent value="drafts" className="space-y-4">
          {ordersLoading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {[...Array(3)].map((_, i) => (
                <Card key={i} variant="elevated" className="p-5">
                  <Skeleton className="h-10 w-10 rounded-xl mb-4" />
                  <Skeleton className="h-5 w-32 mb-2" />
                  <Skeleton className="h-32 w-full" />
                </Card>
              ))}
            </div>
          ) : draftOrders.length === 0 ? (
            <Card variant="elevated" className="p-8 text-center">
              <p className="text-muted-foreground">No draft orders</p>
            </Card>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {draftOrders.map((order) => (
                <PurchaseOrderCard
                  key={order.id}
                  order={mapOrder(order)}
                  onApprove={handleApprove}
                />
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="active" className="space-y-4">
          {ordersLoading ? (
            <Card variant="elevated" className="p-6">
              <Skeleton className="h-32 w-full" />
            </Card>
          ) : activeOrders.length === 0 ? (
            <Card variant="elevated" className="p-8 text-center">
              <p className="text-muted-foreground">No active orders</p>
            </Card>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {activeOrders.map((order) => (
                <PurchaseOrderCard
                  key={order.id}
                  order={mapOrder(order)}
                  onSend={handleSend}
                />
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="completed" className="space-y-4">
          {completedOrders.length === 0 ? (
            <Card variant="elevated" className="p-8 text-center">
              <p className="text-muted-foreground">No completed orders yet</p>
            </Card>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {completedOrders.map((order) => (
                <PurchaseOrderCard
                  key={order.id}
                  order={mapOrder(order)}
                />
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>

      {/* Vendors Quick View */}
      <Card variant="elevated">
        <CardHeader className="flex flex-row items-center justify-between pb-2">
          <CardTitle className="text-base font-semibold">
            Active Vendors
          </CardTitle>
          <Link to="/settings">
            <Button variant="ghost" size="sm">
              Manage Vendors
            </Button>
          </Link>
        </CardHeader>
        <CardContent>
          {vendorsLoading ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {[...Array(3)].map((_, i) => (
                <Skeleton key={i} className="h-24 w-full" />
              ))}
            </div>
          ) : vendors && vendors.length > 0 ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {vendors.map((vendor) => (
                <div
                  key={vendor.id}
                  className="p-4 rounded-lg bg-muted/30 border border-border"
                >
                  <h4 className="font-medium text-foreground">{vendor.name}</h4>
                  <p className="text-xs text-muted-foreground mt-1">
                    {vendor.delivery_days?.join(', ') || 'No delivery schedule'}
                  </p>
                  <div className="flex items-center gap-2 mt-2">
                    <Badge variant="secondary" className="text-xs">
                      {vendor.lead_time_days || 2}d lead
                    </Badge>
                    <Badge variant="muted" className="text-xs">
                      ${vendor.minimum_order || 0} min
                    </Badge>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-center text-muted-foreground py-4">
              No vendors configured yet
            </p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
