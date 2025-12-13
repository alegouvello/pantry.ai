import { TrendingUp, Calendar, Package, AlertTriangle } from 'lucide-react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { mockRecipes, mockIngredients } from '@/data/mockData';

export default function Forecast() {
  // Mock forecast data
  const forecastedDishes = [
    { name: 'Chicken Parmesan', predicted: 45, confidence: 92 },
    { name: 'Mushroom Risotto', predicted: 32, confidence: 87 },
    { name: 'Caprese Salad', predicted: 28, confidence: 85 },
  ];

  const ingredientForecast = [
    { name: 'Chicken Breast', current: 12, needed: 24, unit: 'lb', risk: 'high' },
    { name: 'Roma Tomatoes', current: 5, needed: 18, unit: 'lb', risk: 'high' },
    { name: 'Parmesan Cheese', current: 3, needed: 6, unit: 'lb', risk: 'medium' },
    { name: 'Arborio Rice', current: 20, needed: 8, unit: 'lb', risk: 'low' },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Forecast</h1>
          <p className="text-muted-foreground">
            Predicted demand and ingredient needs
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline">
            <Calendar className="h-4 w-4 mr-2" />
            Add Event
          </Button>
          <Button variant="accent">
            <TrendingUp className="h-4 w-4 mr-2" />
            Generate Orders
          </Button>
        </div>
      </div>

      {/* Time Range Selector */}
      <div className="flex gap-2">
        <Button variant="secondary" size="sm">
          Next 3 Days
        </Button>
        <Button variant="ghost" size="sm">
          Next 7 Days
        </Button>
        <Button variant="ghost" size="sm">
          Next 14 Days
        </Button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Predicted Dish Sales */}
        <Card variant="elevated">
          <CardHeader>
            <CardTitle className="text-base font-semibold flex items-center gap-2">
              <TrendingUp className="h-4 w-4 text-primary" />
              Predicted Sales (Next 3 Days)
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {forecastedDishes.map((dish, index) => (
              <div
                key={dish.name}
                className="flex items-center justify-between p-4 rounded-lg bg-muted/30 animate-slide-up"
                style={{ animationDelay: `${index * 50}ms` }}
              >
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center">
                    <span className="text-lg font-bold text-primary">
                      #{index + 1}
                    </span>
                  </div>
                  <div>
                    <p className="font-medium text-foreground">{dish.name}</p>
                    <p className="text-xs text-muted-foreground">
                      {dish.confidence}% confidence
                    </p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-2xl font-bold text-foreground">
                    {dish.predicted}
                  </p>
                  <p className="text-xs text-muted-foreground">portions</p>
                </div>
              </div>
            ))}
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
            {ingredientForecast.map((item, index) => {
              const coverage = Math.min(100, (item.current / item.needed) * 100);
              return (
                <div
                  key={item.name}
                  className="space-y-2 animate-slide-up"
                  style={{ animationDelay: `${index * 50}ms` }}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      {item.risk === 'high' && (
                        <AlertTriangle className="h-4 w-4 text-destructive" />
                      )}
                      <span className="font-medium text-foreground">
                        {item.name}
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-sm text-muted-foreground">
                        {item.current} / {item.needed} {item.unit}
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
                    value={coverage}
                    className={`h-2 ${
                      item.risk === 'high'
                        ? '[&>div]:bg-destructive'
                        : item.risk === 'medium'
                        ? '[&>div]:bg-warning'
                        : '[&>div]:bg-success'
                    }`}
                  />
                </div>
              );
            })}
          </CardContent>
        </Card>
      </div>

      {/* Validation Queue */}
      <Card variant="elevated">
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="text-base font-semibold">
            Validation Queue
          </CardTitle>
          <Badge variant="warning">2 items</Badge>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="p-4 rounded-lg border border-warning/30 bg-warning/5">
            <div className="flex items-start justify-between">
              <div>
                <p className="font-medium text-foreground">
                  Recipe yield mismatch detected
                </p>
                <p className="text-sm text-muted-foreground mt-1">
                  Chicken Parmesan uses 15% more chicken than expected. Update
                  recipe?
                </p>
              </div>
              <div className="flex gap-2">
                <Button variant="outline" size="sm">
                  Ignore
                </Button>
                <Button variant="accent" size="sm">
                  Accept
                </Button>
              </div>
            </div>
          </div>

          <div className="p-4 rounded-lg border border-border bg-muted/30">
            <div className="flex items-start justify-between">
              <div>
                <p className="font-medium text-foreground">
                  Higher than usual waste rate
                </p>
                <p className="text-sm text-muted-foreground mt-1">
                  Fresh Basil waste increased 40% this week. Adjust par levels?
                </p>
              </div>
              <div className="flex gap-2">
                <Button variant="outline" size="sm">
                  Ignore
                </Button>
                <Button variant="accent" size="sm">
                  Review
                </Button>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
