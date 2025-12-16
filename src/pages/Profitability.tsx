import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { motion } from 'framer-motion';
import { TrendingUp, TrendingDown, DollarSign, ArrowUpDown, ArrowUp, ArrowDown, LogIn, Info } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
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
import heroImage from '@/assets/pages/hero-profitability.jpg';

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
  const { t } = useTranslation();
  const { user, loading: authLoading } = useAuth();
  const { data: recipes, isLoading, error } = useRecipes();
  const [sortKey, setSortKey] = useState<SortKey>('foodCostPercentage');
  const [sortDirection, setSortDirection] = useState<SortDirection>('desc');

  if (!authLoading && !user) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] space-y-6">
        <div className="text-center space-y-2">
          <DollarSign className="h-16 w-16 text-primary mx-auto mb-4" />
          <h1 className="text-2xl font-bold text-foreground">{t('auth.signInRequired')}</h1>
          <p className="text-muted-foreground">
            {t('auth.pleaseSignIn', { area: t('nav.profitability').toLowerCase() })}
          </p>
        </div>
        <Link to="/auth">
          <Button variant="accent" size="lg">
            <LogIn className="h-5 w-5 mr-2" />
            {t('auth.signIn')}
          </Button>
        </Link>
      </div>
    );
  }

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

  const averageFoodCost = profitableRecipes.length > 0
    ? profitableRecipes.reduce((sum, r) => sum + r.foodCostPercentage, 0) / profitableRecipes.length
    : 0;
  
  const totalProfit = profitableRecipes.reduce((sum, r) => sum + r.profit, 0);
  const highCostRecipes = profitableRecipes.filter(r => r.foodCostPercentage > 35).length;
  const optimalRecipes = profitableRecipes.filter(r => r.foodCostPercentage <= 30).length;

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
          alt="Profitability" 
          className="absolute inset-0 w-full h-full object-cover"
        />
        <div className="absolute inset-0 bg-gradient-to-r from-background/90 via-background/70 to-transparent" />
        <div className="absolute inset-0 flex items-center px-8 md:px-12">
          <div className="space-y-3">
            <h1 className="text-3xl md:text-4xl font-bold text-foreground tracking-tight">
              {t('profitability.title')}
            </h1>
            <p className="text-muted-foreground max-w-md">
              {t('profitability.subtitle')}
            </p>
          </div>
        </div>
      </motion.div>

      {/* Summary Cards */}
      <motion.div 
        variants={itemVariants}
        className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4"
      >
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">{t('profitability.avgFoodCost')}</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <Skeleton className="h-8 w-20" />
            ) : (
              <div className="flex items-center gap-2">
                <span className="text-2xl font-bold">{averageFoodCost.toFixed(1)}%</span>
                <Badge variant={getFoodCostBadgeVariant(averageFoodCost)}>
                  {averageFoodCost <= 30 ? t('profitability.good') : averageFoodCost <= 35 ? t('profitability.fair') : t('profitability.high')}
                </Badge>
              </div>
            )}
          </CardContent>
        </Card>

        <TooltipProvider>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-1">
                {t('profitability.combinedProfit')}
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Info className="h-3.5 w-3.5 text-muted-foreground/60 cursor-help" />
                  </TooltipTrigger>
                  <TooltipContent side="top" className="max-w-xs">
                    <p className="text-xs">{t('profitability.combinedProfitTooltip')}</p>
                  </TooltipContent>
                </Tooltip>
              </CardTitle>
              <DollarSign className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <Skeleton className="h-8 w-24" />
              ) : (
                <span className="text-2xl font-bold text-primary">{formatCurrency(totalProfit)}</span>
              )}
            </CardContent>
          </Card>
        </TooltipProvider>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">{t('profitability.optimalRecipes')}</CardTitle>
            <TrendingDown className="h-4 w-4 text-primary" />
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <Skeleton className="h-8 w-16" />
            ) : (
              <div className="flex items-center gap-2">
                <span className="text-2xl font-bold text-primary">{optimalRecipes}</span>
                <span className="text-sm text-muted-foreground">{t('profitability.of')} {profitableRecipes.length}</span>
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">{t('profitability.highCost')}</CardTitle>
            <TrendingUp className="h-4 w-4 text-destructive" />
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <Skeleton className="h-8 w-16" />
            ) : (
              <div className="flex items-center gap-2">
                <span className="text-2xl font-bold text-destructive">{highCostRecipes}</span>
                {highCostRecipes > 0 && <Badge variant="destructive">{t('profitability.needsReview')}</Badge>}
              </div>
            )}
          </CardContent>
        </Card>
      </motion.div>

      {/* Profitability Table */}
      <motion.div variants={itemVariants}>
        <Card>
          <CardHeader>
            <CardTitle className="text-base font-medium">{t('profitability.recipeAnalysis')}</CardTitle>
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
                {t('common.errorLoading', { area: t('nav.recipes').toLowerCase(), message: error.message })}
              </p>
            ) : profitableRecipes.length === 0 ? (
              <div className="text-center py-12">
                <DollarSign className="h-12 w-12 mx-auto mb-4 text-muted-foreground/50" />
                <p className="text-muted-foreground mb-4">
                  {t('profitability.noRecipesWithPrices')}
                </p>
                <Link to="/recipes">
                  <Button variant="accent">{t('profitability.goToRecipes')}</Button>
                </Link>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>
                        <Button variant="ghost" size="sm" className="h-auto p-0 font-semibold hover:bg-transparent" onClick={() => handleSort('name')}>
                          {t('profitability.table.recipe')} <SortIcon columnKey="name" />
                        </Button>
                      </TableHead>
                      <TableHead>
                        <Button variant="ghost" size="sm" className="h-auto p-0 font-semibold hover:bg-transparent" onClick={() => handleSort('category')}>
                          {t('profitability.table.category')} <SortIcon columnKey="category" />
                        </Button>
                      </TableHead>
                      <TableHead className="text-right">
                        <Button variant="ghost" size="sm" className="h-auto p-0 font-semibold hover:bg-transparent ml-auto" onClick={() => handleSort('totalCost')}>
                          {t('profitability.table.cost')} <SortIcon columnKey="totalCost" />
                        </Button>
                      </TableHead>
                      <TableHead className="text-right">
                        <Button variant="ghost" size="sm" className="h-auto p-0 font-semibold hover:bg-transparent ml-auto" onClick={() => handleSort('menuPrice')}>
                          {t('profitability.table.menuPrice')} <SortIcon columnKey="menuPrice" />
                        </Button>
                      </TableHead>
                      <TableHead className="text-right">
                        <Button variant="ghost" size="sm" className="h-auto p-0 font-semibold hover:bg-transparent ml-auto" onClick={() => handleSort('foodCostPercentage')}>
                          {t('profitability.table.foodCostPct')} <SortIcon columnKey="foodCostPercentage" />
                        </Button>
                      </TableHead>
                      <TableHead className="text-right">
                        <Button variant="ghost" size="sm" className="h-auto p-0 font-semibold hover:bg-transparent ml-auto" onClick={() => handleSort('profit')}>
                          {t('profitability.table.profit')} <SortIcon columnKey="profit" />
                        </Button>
                      </TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {sortedRecipes.map((recipe) => (
                      <TableRow key={recipe.id}>
                        <TableCell className="font-medium">{recipe.name}</TableCell>
                        <TableCell><Badge variant="outline">{recipe.category}</Badge></TableCell>
                        <TableCell className="text-right">{formatCurrency(recipe.totalCost)}</TableCell>
                        <TableCell className="text-right">{formatCurrency(recipe.menuPrice)}</TableCell>
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
      </motion.div>
    </motion.div>
  );
}
