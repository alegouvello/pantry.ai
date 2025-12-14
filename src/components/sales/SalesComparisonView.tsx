import React, { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from 'recharts';
import { format, subDays } from 'date-fns';
import { TrendingUp, TrendingDown, ArrowRight, Calendar } from 'lucide-react';
import { motion } from 'framer-motion';

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

type DateRangeOption = 7 | 14 | 30;

interface SalesComparisonViewProps {
  onClose: () => void;
}

const processSalesData = (events: SalesEvent[]) => {
  let totalItems = 0;
  let totalOrders = 0;
  let totalRevenue = 0;
  const dailyMap = new Map<string, { day: number; items: number; revenue: number; orders: number }>();
  const dishMap = new Map<string, number>();

  events.forEach((event) => {
    const eventDate = new Date(event.occurred_at);
    const dayOfRange = eventDate.getDate();
    const items = Array.isArray(event.items) ? event.items : [];
    const orderItems = items.reduce((sum, item) => sum + (item.quantity || 1), 0);
    const orderRevenue = orderItems * 25;

    totalOrders += 1;
    totalItems += orderItems;
    totalRevenue += orderRevenue;

    const dayKey = format(eventDate, 'EEE');
    const existing = dailyMap.get(dayKey) || { day: dayOfRange, items: 0, revenue: 0, orders: 0 };
    existing.items += orderItems;
    existing.revenue += orderRevenue;
    existing.orders += 1;
    dailyMap.set(dayKey, existing);

    items.forEach((item) => {
      const dishName = item.recipe_name || item.recipe_id;
      dishMap.set(dishName, (dishMap.get(dishName) || 0) + (item.quantity || 1));
    });
  });

  const topDishes = Array.from(dishMap.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([name, count]) => ({ name, count }));

  return {
    totalItems,
    totalOrders,
    totalRevenue,
    avgOrderValue: totalOrders > 0 ? totalRevenue / totalOrders : 0,
    topDishes,
  };
};

export default function SalesComparisonView({ onClose }: SalesComparisonViewProps) {
  const [period1Range, setPeriod1Range] = React.useState<DateRangeOption>(7);
  const [period2Range, setPeriod2Range] = React.useState<DateRangeOption>(7);

  // Period 1: Current period (most recent)
  const { data: period1Events, isLoading: loading1 } = useQuery({
    queryKey: ['sales-comparison-period1', period1Range],
    queryFn: async () => {
      const endDate = new Date();
      const startDate = subDays(endDate, period1Range);
      const { data, error } = await supabase
        .from('sales_events')
        .select('*')
        .gte('occurred_at', startDate.toISOString())
        .lte('occurred_at', endDate.toISOString())
        .order('occurred_at', { ascending: true });

      if (error) throw error;
      return (data || []).map(event => ({
        ...event,
        items: (event.items as unknown as SaleItem[]) || [],
      })) as SalesEvent[];
    },
  });

  // Period 2: Previous period (before period 1)
  const { data: period2Events, isLoading: loading2 } = useQuery({
    queryKey: ['sales-comparison-period2', period1Range, period2Range],
    queryFn: async () => {
      const endDate = subDays(new Date(), period1Range);
      const startDate = subDays(endDate, period2Range);
      const { data, error } = await supabase
        .from('sales_events')
        .select('*')
        .gte('occurred_at', startDate.toISOString())
        .lt('occurred_at', endDate.toISOString())
        .order('occurred_at', { ascending: true });

      if (error) throw error;
      return (data || []).map(event => ({
        ...event,
        items: (event.items as unknown as SaleItem[]) || [],
      })) as SalesEvent[];
    },
  });

  const period1Data = useMemo(() => processSalesData(period1Events || []), [period1Events]);
  const period2Data = useMemo(() => processSalesData(period2Events || []), [period2Events]);

  const isLoading = loading1 || loading2;

  // Calculate percentage changes
  const revenueChange = period2Data.totalRevenue > 0 
    ? ((period1Data.totalRevenue - period2Data.totalRevenue) / period2Data.totalRevenue) * 100 
    : 0;
  const ordersChange = period2Data.totalOrders > 0 
    ? ((period1Data.totalOrders - period2Data.totalOrders) / period2Data.totalOrders) * 100 
    : 0;
  const itemsChange = period2Data.totalItems > 0 
    ? ((period1Data.totalItems - period2Data.totalItems) / period2Data.totalItems) * 100 
    : 0;
  const avgOrderChange = period2Data.avgOrderValue > 0 
    ? ((period1Data.avgOrderValue - period2Data.avgOrderValue) / period2Data.avgOrderValue) * 100 
    : 0;

  // Prepare comparison chart data
  const comparisonChartData = useMemo(() => {
    const allDishes = new Set([
      ...period1Data.topDishes.map(d => d.name),
      ...period2Data.topDishes.map(d => d.name),
    ]);

    return Array.from(allDishes).slice(0, 6).map(dish => {
      const p1 = period1Data.topDishes.find(d => d.name === dish)?.count || 0;
      const p2 = period2Data.topDishes.find(d => d.name === dish)?.count || 0;
      return {
        name: dish.length > 12 ? dish.slice(0, 12) + '...' : dish,
        'Current Period': p1,
        'Previous Period': p2,
      };
    });
  }, [period1Data.topDishes, period2Data.topDishes]);

  const renderChangeIndicator = (change: number) => {
    if (change === 0) return <Badge variant="secondary">No change</Badge>;
    return (
      <div className={`flex items-center gap-1 ${change > 0 ? 'text-green-600' : 'text-red-600'}`}>
        {change > 0 ? <TrendingUp className="h-4 w-4" /> : <TrendingDown className="h-4 w-4" />}
        <span className="font-medium">{Math.abs(change).toFixed(1)}%</span>
      </div>
    );
  };

  const getPeriodLabel = (range: DateRangeOption) => {
    return `Last ${range} days`;
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      className="space-y-6"
    >
      {/* Period Selection */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Calendar className="h-5 w-5 text-muted-foreground" />
                Period Comparison
              </CardTitle>
              <CardDescription>Compare sales performance between two time periods</CardDescription>
            </div>
            <Button variant="outline" onClick={onClose}>
              Back to Overview
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap items-center gap-4">
            <div className="flex items-center gap-2">
              <span className="text-sm text-muted-foreground">Current:</span>
              <Select 
                value={period1Range.toString()} 
                onValueChange={(v) => setPeriod1Range(Number(v) as DateRangeOption)}
              >
                <SelectTrigger className="w-[140px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="7">Last 7 days</SelectItem>
                  <SelectItem value="14">Last 14 days</SelectItem>
                  <SelectItem value="30">Last 30 days</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <ArrowRight className="h-4 w-4 text-muted-foreground" />

            <div className="flex items-center gap-2">
              <span className="text-sm text-muted-foreground">vs Previous:</span>
              <Select 
                value={period2Range.toString()} 
                onValueChange={(v) => setPeriod2Range(Number(v) as DateRangeOption)}
              >
                <SelectTrigger className="w-[140px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="7">7 days before</SelectItem>
                  <SelectItem value="14">14 days before</SelectItem>
                  <SelectItem value="30">30 days before</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Comparison Metrics */}
      <div className="grid gap-4 md:grid-cols-4">
        {/* Revenue Comparison */}
        <Card>
          <CardContent className="pt-6">
            <p className="text-sm text-muted-foreground mb-2">Revenue</p>
            {isLoading ? (
              <Skeleton className="h-16 w-full" />
            ) : (
              <div className="space-y-2">
                <div className="flex items-baseline justify-between">
                  <span className="text-2xl font-bold">${period1Data.totalRevenue.toLocaleString()}</span>
                  {renderChangeIndicator(revenueChange)}
                </div>
                <div className="text-sm text-muted-foreground">
                  vs ${period2Data.totalRevenue.toLocaleString()} prev
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Orders Comparison */}
        <Card>
          <CardContent className="pt-6">
            <p className="text-sm text-muted-foreground mb-2">Orders</p>
            {isLoading ? (
              <Skeleton className="h-16 w-full" />
            ) : (
              <div className="space-y-2">
                <div className="flex items-baseline justify-between">
                  <span className="text-2xl font-bold">{period1Data.totalOrders.toLocaleString()}</span>
                  {renderChangeIndicator(ordersChange)}
                </div>
                <div className="text-sm text-muted-foreground">
                  vs {period2Data.totalOrders.toLocaleString()} prev
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Items Sold Comparison */}
        <Card>
          <CardContent className="pt-6">
            <p className="text-sm text-muted-foreground mb-2">Items Sold</p>
            {isLoading ? (
              <Skeleton className="h-16 w-full" />
            ) : (
              <div className="space-y-2">
                <div className="flex items-baseline justify-between">
                  <span className="text-2xl font-bold">{period1Data.totalItems.toLocaleString()}</span>
                  {renderChangeIndicator(itemsChange)}
                </div>
                <div className="text-sm text-muted-foreground">
                  vs {period2Data.totalItems.toLocaleString()} prev
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Avg Order Value Comparison */}
        <Card>
          <CardContent className="pt-6">
            <p className="text-sm text-muted-foreground mb-2">Avg Order Value</p>
            {isLoading ? (
              <Skeleton className="h-16 w-full" />
            ) : (
              <div className="space-y-2">
                <div className="flex items-baseline justify-between">
                  <span className="text-2xl font-bold">${period1Data.avgOrderValue.toFixed(0)}</span>
                  {renderChangeIndicator(avgOrderChange)}
                </div>
                <div className="text-sm text-muted-foreground">
                  vs ${period2Data.avgOrderValue.toFixed(0)} prev
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Comparison Charts */}
      <div className="grid gap-6 lg:grid-cols-2">
        {/* Dish Comparison Chart */}
        <Card>
          <CardHeader>
            <CardTitle>Top Dishes Comparison</CardTitle>
            <CardDescription>How top-selling dishes performed across periods</CardDescription>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <Skeleton className="h-[300px] w-full" />
            ) : comparisonChartData.length > 0 ? (
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={comparisonChartData} layout="vertical">
                  <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                  <XAxis type="number" tick={{ fontSize: 12 }} />
                  <YAxis 
                    dataKey="name" 
                    type="category" 
                    width={100}
                    tick={{ fontSize: 11 }}
                  />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: 'hsl(var(--card))',
                      border: '1px solid hsl(var(--border))',
                      borderRadius: '8px',
                    }}
                  />
                  <Legend />
                  <Bar
                    dataKey="Current Period"
                    fill="hsl(var(--primary))"
                    radius={[0, 4, 4, 0]}
                  />
                  <Bar
                    dataKey="Previous Period"
                    fill="hsl(var(--muted-foreground))"
                    radius={[0, 4, 4, 0]}
                  />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex h-[300px] items-center justify-center text-muted-foreground">
                No data available for comparison
              </div>
            )}
          </CardContent>
        </Card>

        {/* Performance Summary */}
        <Card>
          <CardHeader>
            <CardTitle>Performance Summary</CardTitle>
            <CardDescription>Key insights from the comparison</CardDescription>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="space-y-4">
                {[...Array(4)].map((_, i) => (
                  <Skeleton key={i} className="h-16 w-full" />
                ))}
              </div>
            ) : (
              <div className="space-y-4">
                {/* Revenue insight */}
                <div className="flex items-center gap-4 p-4 rounded-lg bg-muted/30">
                  <div className={`h-10 w-10 rounded-full flex items-center justify-center ${
                    revenueChange >= 0 ? 'bg-green-500/10' : 'bg-red-500/10'
                  }`}>
                    {revenueChange >= 0 ? (
                      <TrendingUp className="h-5 w-5 text-green-600" />
                    ) : (
                      <TrendingDown className="h-5 w-5 text-red-600" />
                    )}
                  </div>
                  <div>
                    <p className="font-medium">
                      Revenue {revenueChange >= 0 ? 'increased' : 'decreased'} by {Math.abs(revenueChange).toFixed(1)}%
                    </p>
                    <p className="text-sm text-muted-foreground">
                      ${Math.abs(period1Data.totalRevenue - period2Data.totalRevenue).toLocaleString()} difference
                    </p>
                  </div>
                </div>

                {/* Orders insight */}
                <div className="flex items-center gap-4 p-4 rounded-lg bg-muted/30">
                  <div className={`h-10 w-10 rounded-full flex items-center justify-center ${
                    ordersChange >= 0 ? 'bg-green-500/10' : 'bg-red-500/10'
                  }`}>
                    {ordersChange >= 0 ? (
                      <TrendingUp className="h-5 w-5 text-green-600" />
                    ) : (
                      <TrendingDown className="h-5 w-5 text-red-600" />
                    )}
                  </div>
                  <div>
                    <p className="font-medium">
                      {Math.abs(period1Data.totalOrders - period2Data.totalOrders)} {ordersChange >= 0 ? 'more' : 'fewer'} orders
                    </p>
                    <p className="text-sm text-muted-foreground">
                      {ordersChange >= 0 ? 'Increased' : 'Decreased'} customer activity
                    </p>
                  </div>
                </div>

                {/* Top performer */}
                {period1Data.topDishes[0] && (
                  <div className="flex items-center gap-4 p-4 rounded-lg bg-primary/5 border border-primary/10">
                    <div className="h-10 w-10 rounded-full flex items-center justify-center bg-primary/10">
                      <span className="text-lg">🏆</span>
                    </div>
                    <div>
                      <p className="font-medium">Top seller: {period1Data.topDishes[0].name}</p>
                      <p className="text-sm text-muted-foreground">
                        {period1Data.topDishes[0].count} items sold in current period
                      </p>
                    </div>
                  </div>
                )}

                {/* Avg order value insight */}
                <div className="flex items-center gap-4 p-4 rounded-lg bg-muted/30">
                  <div className={`h-10 w-10 rounded-full flex items-center justify-center ${
                    avgOrderChange >= 0 ? 'bg-green-500/10' : 'bg-red-500/10'
                  }`}>
                    {avgOrderChange >= 0 ? (
                      <TrendingUp className="h-5 w-5 text-green-600" />
                    ) : (
                      <TrendingDown className="h-5 w-5 text-red-600" />
                    )}
                  </div>
                  <div>
                    <p className="font-medium">
                      Average order value {avgOrderChange >= 0 ? 'up' : 'down'} ${Math.abs(period1Data.avgOrderValue - period2Data.avgOrderValue).toFixed(0)}
                    </p>
                    <p className="text-sm text-muted-foreground">
                      {avgOrderChange >= 0 ? 'Customers spending more per visit' : 'Smaller orders on average'}
                    </p>
                  </div>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </motion.div>
  );
}