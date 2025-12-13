import { Plus, FileText, Filter } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { PurchaseOrderCard } from '@/components/orders/PurchaseOrderCard';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { mockPurchaseOrders, mockVendors } from '@/data/mockData';
import { useState } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

export default function Orders() {
  const [orders, setOrders] = useState(mockPurchaseOrders);

  const handleApprove = (id: string) => {
    setOrders((prev) =>
      prev.map((order) =>
        order.id === id ? { ...order, status: 'approved' as const } : order
      )
    );
  };

  const handleSend = (id: string) => {
    setOrders((prev) =>
      prev.map((order) =>
        order.id === id ? { ...order, status: 'sent' as const } : order
      )
    );
  };

  const draftOrders = orders.filter((o) => o.status === 'draft');
  const activeOrders = orders.filter((o) =>
    ['approved', 'sent', 'partial'].includes(o.status)
  );
  const completedOrders = orders.filter((o) => o.status === 'received');

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
          {draftOrders.length === 0 ? (
            <Card variant="elevated" className="p-8 text-center">
              <p className="text-muted-foreground">No draft orders</p>
            </Card>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {draftOrders.map((order) => (
                <PurchaseOrderCard
                  key={order.id}
                  order={order}
                  onApprove={handleApprove}
                />
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="active" className="space-y-4">
          {activeOrders.length === 0 ? (
            <Card variant="elevated" className="p-8 text-center">
              <p className="text-muted-foreground">No active orders</p>
            </Card>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {activeOrders.map((order) => (
                <PurchaseOrderCard
                  key={order.id}
                  order={order}
                  onSend={handleSend}
                />
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="completed" className="space-y-4">
          <Card variant="elevated" className="p-8 text-center">
            <p className="text-muted-foreground">No completed orders yet</p>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Vendors Quick View */}
      <Card variant="elevated">
        <CardHeader className="flex flex-row items-center justify-between pb-2">
          <CardTitle className="text-base font-semibold">
            Active Vendors
          </CardTitle>
          <Button variant="ghost" size="sm">
            Manage Vendors
          </Button>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {mockVendors.map((vendor) => (
              <div
                key={vendor.id}
                className="p-4 rounded-lg bg-muted/30 border border-border"
              >
                <h4 className="font-medium text-foreground">{vendor.name}</h4>
                <p className="text-xs text-muted-foreground mt-1">
                  {vendor.deliveryDays.join(', ')}
                </p>
                <div className="flex items-center gap-2 mt-2">
                  <Badge variant="secondary" className="text-xs">
                    {vendor.leadTimeDays}d lead
                  </Badge>
                  <Badge variant="muted" className="text-xs">
                    ${vendor.minimumOrder} min
                  </Badge>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
