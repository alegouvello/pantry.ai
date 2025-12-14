import React, { useState, useMemo } from 'react';
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
import { format, subDays, startOfWeek, getHours } from 'date-fns';
import { TrendingUp, TrendingDown, Calendar, DollarSign, ShoppingBag, ChefHat, ChevronRight, Clock, Filter, X, GitCompare } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import heroSales from '@/assets/pages/hero-sales.jpg';
import SalesComparisonView from '@/components/sales/SalesComparisonView';

type TimeOfDay = 'all' | 'morning' | 'afternoon' | 'evening' | 'night';
type OrderSize = 'all' | 'small' | 'medium' | 'large';

const getTimeOfDay = (date: Date): TimeOfDay => {
  const hour = getHours(date);
  if (hour >= 5 && hour < 12) return 'morning';
  if (hour >= 12 && hour < 17) return 'afternoon';
  if (hour >= 17 && hour < 21) return 'evening';
  return 'night';
};

const getOrderSize = (itemCount: number): OrderSize => {
  if (itemCount <= 2) return 'small';
  if (itemCount <= 5) return 'medium';
  return 'large';
};

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
  const [expandedDates, setExpandedDates] = useState<Set<string>>(new Set());
  const [dishFilter, setDishFilter] = useState<string>('all');
  const [timeOfDayFilter, setTimeOfDayFilter] = useState<TimeOfDay>('all');
  const [orderSizeFilter, setOrderSizeFilter] = useState<OrderSize>('all');
  const [showComparison, setShowComparison] = useState(false);

  const toggleDateExpand = (dateKey: string) => {
    setExpandedDates(prev => {
      const next = new Set(prev);
      if (next.has(dateKey)) {
        next.delete(dateKey);
      } else {
        next.add(dateKey);
      }
      return next;
    });
  };

  const clearAllFilters = () => {
    setDishFilter('all');
    setTimeOfDayFilter('all');
    setOrderSizeFilter('all');
  };

  const hasActiveFilters = dishFilter !== 'all' || timeOfDayFilter !== 'all' || orderSizeFilter !== 'all';

  // Fetch recipes for price lookup
  const { data: recipes } = useQuery({
    queryKey: ['recipes-prices'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('recipes')
        .select('id, name, menu_price');
      if (error) throw error;
      return data || [];
    },
  });

  // Create price lookup map
  const priceMap = useMemo(() => {
    const map = new Map<string, number>();
    recipes?.forEach(recipe => {
      if (recipe.menu_price) {
        map.set(recipe.id, recipe.menu_price);
        map.set(recipe.name, recipe.menu_price);
      }
    });
    return map;
  }, [recipes]);

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

  // Get all unique dishes for filter dropdown
  const allDishes = useMemo(() => {
    if (!salesEvents?.length) return [];
    const dishSet = new Set<string>();
    salesEvents.forEach((event) => {
      const items = Array.isArray(event.items) ? event.items : [];
      items.forEach((item) => {
        const dishName = item.recipe_name || item.recipe_id;
        if (dishName) dishSet.add(dishName);
      });
    });
    return Array.from(dishSet).sort();
  }, [salesEvents]);

  // Filter sales events based on selected filters
  const filteredSalesEvents = useMemo(() => {
    if (!salesEvents?.length) return [];
    
    return salesEvents.filter((event) => {
      const eventDate = new Date(event.occurred_at);
      const items = Array.isArray(event.items) ? event.items : [];
      const itemCount = items.reduce((sum, item) => sum + (item.quantity || 1), 0);
      
      // Time of day filter
      if (timeOfDayFilter !== 'all' && getTimeOfDay(eventDate) !== timeOfDayFilter) {
        return false;
      }
      
      // Order size filter
      if (orderSizeFilter !== 'all' && getOrderSize(itemCount) !== orderSizeFilter) {
        return false;
      }
      
      // Dish filter
      if (dishFilter !== 'all') {
        const hasDish = items.some((item) => 
          (item.recipe_name || item.recipe_id) === dishFilter
        );
        if (!hasDish) return false;
      }
      
      return true;
    });
  }, [salesEvents, dishFilter, timeOfDayFilter, orderSizeFilter]);

  // Process data for charts
  const { dailySales, dailyOrders, topDishes, weeklyTrend, totalRevenue, totalOrders, avgOrderValue } = useMemo(() => {
    if (!filteredSalesEvents?.length) {
      return {
        dailySales: [],
        dailyOrders: new Map<string, SalesEvent[]>(),
        topDishes: [],
        weeklyTrend: [],
        totalRevenue: 0,
        totalOrders: 0,
        avgOrderValue: 0,
      };
    }

    // Daily sales aggregation
    const dailyMap = new Map<string, { dateKey: string; date: string; orders: number; items: number; revenue: number }>();
    const dailyOrdersMap = new Map<string, SalesEvent[]>();
    const dishMap = new Map<string, { name: string; count: number; revenue: number }>();

    let totalItems = 0;
    let totalOrderCount = 0;

    let totalRevenueSum = 0;

    filteredSalesEvents.forEach((event) => {
      const date = format(new Date(event.occurred_at), 'MMM dd');
      const dateKey = format(new Date(event.occurred_at), 'yyyy-MM-dd');
      
      const existing = dailyMap.get(dateKey) || { dateKey, date, orders: 0, items: 0, revenue: 0 };
      
      const items = Array.isArray(event.items) ? event.items : [];
      const orderItems = items.reduce((sum, item) => sum + (item.quantity || 1), 0);
      
      // Calculate revenue using actual menu prices
      const orderRevenue = items.reduce((sum, item) => {
        const price = priceMap.get(item.recipe_id) || priceMap.get(item.recipe_name) || 0;
        return sum + (price * (item.quantity || 1));
      }, 0);

      existing.orders += 1;
      existing.items += orderItems;
      existing.revenue += orderRevenue;
      dailyMap.set(dateKey, existing);

      // Group orders by date
      const existingOrders = dailyOrdersMap.get(dateKey) || [];
      existingOrders.push(event);
      dailyOrdersMap.set(dateKey, existingOrders);

      totalOrderCount += 1;
      totalItems += orderItems;
      totalRevenueSum += orderRevenue;

      // Aggregate by dish
      items.forEach((item) => {
        const dishKey = item.recipe_name || item.recipe_id;
        const price = priceMap.get(item.recipe_id) || priceMap.get(item.recipe_name) || 0;
        const existingDish = dishMap.get(dishKey) || { name: dishKey, count: 0, revenue: 0 };
        existingDish.count += item.quantity || 1;
        existingDish.revenue += (item.quantity || 1) * price;
        dishMap.set(dishKey, existingDish);
      });
    });

    const dailySales = Array.from(dailyMap.values()).sort((a, b) => 
      new Date(a.dateKey).getTime() - new Date(b.dateKey).getTime()
    );

    const topDishes = Array.from(dishMap.values())
      .sort((a, b) => b.count - a.count)
      .slice(0, 8);

    // Weekly trend
    const weeklyMap = new Map<string, number>();
    filteredSalesEvents.forEach((event) => {
      const weekStart = format(startOfWeek(new Date(event.occurred_at)), 'MMM dd');
      const items = Array.isArray(event.items) ? event.items : [];
      const itemCount = items.reduce((sum, item) => sum + (item.quantity || 1), 0);
      weeklyMap.set(weekStart, (weeklyMap.get(weekStart) || 0) + itemCount);
    });

    const weeklyTrend = Array.from(weeklyMap.entries()).map(([week, sales]) => ({
      week,
      sales,
    }));

    return {
      dailySales,
      dailyOrders: dailyOrdersMap,
      topDishes,
      weeklyTrend,
      totalRevenue: totalRevenueSum,
      totalOrders: totalOrderCount,
      avgOrderValue: totalOrderCount > 0 ? totalRevenueSum / totalOrderCount : 0,
    };
  }, [filteredSalesEvents, priceMap]);

  // Calculate trend
  const salesTrend = useMemo(() => {
    if (dailySales.length < 2) return 0;
    const firstHalf = dailySales.slice(0, Math.floor(dailySales.length / 2));
    const secondHalf = dailySales.slice(Math.floor(dailySales.length / 2));
    
    const firstAvg = firstHalf.reduce((sum, d) => sum + d.items, 0) / firstHalf.length;
    const secondAvg = secondHalf.reduce((sum, d) => sum + d.items, 0) / secondHalf.length;
    
    return firstAvg > 0 ? ((secondAvg - firstAvg) / firstAvg) * 100 : 0;
  }, [dailySales]);

  // Show comparison view if active
  if (showComparison) {
    return (
      <div className="space-y-6">
        {/* Hero Section for Comparison */}
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="relative h-48 md:h-56 rounded-2xl overflow-hidden"
        >
          <img 
            src={heroSales} 
            alt="Sales comparison" 
            className="w-full h-full object-cover"
          />
          <div className="absolute inset-0 bg-gradient-to-r from-background/95 via-background/70 to-transparent" />
          <div className="absolute inset-0 flex items-center">
            <div className="px-6 md:px-8">
              <motion.h1 
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.2, duration: 0.5 }}
                className="text-2xl md:text-3xl font-bold text-foreground mb-2"
              >
                Sales Comparison
              </motion.h1>
              <motion.p 
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.3, duration: 0.5 }}
                className="text-muted-foreground max-w-md"
              >
                Compare performance between different time periods
              </motion.p>
            </div>
          </div>
        </motion.div>

        <SalesComparisonView onClose={() => setShowComparison(false)} />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Hero Section */}
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="relative h-48 md:h-56 rounded-2xl overflow-hidden"
      >
        <img 
          src={heroSales} 
          alt="Sales analytics dashboard" 
          className="w-full h-full object-cover"
        />
        <div className="absolute inset-0 bg-gradient-to-r from-background/95 via-background/70 to-transparent" />
        <div className="absolute inset-0 flex items-center">
          <div className="px-6 md:px-8">
            <motion.h1 
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.2, duration: 0.5 }}
              className="text-2xl md:text-3xl font-bold text-foreground mb-2"
            >
              Sales History
            </motion.h1>
            <motion.p 
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.3, duration: 0.5 }}
              className="text-muted-foreground max-w-md"
            >
              Analyze sales trends, top dishes, and revenue patterns
            </motion.p>
          </div>
        </div>
        <div className="absolute top-4 right-4 flex gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowComparison(true)}
            className="backdrop-blur-sm"
          >
            <GitCompare className="h-4 w-4 mr-1" />
            Compare
          </Button>
          {[7, 14, 30].map((days) => (
            <Button
              key={days}
              variant={dateRange === days ? 'default' : 'outline'}
              size="sm"
              onClick={() => setDateRange(days as 7 | 14 | 30)}
              className="backdrop-blur-sm"
            >
              {days}D
            </Button>
          ))}
        </div>
      </motion.div>

      {/* Filter Section */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2, duration: 0.4 }}
      >
        <Card>
          <CardContent className="pt-4 pb-4">
            <div className="flex flex-wrap items-center gap-4">
              <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
                <Filter className="h-4 w-4" />
                Filters
              </div>
              
              {/* Dish Filter */}
              <Select value={dishFilter} onValueChange={setDishFilter}>
                <SelectTrigger className="w-[180px]">
                  <SelectValue placeholder="All Dishes" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Dishes</SelectItem>
                  {allDishes.map((dish) => (
                    <SelectItem key={dish} value={dish}>
                      {dish}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              {/* Time of Day Filter */}
              <Select value={timeOfDayFilter} onValueChange={(v) => setTimeOfDayFilter(v as TimeOfDay)}>
                <SelectTrigger className="w-[160px]">
                  <SelectValue placeholder="Any Time" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Any Time</SelectItem>
                  <SelectItem value="morning">Morning (5am-12pm)</SelectItem>
                  <SelectItem value="afternoon">Afternoon (12pm-5pm)</SelectItem>
                  <SelectItem value="evening">Evening (5pm-9pm)</SelectItem>
                  <SelectItem value="night">Night (9pm-5am)</SelectItem>
                </SelectContent>
              </Select>

              {/* Order Size Filter */}
              <Select value={orderSizeFilter} onValueChange={(v) => setOrderSizeFilter(v as OrderSize)}>
                <SelectTrigger className="w-[160px]">
                  <SelectValue placeholder="Any Size" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Any Size</SelectItem>
                  <SelectItem value="small">Small (1-2 items)</SelectItem>
                  <SelectItem value="medium">Medium (3-5 items)</SelectItem>
                  <SelectItem value="large">Large (6+ items)</SelectItem>
                </SelectContent>
              </Select>

              {/* Clear Filters */}
              {hasActiveFilters && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={clearAllFilters}
                  className="text-muted-foreground hover:text-foreground"
                >
                  <X className="h-4 w-4 mr-1" />
                  Clear
                </Button>
              )}

              {/* Filter Summary */}
              {hasActiveFilters && (
                <div className="ml-auto text-sm text-muted-foreground">
                  Showing {filteredSalesEvents.length} of {salesEvents?.length || 0} orders
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </motion.div>

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
            <CardDescription>Revenue per day based on menu prices</CardDescription>
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

      {/* Sales Details Table with Expandable Rows */}
      <Card>
        <CardHeader>
          <CardTitle>Sales Details</CardTitle>
          <CardDescription>Click on a date to view individual orders</CardDescription>
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
                    <th className="pb-3 pl-8 text-left text-sm font-medium text-muted-foreground">Date</th>
                    <th className="pb-3 text-right text-sm font-medium text-muted-foreground">Orders</th>
                    <th className="pb-3 text-right text-sm font-medium text-muted-foreground">Items Sold</th>
                    <th className="pb-3 text-right text-sm font-medium text-muted-foreground">Est. Revenue</th>
                  </tr>
                </thead>
                <tbody>
                  {dailySales.slice().reverse().map((day) => {
                    const isExpanded = expandedDates.has(day.dateKey);
                    const dayOrders = dailyOrders.get(day.dateKey) || [];
                    
                    return (
                      <React.Fragment key={day.dateKey}>
                        {/* Date Row - Clickable */}
                        <tr 
                          className="border-b border-border/50 cursor-pointer hover:bg-muted/30 transition-colors"
                          onClick={() => toggleDateExpand(day.dateKey)}
                        >
                          <td className="py-3 text-sm font-medium">
                            <div className="flex items-center gap-2">
                              <motion.div
                                initial={false}
                                animate={{ rotate: isExpanded ? 90 : 0 }}
                                transition={{ duration: 0.2 }}
                              >
                                <ChevronRight className="h-4 w-4 text-muted-foreground" />
                              </motion.div>
                              {day.date}
                            </div>
                          </td>
                          <td className="py-3 text-right text-sm">{day.orders}</td>
                          <td className="py-3 text-right text-sm">{day.items}</td>
                          <td className="py-3 text-right text-sm font-medium text-primary">
                            ${day.revenue.toLocaleString()}
                          </td>
                        </tr>
                        
                        {/* Expanded Order Details */}
                        <AnimatePresence>
                          {isExpanded && (
                            <tr>
                              <td colSpan={4} className="p-0">
                                <motion.div
                                  initial={{ height: 0, opacity: 0 }}
                                  animate={{ height: 'auto', opacity: 1 }}
                                  exit={{ height: 0, opacity: 0 }}
                                  transition={{ duration: 0.3, ease: 'easeInOut' }}
                                  className="overflow-hidden"
                                >
                                  <div className="bg-muted/20 border-b border-border/50 px-4 py-3">
                                    <div className="space-y-3">
                                      {dayOrders.sort((a, b) => 
                                        new Date(b.occurred_at).getTime() - new Date(a.occurred_at).getTime()
                                      ).map((order, orderIndex) => {
                                        const orderItems = Array.isArray(order.items) ? order.items : [];
                                        const orderTotal = orderItems.reduce((sum, item) => {
                                          const price = priceMap.get(item.recipe_id) || priceMap.get(item.recipe_name) || 0;
                                          return sum + (price * (item.quantity || 1));
                                        }, 0);
                                        
                                        return (
                                          <div 
                                            key={order.id} 
                                            className="bg-card rounded-lg p-4 border border-border/50"
                                          >
                                            <div className="flex items-center justify-between mb-3">
                                              <div className="flex items-center gap-3">
                                                <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center">
                                                  <ShoppingBag className="h-4 w-4 text-primary" />
                                                </div>
                                                <div>
                                                  <p className="text-sm font-medium">Order #{orderIndex + 1}</p>
                                                  <div className="flex items-center gap-1 text-xs text-muted-foreground">
                                                    <Clock className="h-3 w-3" />
                                                    {format(new Date(order.occurred_at), 'h:mm a')}
                                                  </div>
                                                </div>
                                              </div>
                                              <div className="text-right">
                                                <p className="text-sm font-medium text-primary">${orderTotal.toLocaleString()}</p>
                                                <p className="text-xs text-muted-foreground">
                                                  {orderItems.reduce((sum, item) => sum + (item.quantity || 1), 0)} items
                                                </p>
                                              </div>
                                            </div>
                                            
                                            {orderItems.length > 0 ? (
                                              <div className="space-y-2">
                                                {orderItems.map((item, itemIndex) => {
                                                  const itemPrice = priceMap.get(item.recipe_id) || priceMap.get(item.recipe_name) || 0;
                                                  return (
                                                    <div 
                                                      key={itemIndex}
                                                      className="flex items-center justify-between py-1.5 px-3 rounded bg-muted/30"
                                                    >
                                                      <div className="flex items-center gap-2">
                                                        <ChefHat className="h-3.5 w-3.5 text-muted-foreground" />
                                                        <span className="text-sm">{item.recipe_name || item.recipe_id}</span>
                                                      </div>
                                                      <div className="flex items-center gap-4">
                                                        <Badge variant="muted" className="text-xs">
                                                          ×{item.quantity || 1}
                                                        </Badge>
                                                        <span className="text-sm text-muted-foreground w-16 text-right">
                                                          ${((item.quantity || 1) * itemPrice).toLocaleString()}
                                                        </span>
                                                      </div>
                                                    </div>
                                                  );
                                                })}
                                              </div>
                                            ) : (
                                              <p className="text-sm text-muted-foreground text-center py-2">
                                                No item details available
                                              </p>
                                            )}
                                          </div>
                                        );
                                      })}
                                    </div>
                                  </div>
                                </motion.div>
                              </td>
                            </tr>
                          )}
                        </AnimatePresence>
                      </React.Fragment>
                    );
                  })}
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
