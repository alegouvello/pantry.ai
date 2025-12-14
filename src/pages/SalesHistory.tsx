import { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import {
  BarChart,
  Bar,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Legend,
} from 'recharts';
import { format, subDays, startOfWeek, endOfWeek, eachDayOfInterval } from 'date-fns';
import { TrendingUp, TrendingDown, Calendar, DollarSign, ShoppingBag, ChefHat } from 'lucide-react';

interface SaleItem {
  recipe_id: string;
  recipe_name: string;
  quantity: number;
}

interface SalesEvent {
  id: string;
  occurred_at: string;
  items: SaleItem[] | null;
}

const COLORS = [
  'hsl(var(--primary))',
  'hsl(var(--accent))',
  'hsl(142, 76%, 36%)',
  'hsl(262, 83%, 58%)',
  'hsl(24, 95%, 53%)',
  'hsl(200, 98%, 39%)',
  'hsl(340, 82%, 52%)',
  'hsl(47, 96%, 53%)',
];

export default function SalesHistory() {
  const [dateRange, setDateRange] = useState<7 | 14 | 30>(30);

  // Fetch sales events
  const { data: salesEvents, isLoading } = useQuery({
    queryKey: ['sales-history', dateRange],
    queryFn: async () => {
      const startDate = subDays(new Date(), dateRange).toISOString();
      const { data, error } = await supabase
        .from('sales_events')
        .select('*')
        .gte('occurred_at', startDate)
        .order('occurred_at', { ascending: true });

      if (error) throw error;
      // Cast items from JSON to our expected type
      return (data || []).map(event => ({
        ...event,
        items: (event.items as unknown as SaleItem[]) || [],
      })) as SalesEvent[];
    },
  });

  // Process data for charts
  const { dailySales, topDishes, weeklyTrend, totalRevenue, totalOrders, avgOrderValue } = useMemo(() => {
    if (!salesEvents?.length) {
      return {
        dailySales: [],
        topDishes: [],
        weeklyTrend: [],
        totalRevenue: 0,
        totalOrders: 0,
        avgOrderValue: 0,
      };
    }

    // Daily sales aggregation
    const dailyMap = new Map<string, { date: string; orders: number; items: number; revenue: number }>();
    const dishMap = new Map<string, { name: string; count: number; revenue: number }>();

    let totalItems = 0;
    let totalOrderCount = 0;

    salesEvents.forEach((event) => {
      const date = format(new Date(event.occurred_at), 'MMM dd');
      const dateKey = format(new Date(event.occurred_at), 'yyyy-MM-dd');
      
      const existing = dailyMap.get(dateKey) || { date, orders: 0, items: 0, revenue: 0 };
      
      const items = Array.isArray(event.items) ? event.items : [];
      const orderItems = items.reduce((sum, item) => sum + (item.quantity || 1), 0);
      const orderRevenue = orderItems * 25; // Estimated avg price per item

      existing.orders += 1;
      existing.items += orderItems;
      existing.revenue += orderRevenue;
      dailyMap.set(dateKey, existing);

      totalOrderCount += 1;
      totalItems += orderItems;

      // Aggregate by dish
      items.forEach((item) => {
        const dishKey = item.recipe_name || item.recipe_id;
        const existingDish = dishMap.get(dishKey) || { name: dishKey, count: 0, revenue: 0 };
        existingDish.count += item.quantity || 1;
        existingDish.revenue += (item.quantity || 1) * 25;
        dishMap.set(dishKey, existingDish);
      });
    });

    const dailySales = Array.from(dailyMap.values()).sort((a, b) => 
      new Date(a.date).getTime() - new Date(b.date).getTime()
    );

    const topDishes = Array.from(dishMap.values())
      .sort((a, b) => b.count - a.count)
      .slice(0, 8);

    // Weekly trend
    const weeklyMap = new Map<string, number>();
    salesEvents.forEach((event) => {
      const weekStart = format(startOfWeek(new Date(event.occurred_at)), 'MMM dd');
      const items = Array.isArray(event.items) ? event.items : [];
      const itemCount = items.reduce((sum, item) => sum + (item.quantity || 1), 0);
      weeklyMap.set(weekStart, (weeklyMap.get(weekStart) || 0) + itemCount);
    });

    const weeklyTrend = Array.from(weeklyMap.entries()).map(([week, sales]) => ({
      week,
      sales,
    }));

    const estimatedRevenue = totalItems * 25;

    return {
      dailySales,
      topDishes,
      weeklyTrend,
      totalRevenue: estimatedRevenue,
      totalOrders: totalOrderCount,
      avgOrderValue: totalOrderCount > 0 ? estimatedRevenue / totalOrderCount : 0,
    };
  }, [salesEvents]);

  // Calculate trend
  const salesTrend = useMemo(() => {
    if (dailySales.length < 2) return 0;
    const firstHalf = dailySales.slice(0, Math.floor(dailySales.length / 2));
    const secondHalf = dailySales.slice(Math.floor(dailySales.length / 2));
    
    const firstAvg = firstHalf.reduce((sum, d) => sum + d.items, 0) / firstHalf.length;
    const secondAvg = secondHalf.reduce((sum, d) => sum + d.items, 0) / secondHalf.length;
    
    return firstAvg > 0 ? ((secondAvg - firstAvg) / firstAvg) * 100 : 0;
  }, [dailySales]);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Sales History</h1>
          <p className="text-muted-foreground">
            Analyze sales trends, top dishes, and revenue patterns
          </p>
        </div>
        <div className="flex gap-2">
          {[7, 14, 30].map((days) => (
            <Button
              key={days}
              variant={dateRange === days ? 'default' : 'outline'}
              size="sm"
              onClick={() => setDateRange(days as 7 | 14 | 30)}
            >
              {days}D
            </Button>
          ))}
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
                <DollarSign className="h-5 w-5 text-primary" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Est. Revenue</p>
                {isLoading ? (
                  <Skeleton className="h-7 w-24" />
                ) : (
                  <p className="text-2xl font-bold">${totalRevenue.toLocaleString()}</p>
                )}
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-accent/10">
                <ShoppingBag className="h-5 w-5 text-accent" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Total Orders</p>
                {isLoading ? (
                  <Skeleton className="h-7 w-16" />
                ) : (
                  <p className="text-2xl font-bold">{totalOrders.toLocaleString()}</p>
                )}
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-green-500/10">
                <ChefHat className="h-5 w-5 text-green-600" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Avg Order Value</p>
                {isLoading ? (
                  <Skeleton className="h-7 w-20" />
                ) : (
                  <p className="text-2xl font-bold">${avgOrderValue.toFixed(0)}</p>
                )}
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className={`flex h-10 w-10 items-center justify-center rounded-lg ${
                salesTrend >= 0 ? 'bg-green-500/10' : 'bg-red-500/10'
              }`}>
                {salesTrend >= 0 ? (
                  <TrendingUp className="h-5 w-5 text-green-600" />
                ) : (
                  <TrendingDown className="h-5 w-5 text-red-600" />
                )}
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Sales Trend</p>
                {isLoading ? (
                  <Skeleton className="h-7 w-16" />
                ) : (
                  <div className="flex items-center gap-2">
                    <p className="text-2xl font-bold">{Math.abs(salesTrend).toFixed(1)}%</p>
                    <Badge variant={salesTrend >= 0 ? 'default' : 'destructive'}>
                      {salesTrend >= 0 ? 'Up' : 'Down'}
                    </Badge>
                  </div>
                )}
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Charts Row */}
      <div className="grid gap-6 lg:grid-cols-2">
        {/* Daily Sales Trend */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Calendar className="h-5 w-5 text-muted-foreground" />
              Daily Sales Trend
            </CardTitle>
            <CardDescription>Items sold per day over the selected period</CardDescription>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <Skeleton className="h-[300px] w-full" />
            ) : dailySales.length > 0 ? (
              <ResponsiveContainer width="100%" height={300}>
                <LineChart data={dailySales}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                  <XAxis 
                    dataKey="date" 
                    tick={{ fontSize: 12 }}
                    className="text-muted-foreground"
                  />
                  <YAxis 
                    tick={{ fontSize: 12 }}
                    className="text-muted-foreground"
                  />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: 'hsl(var(--card))',
                      border: '1px solid hsl(var(--border))',
                      borderRadius: '8px',
                    }}
                    labelStyle={{ color: 'hsl(var(--foreground))' }}
                  />
                  <Line
                    type="monotone"
                    dataKey="items"
                    stroke="hsl(var(--primary))"
                    strokeWidth={2}
                    dot={{ fill: 'hsl(var(--primary))', r: 4 }}
                    activeDot={{ r: 6 }}
                    name="Items Sold"
                  />
                </LineChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex h-[300px] items-center justify-center text-muted-foreground">
                No sales data available
              </div>
            )}
          </CardContent>
        </Card>

        {/* Top Selling Dishes */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <ChefHat className="h-5 w-5 text-muted-foreground" />
              Top Selling Dishes
            </CardTitle>
            <CardDescription>Best performers by quantity sold</CardDescription>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <Skeleton className="h-[300px] w-full" />
            ) : topDishes.length > 0 ? (
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={topDishes} layout="vertical">
                  <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                  <XAxis type="number" tick={{ fontSize: 12 }} />
                  <YAxis 
                    dataKey="name" 
                    type="category" 
                    width={120}
                    tick={{ fontSize: 11 }}
                    tickFormatter={(value) => value.length > 15 ? `${value.slice(0, 15)}...` : value}
                  />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: 'hsl(var(--card))',
                      border: '1px solid hsl(var(--border))',
                      borderRadius: '8px',
                    }}
                  />
                  <Bar
                    dataKey="count"
                    fill="hsl(var(--primary))"
                    radius={[0, 4, 4, 0]}
                    name="Quantity Sold"
                  />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex h-[300px] items-center justify-center text-muted-foreground">
                No dish data available
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Revenue and Distribution */}
      <div className="grid gap-6 lg:grid-cols-2">
        {/* Revenue by Day */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <DollarSign className="h-5 w-5 text-muted-foreground" />
              Daily Revenue
            </CardTitle>
            <CardDescription>Estimated revenue per day (based on avg $25/item)</CardDescription>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <Skeleton className="h-[300px] w-full" />
            ) : dailySales.length > 0 ? (
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={dailySales}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                  <XAxis 
                    dataKey="date" 
                    tick={{ fontSize: 12 }}
                  />
                  <YAxis 
                    tick={{ fontSize: 12 }}
                    tickFormatter={(value) => `$${value}`}
                  />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: 'hsl(var(--card))',
                      border: '1px solid hsl(var(--border))',
                      borderRadius: '8px',
                    }}
                    formatter={(value: number) => [`$${value.toLocaleString()}`, 'Revenue']}
                  />
                  <Bar
                    dataKey="revenue"
                    fill="hsl(var(--accent))"
                    radius={[4, 4, 0, 0]}
                    name="Revenue"
                  />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex h-[300px] items-center justify-center text-muted-foreground">
                No revenue data available
              </div>
            )}
          </CardContent>
        </Card>

        {/* Dish Distribution Pie Chart */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <ShoppingBag className="h-5 w-5 text-muted-foreground" />
              Sales Distribution
            </CardTitle>
            <CardDescription>Share of sales by dish</CardDescription>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <Skeleton className="h-[300px] w-full" />
            ) : topDishes.length > 0 ? (
              <ResponsiveContainer width="100%" height={300}>
                <PieChart>
                  <Pie
                    data={topDishes}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={100}
                    paddingAngle={2}
                    dataKey="count"
                    nameKey="name"
                    label={({ name, percent }) => 
                      `${name.slice(0, 10)}${name.length > 10 ? '...' : ''} (${(percent * 100).toFixed(0)}%)`
                    }
                    labelLine={false}
                  >
                    {topDishes.map((_, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip
                    contentStyle={{
                      backgroundColor: 'hsl(var(--card))',
                      border: '1px solid hsl(var(--border))',
                      borderRadius: '8px',
                    }}
                    formatter={(value: number, name: string) => [value, name]}
                  />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex h-[300px] items-center justify-center text-muted-foreground">
                No distribution data available
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Weekly Summary Table */}
      <Card>
        <CardHeader>
          <CardTitle>Sales Details</CardTitle>
          <CardDescription>Daily breakdown of orders and items sold</CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="space-y-2">
              {[...Array(5)].map((_, i) => (
                <Skeleton key={i} className="h-12 w-full" />
              ))}
            </div>
          ) : dailySales.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-border">
                    <th className="pb-3 text-left text-sm font-medium text-muted-foreground">Date</th>
                    <th className="pb-3 text-right text-sm font-medium text-muted-foreground">Orders</th>
                    <th className="pb-3 text-right text-sm font-medium text-muted-foreground">Items Sold</th>
                    <th className="pb-3 text-right text-sm font-medium text-muted-foreground">Est. Revenue</th>
                  </tr>
                </thead>
                <tbody>
                  {dailySales.slice().reverse().map((day, i) => (
                    <tr key={i} className="border-b border-border/50 last:border-0">
                      <td className="py-3 text-sm font-medium">{day.date}</td>
                      <td className="py-3 text-right text-sm">{day.orders}</td>
                      <td className="py-3 text-right text-sm">{day.items}</td>
                      <td className="py-3 text-right text-sm font-medium text-primary">
                        ${day.revenue.toLocaleString()}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="py-8 text-center text-muted-foreground">
              No sales data available for the selected period
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
