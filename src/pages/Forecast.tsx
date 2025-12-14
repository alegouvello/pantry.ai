import { useState } from 'react';
import { TrendingUp, Calendar, Package, AlertTriangle, Loader2, Info, Sparkles, Cloud } from 'lucide-react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { useForecast } from '@/hooks/useForecast';
import { Skeleton } from '@/components/ui/skeleton';
import { ForecastCalendar } from '@/components/forecast/ForecastCalendar';
import { ForecastEventDialog } from '@/components/forecast/ForecastEventDialog';
import { useWeatherForecast, getWeatherIcon } from '@/hooks/useWeatherForecast';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export default function Forecast() {
  const [daysAhead, setDaysAhead] = useState(3);
  
  // Get first restaurant for the user's org
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
  const { dishes, ingredients, isLoading, salesPatterns, hasEventImpact, hasWeatherImpact, events } = useForecast(daysAhead, restaurantId, weatherData?.forecast);

  const hasHistoricalData = salesPatterns && salesPatterns.length > 0;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Forecast</h1>
          <p className="text-muted-foreground">
            Predicted demand and ingredient needs based on historical patterns
          </p>
        </div>
        <div className="flex items-center gap-2">
          <ForecastEventDialog restaurantId={restaurantId} />
          <Button variant="accent">
            <TrendingUp className="h-4 w-4 mr-2" />
            Generate Orders
          </Button>
        </div>
      </div>

      {/* Time Range Selector */}
      <div className="flex gap-2">
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
      </div>

      {/* Data Source Indicator */}
      {!isLoading && (
        <div className="flex items-center gap-4 text-sm text-muted-foreground">
          <div className="flex items-center gap-2">
            <Info className="h-4 w-4" />
            {hasHistoricalData ? (
              <span>
                Forecast based on <strong>{salesPatterns.length}</strong> historical sales patterns
              </span>
            ) : (
              <span>
                Using default estimates. Connect POS or add sales data for accurate forecasting.
              </span>
            )}
          </div>
          {hasEventImpact && (
            <div className="flex items-center gap-1 text-primary">
              <Sparkles className="h-4 w-4" />
              <span>
                <strong>{events?.length || 0}</strong> events factored in
              </span>
            </div>
          )}
          {weatherData?.city && (
            <div className="flex items-center gap-1 text-blue-600">
              <Cloud className="h-4 w-4" />
              <span>
                Weather for <strong>{weatherData.city}</strong>
              </span>
            </div>
          )}
        </div>
      )}

      {/* Event Calendar */}
      {restaurantId && (
        <ForecastCalendar 
          restaurantId={restaurantId} 
          daysAhead={daysAhead} 
          weatherData={weatherData?.forecast}
        />
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Predicted Dish Sales */}
        <Card variant="elevated">
          <CardHeader>
            <CardTitle className="text-base font-semibold flex items-center gap-2">
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
                      <div
                        className="flex items-center justify-between p-4 rounded-lg bg-muted/30 animate-slide-up cursor-pointer hover:bg-muted/50 transition-colors"
                        style={{ animationDelay: `${index * 50}ms` }}
                      >
                        <div className="flex items-center gap-3">
                          <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center">
                            <span className="text-lg font-bold text-primary">
                              #{index + 1}
                            </span>
                          </div>
                          <div>
                            <p className="font-medium text-foreground">{dish.recipeName}</p>
                            <div className="flex items-center gap-2">
                              <Badge variant="outline" className="text-xs">
                                {dish.category}
                              </Badge>
                              <span className="text-xs text-muted-foreground">
                                {dish.confidence}% confidence
                              </span>
                              {dish.eventImpact && (
                                <Badge 
                                  variant={dish.eventImpact > 0 ? 'high' : 'low'} 
                                  className="text-xs"
                                >
                                  {dish.eventImpact > 0 ? '+' : ''}{dish.eventImpact}% event
                                </Badge>
                              )}
                              {dish.weatherImpact && (
                                <Badge 
                                  variant={dish.weatherImpact > 0 ? 'default' : 'destructive'} 
                                  className="text-xs"
                                >
                                  <Cloud className="h-3 w-3 mr-1" />
                                  {dish.weatherImpact > 0 ? '+' : ''}{dish.weatherImpact}%
                                </Badge>
                              )}
                            </div>
                          </div>
                        </div>
                        <div className="text-right">
                          <p className="text-2xl font-bold text-foreground">
                            {dish.predictedQuantity}
                          </p>
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
                      {(dish.eventImpact || dish.weatherImpact) && (
                        <p className="text-xs mt-1">
                          Adjusted by: 
                          {dish.eventImpact ? ` ${dish.eventImpact > 0 ? '+' : ''}${dish.eventImpact}% events` : ''}
                          {dish.eventImpact && dish.weatherImpact ? ',' : ''}
                          {dish.weatherImpact ? ` ${dish.weatherImpact > 0 ? '+' : ''}${dish.weatherImpact}% weather` : ''}
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
        <Card variant="elevated">
          <CardHeader>
            <CardTitle className="text-base font-semibold flex items-center gap-2">
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
              ingredients.slice(0, 10).map((item, index) => {
                const coveragePercent = Math.min(100, item.coverage);
                return (
                  <TooltipProvider key={item.ingredientId}>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <div
                          className="space-y-2 animate-slide-up cursor-pointer"
                          style={{ animationDelay: `${index * 50}ms` }}
                        >
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                              {item.risk === 'high' && (
                                <AlertTriangle className="h-4 w-4 text-destructive" />
                              )}
                              <span className="font-medium text-foreground">
                                {item.ingredientName}
                              </span>
                            </div>
                            <div className="flex items-center gap-2">
                              <span className="text-sm text-muted-foreground">
                                {item.currentStock.toFixed(1)} / {item.neededQuantity.toFixed(1)} {item.unit}
                              </span>
                              <Badge
                                variant={
                                  item.risk === 'high'
                                    ? 'low'
                                    : item.risk === 'medium'
                                    ? 'medium'
                                    : 'high'
                                }
                              >
                                {item.risk === 'high'
                                  ? 'Order Now'
                                  : item.risk === 'medium'
                                  ? 'Monitor'
                                  : 'OK'}
                              </Badge>
                            </div>
                          </div>
                          <Progress
                            value={coveragePercent}
                            className={`h-2 ${
                              item.risk === 'high'
                                ? '[&>div]:bg-destructive'
                                : item.risk === 'medium'
                                ? '[&>div]:bg-warning'
                                : '[&>div]:bg-success'
                            }`}
                          />
                        </div>
                      </TooltipTrigger>
                      <TooltipContent side="left" className="max-w-xs">
                        <p className="font-medium mb-1">Used in:</p>
                        <ul className="text-sm text-muted-foreground">
                          {item.recipes.slice(0, 5).map((r, i) => (
                            <li key={i}>
                              {r.name}: {r.quantity.toFixed(1)} {item.unit}
                            </li>
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
      </div>

      {/* Validation Queue */}
      <Card variant="elevated">
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="text-base font-semibold">
            Validation Queue
          </CardTitle>
          <Badge variant="secondary">Coming Soon</Badge>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8 text-muted-foreground">
            <AlertTriangle className="h-8 w-8 mx-auto mb-2 opacity-50" />
            <p>Validation items will appear here</p>
            <p className="text-sm">
              When the system detects mismatches between predicted and actual usage, 
              you'll see suggestions to update recipes or par levels.
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
