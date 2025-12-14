import { useState } from 'react';
import { motion } from 'framer-motion';
import { TrendingUp, Calendar, Package, AlertTriangle, Info, Sparkles, Cloud, Users } from 'lucide-react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { useForecast } from '@/hooks/useForecast';
import { Skeleton } from '@/components/ui/skeleton';
import { ForecastCalendar } from '@/components/forecast/ForecastCalendar';
import { ForecastEventDialog } from '@/components/forecast/ForecastEventDialog';
import { useWeatherForecast } from '@/hooks/useWeatherForecast';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import heroImage from '@/assets/pages/hero-forecast.jpg';

// Format quantity with smart unit conversion
const formatQuantity = (value: number, unit: string): string => {
  const lowerUnit = unit.toLowerCase();
  
  // Convert grams to kg if >= 1000
  if ((lowerUnit === 'g' || lowerUnit === 'gram' || lowerUnit === 'grams') && value >= 1000) {
    return `${(value / 1000).toLocaleString(undefined, { maximumFractionDigits: 1 })} kg`;
  }
  
  // Convert ml to L if >= 1000
  if ((lowerUnit === 'ml' || lowerUnit === 'milliliter' || lowerUnit === 'milliliters') && value >= 1000) {
    return `${(value / 1000).toLocaleString(undefined, { maximumFractionDigits: 1 })} L`;
  }
  
  // Format with proper number formatting
  const formatted = value >= 10 
    ? Math.round(value).toLocaleString() 
    : value.toLocaleString(undefined, { maximumFractionDigits: 1 });
    
  return `${formatted} ${unit}`;
};

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.1, delayChildren: 0.2 },
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

export default function Forecast() {
  const [daysAhead, setDaysAhead] = useState(3);
  
  const { data: restaurant } = useQuery({
    queryKey: ['user-restaurant'],
    queryFn: async () => {
      const { data } = await supabase
        .from('restaurants')
        .select('id, name, address')
        .limit(1)
        .single();
      return data;
    },
  });
  
  const restaurantId = restaurant?.id;
  const city = (restaurant?.address as { city?: string })?.city || 'New York';
  
  const { data: weatherData, isLoading: weatherLoading } = useWeatherForecast(city, undefined, undefined, Math.min(daysAhead, 5));
  const { dishes, ingredients, isLoading, salesPatterns, hasEventImpact, hasWeatherImpact, events, capacityConstrained, maxDailyCovers } = useForecast(daysAhead, restaurantId, weatherData?.forecast);

  const hasHistoricalData = salesPatterns && salesPatterns.length > 0;

  return (
    <motion.div 
      className="space-y-8"
      variants={containerVariants}
      initial="hidden"
      animate="visible"
    >
      {/* Hero Section */}
      <motion.div 
        variants={itemVariants}
        className="relative h-48 md:h-56 rounded-2xl overflow-hidden"
      >
        <img 
          src={heroImage} 
          alt="Forecast" 
          className="absolute inset-0 w-full h-full object-cover"
        />
        <div className="absolute inset-0 bg-gradient-to-r from-background/90 via-background/70 to-transparent" />
        <div className="absolute inset-0 flex items-center px-8 md:px-12">
          <div className="space-y-3">
            <h1 className="text-3xl md:text-4xl font-bold text-foreground tracking-tight">
              Forecast
            </h1>
            <p className="text-muted-foreground max-w-md">
              Predicted demand and ingredient needs based on patterns.
            </p>
            <div className="flex gap-3 pt-2">
              <Button variant="accent" size="sm">
                <TrendingUp className="h-4 w-4 mr-2" />
                Generate Orders
              </Button>
              <ForecastEventDialog restaurantId={restaurantId} />
            </div>
          </div>
        </div>
      </motion.div>

      {/* Time Range Selector */}
      <motion.div variants={itemVariants} className="flex gap-2">
        <Button 
          variant={daysAhead === 3 ? "secondary" : "ghost"} 
          size="sm"
          onClick={() => setDaysAhead(3)}
        >
          Next 3 Days
        </Button>
        <Button 
          variant={daysAhead === 7 ? "secondary" : "ghost"} 
          size="sm"
          onClick={() => setDaysAhead(7)}
        >
          Next 7 Days
        </Button>
        <Button 
          variant={daysAhead === 14 ? "secondary" : "ghost"} 
          size="sm"
          onClick={() => setDaysAhead(14)}
        >
          Next 14 Days
        </Button>
      </motion.div>

      {/* Data Source Indicator */}
      {!isLoading && (
        <motion.div 
          variants={itemVariants}
          className="flex flex-wrap items-center gap-4 text-sm text-muted-foreground"
        >
          <div className="flex items-center gap-2">
            <Info className="h-4 w-4" />
            {hasHistoricalData ? (
              <span>
                Forecast based on <strong>{salesPatterns.length}</strong> historical patterns
              </span>
            ) : (
              <span>
                Using default estimates. Connect POS for accurate forecasting.
              </span>
            )}
          </div>
          {hasEventImpact && (
            <div className="flex items-center gap-1 text-primary">
              <Sparkles className="h-4 w-4" />
              <span><strong>{events?.length || 0}</strong> events factored in</span>
            </div>
          )}
          {weatherData?.city && (
            <div className="flex items-center gap-1 text-blue-600">
              <Cloud className="h-4 w-4" />
              <span>Weather for <strong>{weatherData.city}</strong></span>
            </div>
          )}
          {capacityConstrained && maxDailyCovers && (
            <div className="flex items-center gap-1 text-amber-600">
              <Users className="h-4 w-4" />
              <span>Capped to <strong>{maxDailyCovers}</strong> covers/day ({restaurant?.name ? `${(restaurant as any).seats || 0} seats` : 'seat capacity'})</span>
            </div>
          )}
        </motion.div>
      )}

      {/* Event Calendar */}
      {restaurantId && (
        <motion.div variants={itemVariants}>
          <ForecastCalendar 
            restaurantId={restaurantId} 
            daysAhead={daysAhead} 
            weatherData={weatherData?.forecast}
          />
        </motion.div>
      )}

      <motion.div variants={itemVariants} className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Predicted Dish Sales */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base font-medium flex items-center gap-2">
              <TrendingUp className="h-4 w-4 text-primary" />
              Predicted Sales (Next {daysAhead} Days)
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {isLoading ? (
              Array.from({ length: 5 }).map((_, i) => (
                <Skeleton key={i} className="h-20 w-full" />
              ))
            ) : dishes.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <TrendingUp className="h-8 w-8 mx-auto mb-2 opacity-50" />
                <p>No recipes found</p>
                <p className="text-sm">Add recipes to see forecasted sales</p>
              </div>
            ) : (
              dishes.slice(0, 10).map((dish, index) => (
                <TooltipProvider key={dish.recipeId}>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <div className="flex items-center justify-between p-4 rounded-lg bg-muted/30 cursor-pointer hover:bg-muted/50 transition-colors">
                        <div className="flex items-center gap-3">
                          <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center">
                            <span className="text-lg font-bold text-primary">#{index + 1}</span>
                          </div>
                          <div>
                            <p className="font-medium text-foreground">{dish.recipeName}</p>
                            <div className="flex items-center gap-2">
                              <Badge variant="outline" className="text-xs">{dish.category}</Badge>
                              <span className="text-xs text-muted-foreground">{dish.confidence}% confidence</span>
                              {dish.eventImpact && (
                                <Badge variant={dish.eventImpact > 0 ? 'high' : 'low'} className="text-xs">
                                  {dish.eventImpact > 0 ? '+' : ''}{dish.eventImpact}% event
                                </Badge>
                              )}
                              {dish.weatherImpact && (
                                <Badge variant={dish.weatherImpact > 0 ? 'default' : 'destructive'} className="text-xs">
                                  <Cloud className="h-3 w-3 mr-1" />
                                  {dish.weatherImpact > 0 ? '+' : ''}{dish.weatherImpact}%
                                </Badge>
                              )}
                            </div>
                          </div>
                        </div>
                        <div className="text-right">
                          <p className="text-2xl font-bold text-foreground">{dish.predictedQuantity}</p>
                          <p className="text-xs text-muted-foreground">portions</p>
                        </div>
                      </div>
                    </TooltipTrigger>
                    <TooltipContent side="left">
                      <p>Based on {hasHistoricalData ? 'historical patterns' : 'category defaults'}</p>
                      {dish.menuPrice && (
                        <p className="text-muted-foreground">
                          Est. revenue: ${(dish.menuPrice * dish.predictedQuantity).toFixed(0)}
                        </p>
                      )}
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              ))
            )}
          </CardContent>
        </Card>

        {/* Ingredient Requirements */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base font-medium flex items-center gap-2">
              <Package className="h-4 w-4 text-accent" />
              Ingredient Requirements
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {isLoading ? (
              Array.from({ length: 5 }).map((_, i) => (
                <Skeleton key={i} className="h-14 w-full" />
              ))
            ) : ingredients.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <Package className="h-8 w-8 mx-auto mb-2 opacity-50" />
                <p>No ingredient requirements</p>
                <p className="text-sm">Forecast will show ingredient needs</p>
              </div>
            ) : (
              ingredients.slice(0, 10).map((item) => {
                const coveragePercent = Math.min(100, item.coverage);
                return (
                  <TooltipProvider key={item.ingredientId}>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <div className="space-y-2 cursor-pointer">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                              {item.risk === 'high' && (
                                <AlertTriangle className="h-4 w-4 text-destructive" />
                              )}
                              <span className="font-medium text-foreground">{item.ingredientName}</span>
                            </div>
                            <div className="flex items-center gap-2">
                              <span className="text-sm text-muted-foreground">
                                {formatQuantity(item.currentStock, item.unit)} / {formatQuantity(item.neededQuantity, item.unit)}
                              </span>
                              <Badge
                                variant={
                                  item.risk === 'high' ? 'low' :
                                  item.risk === 'medium' ? 'medium' : 'high'
                                }
                              >
                                {item.risk === 'high' ? 'Order Now' :
                                 item.risk === 'medium' ? 'Monitor' : 'OK'}
                              </Badge>
                            </div>
                          </div>
                          <Progress
                            value={coveragePercent}
                            className={`h-2 ${
                              item.risk === 'high' ? '[&>div]:bg-destructive' :
                              item.risk === 'medium' ? '[&>div]:bg-warning' : '[&>div]:bg-success'
                            }`}
                          />
                        </div>
                      </TooltipTrigger>
                      <TooltipContent side="left" className="max-w-xs">
                        <p className="font-medium mb-1">Used in:</p>
                        <ul className="text-sm text-muted-foreground">
                          {item.recipes.slice(0, 5).map((r, i) => (
                            <li key={i}>{r.name}: {formatQuantity(r.quantity, item.unit)}</li>
                          ))}
                          {item.recipes.length > 5 && (
                            <li>...and {item.recipes.length - 5} more</li>
                          )}
                        </ul>
                      </TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                );
              })
            )}
          </CardContent>
        </Card>
      </motion.div>

      {/* Validation Queue */}
      <motion.div variants={itemVariants}>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="text-base font-medium">Validation Queue</CardTitle>
            <Badge variant="secondary">Coming Soon</Badge>
          </CardHeader>
          <CardContent>
            <div className="text-center py-8 text-muted-foreground">
              <AlertTriangle className="h-8 w-8 mx-auto mb-2 opacity-50" />
              <p>Validation items will appear here</p>
              <p className="text-sm">
                When mismatches are detected between predicted and actual usage, 
                you'll see suggestions to update recipes.
              </p>
            </div>
          </CardContent>
        </Card>
      </motion.div>
    </motion.div>
  );
}
