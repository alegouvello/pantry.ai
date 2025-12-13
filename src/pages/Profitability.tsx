import { useState } from 'react';
import { TrendingUp, TrendingDown, DollarSign, ArrowUpDown, ArrowUp, ArrowDown, LogIn } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { useRecipes, RecipeWithIngredients } from '@/hooks/useRecipes';
import { useAuth } from '@/hooks/useAuth';
import { Link } from 'react-router-dom';

type SortKey = 'name' | 'category' | 'totalCost' | 'menuPrice' | 'foodCostPercentage' | 'profit';
type SortDirection = 'asc' | 'desc';

interface RecipeWithProfitability {
  id: string;
  name: string;
  category: string;
  totalCost: number;
  menuPrice: number;
  foodCostPercentage: number;
  profit: number;
  profitMargin: number;
}

const formatCurrency = (value: number) => {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 2,
  }).format(value);
};

const getFoodCostBadgeVariant = (percentage: number): 'success' | 'warning' | 'destructive' => {
  if (percentage <= 30) return 'success';
  if (percentage <= 35) return 'warning';
  return 'destructive';
};

export default function Profitability() {
  const { user, loading: authLoading } = useAuth();
  const { data: recipes, isLoading, error } = useRecipes();
  const [sortKey, setSortKey] = useState<SortKey>('foodCostPercentage');
  const [sortDirection, setSortDirection] = useState<SortDirection>('desc');

  if (!authLoading && !user) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] space-y-6">
        <div className="text-center space-y-2">
          <h1 className="text-2xl font-bold text-foreground">Sign in required</h1>
          <p className="text-muted-foreground">
            Please sign in to view profitability analysis.
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

  // Calculate profitability data
  const calculateProfitability = (recipe: RecipeWithIngredients): RecipeWithProfitability | null => {
    const totalCost = recipe.recipe_ingredients?.reduce((sum, ri) => {
      return sum + (ri.quantity * (ri.ingredients?.unit_cost || 0));
    }, 0) || 0;

    const menuPrice = recipe.menu_price || 0;
    if (menuPrice <= 0) return null;

    const foodCostPercentage = (totalCost / menuPrice) * 100;
    const profit = menuPrice - totalCost;
    const profitMargin = ((menuPrice - totalCost) / menuPrice) * 100;

    return {
      id: recipe.id,
      name: recipe.name,
      category: recipe.category,
      totalCost,
      menuPrice,
      foodCostPercentage,
      profit,
      profitMargin,
    };
  };

  const profitableRecipes = recipes
    ?.map(calculateProfitability)
    .filter((r): r is RecipeWithProfitability => r !== null) || [];

  // Sort recipes
  const sortedRecipes = [...profitableRecipes].sort((a, b) => {
    const aValue = a[sortKey];
    const bValue = b[sortKey];
    
    if (typeof aValue === 'string' && typeof bValue === 'string') {
      return sortDirection === 'asc' 
        ? aValue.localeCompare(bValue)
        : bValue.localeCompare(aValue);
    }
    
    return sortDirection === 'asc' 
      ? (aValue as number) - (bValue as number)
      : (bValue as number) - (aValue as number);
  });

  const handleSort = (key: SortKey) => {
    if (sortKey === key) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortKey(key);
      setSortDirection('desc');
    }
  };

  const SortIcon = ({ columnKey }: { columnKey: SortKey }) => {
    if (sortKey !== columnKey) {
      return <ArrowUpDown className="h-4 w-4 ml-1 opacity-50" />;
    }
    return sortDirection === 'asc' 
      ? <ArrowUp className="h-4 w-4 ml-1" />
      : <ArrowDown className="h-4 w-4 ml-1" />;
  };

  // Summary metrics
  const averageFoodCost = profitableRecipes.length > 0
    ? profitableRecipes.reduce((sum, r) => sum + r.foodCostPercentage, 0) / profitableRecipes.length
    : 0;
  
  const totalProfit = profitableRecipes.reduce((sum, r) => sum + r.profit, 0);
  
  const highCostRecipes = profitableRecipes.filter(r => r.foodCostPercentage > 35).length;
  const optimalRecipes = profitableRecipes.filter(r => r.foodCostPercentage <= 30).length;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-foreground">Recipe Profitability</h1>
        <p className="text-muted-foreground">
          Analyze food costs and profit margins across your menu
        </p>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card variant="elevated">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Avg Food Cost
            </CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <Skeleton className="h-8 w-20" />
            ) : (
              <div className="flex items-center gap-2">
                <span className="text-2xl font-bold">{averageFoodCost.toFixed(1)}%</span>
                <Badge variant={getFoodCostBadgeVariant(averageFoodCost)}>
                  {averageFoodCost <= 30 ? 'Good' : averageFoodCost <= 35 ? 'Fair' : 'High'}
                </Badge>
              </div>
            )}
          </CardContent>
        </Card>

        <Card variant="elevated">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Total Profit (per unit)
            </CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <Skeleton className="h-8 w-24" />
            ) : (
              <span className="text-2xl font-bold text-primary">
                {formatCurrency(totalProfit)}
              </span>
            )}
          </CardContent>
        </Card>

        <Card variant="elevated">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Optimal Recipes (≤30%)
            </CardTitle>
            <TrendingDown className="h-4 w-4 text-primary" />
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <Skeleton className="h-8 w-16" />
            ) : (
              <div className="flex items-center gap-2">
                <span className="text-2xl font-bold text-primary">{optimalRecipes}</span>
                <span className="text-sm text-muted-foreground">
                  of {profitableRecipes.length}
                </span>
              </div>
            )}
          </CardContent>
        </Card>

        <Card variant="elevated">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              High Cost Recipes (&gt;35%)
            </CardTitle>
            <TrendingUp className="h-4 w-4 text-destructive" />
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <Skeleton className="h-8 w-16" />
            ) : (
              <div className="flex items-center gap-2">
                <span className="text-2xl font-bold text-destructive">{highCostRecipes}</span>
                {highCostRecipes > 0 && (
                  <Badge variant="destructive">Needs Review</Badge>
                )}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Profitability Table */}
      <Card variant="elevated">
        <CardHeader>
          <CardTitle>Recipe Analysis</CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="space-y-3">
              {[...Array(5)].map((_, i) => (
                <Skeleton key={i} className="h-12 w-full" />
              ))}
            </div>
          ) : error ? (
            <p className="text-destructive text-center py-8">
              Error loading recipes: {error.message}
            </p>
          ) : profitableRecipes.length === 0 ? (
            <div className="text-center py-8">
              <p className="text-muted-foreground mb-4">
                No recipes with menu prices found. Add menu prices to your recipes to see profitability analysis.
              </p>
              <Link to="/recipes">
                <Button variant="accent">Go to Recipes</Button>
              </Link>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-auto p-0 font-semibold hover:bg-transparent"
                        onClick={() => handleSort('name')}
                      >
                        Recipe
                        <SortIcon columnKey="name" />
                      </Button>
                    </TableHead>
                    <TableHead>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-auto p-0 font-semibold hover:bg-transparent"
                        onClick={() => handleSort('category')}
                      >
                        Category
                        <SortIcon columnKey="category" />
                      </Button>
                    </TableHead>
                    <TableHead className="text-right">
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-auto p-0 font-semibold hover:bg-transparent ml-auto"
                        onClick={() => handleSort('totalCost')}
                      >
                        Cost
                        <SortIcon columnKey="totalCost" />
                      </Button>
                    </TableHead>
                    <TableHead className="text-right">
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-auto p-0 font-semibold hover:bg-transparent ml-auto"
                        onClick={() => handleSort('menuPrice')}
                      >
                        Menu Price
                        <SortIcon columnKey="menuPrice" />
                      </Button>
                    </TableHead>
                    <TableHead className="text-right">
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-auto p-0 font-semibold hover:bg-transparent ml-auto"
                        onClick={() => handleSort('foodCostPercentage')}
                      >
                        Food Cost %
                        <SortIcon columnKey="foodCostPercentage" />
                      </Button>
                    </TableHead>
                    <TableHead className="text-right">
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-auto p-0 font-semibold hover:bg-transparent ml-auto"
                        onClick={() => handleSort('profit')}
                      >
                        Profit
                        <SortIcon columnKey="profit" />
                      </Button>
                    </TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {sortedRecipes.map((recipe) => (
                    <TableRow key={recipe.id}>
                      <TableCell className="font-medium">{recipe.name}</TableCell>
                      <TableCell>
                        <Badge variant="outline">{recipe.category}</Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        {formatCurrency(recipe.totalCost)}
                      </TableCell>
                      <TableCell className="text-right">
                        {formatCurrency(recipe.menuPrice)}
                      </TableCell>
                      <TableCell className="text-right">
                        <Badge variant={getFoodCostBadgeVariant(recipe.foodCostPercentage)}>
                          {recipe.foodCostPercentage.toFixed(1)}%
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right font-medium text-primary">
                        {formatCurrency(recipe.profit)}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
