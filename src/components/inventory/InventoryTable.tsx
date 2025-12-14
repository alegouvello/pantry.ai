import { useState } from 'react';
import {
  Package,
  Search,
  MoreHorizontal,
  Edit2,
  Trash2,
  ArrowUpDown,
  ChefHat,
  X,
} from 'lucide-react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { Ingredient } from '@/types/inventory';
import { cn } from '@/lib/utils';
import { useRecipes } from '@/hooks/useRecipes';
import { useIngredientRecipes } from '@/hooks/useIngredientRecipes';

interface InventoryTableProps {
  ingredients: Ingredient[];
}

export function InventoryTable({ ingredients }: InventoryTableProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [sortField, setSortField] = useState<keyof Ingredient>('name');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc');
  const [selectedRecipeId, setSelectedRecipeId] = useState<string | null>(null);
  
  const { data: recipes } = useRecipes();
  const { data: ingredientRecipesMap } = useIngredientRecipes();

  // Get ingredient IDs for selected recipe
  const selectedRecipeIngredientIds = selectedRecipeId && recipes
    ? new Set(
        recipes
          .find(r => r.id === selectedRecipeId)
          ?.recipe_ingredients.map(ri => ri.ingredient_id) || []
      )
    : null;

  const filteredIngredients = ingredients
    .filter((item) => {
      // Text search filter
      const matchesSearch = 
        item.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        item.category.toLowerCase().includes(searchQuery.toLowerCase());
      
      // Recipe filter
      const matchesRecipe = selectedRecipeIngredientIds 
        ? selectedRecipeIngredientIds.has(item.id)
        : true;
      
      return matchesSearch && matchesRecipe;
    })
    .sort((a, b) => {
      const aValue = a[sortField];
      const bValue = b[sortField];
      if (typeof aValue === 'string' && typeof bValue === 'string') {
        return sortDirection === 'asc'
          ? aValue.localeCompare(bValue)
          : bValue.localeCompare(aValue);
      }
      if (typeof aValue === 'number' && typeof bValue === 'number') {
        return sortDirection === 'asc' ? aValue - bValue : bValue - aValue;
      }
      return 0;
    });

  const getStockStatus = (current: number, reorder: number, par: number) => {
    if (current <= reorder * 0.5) return 'critical';
    if (current <= reorder) return 'low';
    if (current <= par * 0.7) return 'medium';
    return 'good';
  };

  const handleSort = (field: keyof Ingredient) => {
    if (sortField === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('asc');
    }
  };

  return (
    <Card variant="elevated">
      <CardHeader className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pb-4">
        <CardTitle className="text-lg font-semibold flex items-center gap-2">
          <Package className="h-5 w-5 text-primary" />
          Inventory Items
          {selectedRecipeId && (
            <Badge variant="secondary" className="ml-2 gap-1">
              <ChefHat className="h-3 w-3" />
              {recipes?.find(r => r.id === selectedRecipeId)?.name}
              <button 
                onClick={() => setSelectedRecipeId(null)}
                className="ml-1 hover:text-foreground"
              >
                <X className="h-3 w-3" />
              </button>
            </Badge>
          )}
        </CardTitle>
        <div className="flex items-center gap-2 w-full sm:w-auto flex-wrap">
          <div className="relative flex-1 sm:w-48">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9 bg-muted/50 border-muted"
            />
          </div>
          <Select 
            value={selectedRecipeId || 'all'} 
            onValueChange={(v) => setSelectedRecipeId(v === 'all' ? null : v)}
          >
            <SelectTrigger className="w-[180px] bg-muted/50">
              <ChefHat className="h-4 w-4 mr-2 text-muted-foreground" />
              <SelectValue placeholder="Filter by recipe" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Recipes</SelectItem>
              {recipes?.map((recipe) => (
                <SelectItem key={recipe.id} value={recipe.id}>
                  {recipe.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </CardHeader>
      <CardContent className="p-0">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-border bg-muted/30">
                <th className="px-6 py-3 text-left">
                  <button
                    className="flex items-center gap-1 text-xs font-medium text-muted-foreground uppercase tracking-wider hover:text-foreground"
                    onClick={() => handleSort('name')}
                  >
                    Item
                    <ArrowUpDown className="h-3 w-3" />
                  </button>
                </th>
                <th className="px-6 py-3 text-left">
                  <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                    Category
                  </span>
                </th>
                <th className="px-6 py-3 text-left">
                  <button
                    className="flex items-center gap-1 text-xs font-medium text-muted-foreground uppercase tracking-wider hover:text-foreground"
                    onClick={() => handleSort('currentStock')}
                  >
                    Stock
                    <ArrowUpDown className="h-3 w-3" />
                  </button>
                </th>
                <th className="px-6 py-3 text-left">
                  <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                    Par Level
                  </span>
                </th>
                <th className="px-6 py-3 text-left">
                  <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                    Location
                  </span>
                </th>
                <th className="px-6 py-3 text-left">
                  <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                    Status
                  </span>
                </th>
                <th className="px-6 py-3 text-right">
                  <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                    Actions
                  </span>
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {filteredIngredients.map((item, index) => {
                const status = getStockStatus(
                  item.currentStock,
                  item.reorderPoint,
                  item.parLevel
                );

                return (
                  <tr
                    key={item.id}
                    className="hover:bg-muted/30 transition-colors animate-fade-in"
                    style={{ animationDelay: `${index * 30}ms` }}
                  >
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="h-9 w-9 rounded-lg bg-muted flex items-center justify-center">
                          <Package className="h-4 w-4 text-muted-foreground" />
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <p className="font-medium text-foreground">
                              {item.name}
                            </p>
                            {ingredientRecipesMap?.get(item.id) && (
                              <TooltipProvider>
                                <Tooltip>
                                  <TooltipTrigger asChild>
                                    <Badge 
                                      variant="outline" 
                                      className="text-xs py-0 px-1.5 cursor-pointer hover:bg-muted"
                                    >
                                      <ChefHat className="h-3 w-3 mr-1" />
                                      {ingredientRecipesMap.get(item.id)!.length}
                                    </Badge>
                                  </TooltipTrigger>
                                  <TooltipContent side="right" className="max-w-xs p-2">
                                    <p className="font-medium mb-1.5 text-xs text-muted-foreground">Click to filter:</p>
                                    <ul className="space-y-1">
                                      {ingredientRecipesMap.get(item.id)!.map(r => (
                                        <li key={r.id}>
                                          <button
                                            onClick={() => setSelectedRecipeId(r.id)}
                                            className="text-xs text-left w-full px-2 py-1 rounded hover:bg-muted transition-colors flex items-center gap-1.5"
                                          >
                                            <ChefHat className="h-3 w-3 text-primary" />
                                            {r.name}
                                          </button>
                                        </li>
                                      ))}
                                    </ul>
                                  </TooltipContent>
                                </Tooltip>
                              </TooltipProvider>
                            )}
                          </div>
                          <p className="text-xs text-muted-foreground">
                            ${item.unitCost.toFixed(2)} / {item.unit}
                          </p>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <Badge variant="secondary" className="font-normal">
                        {item.category}
                      </Badge>
                    </td>
                    <td className="px-6 py-4">
                      <span
                        className={cn(
                          "font-medium",
                          status === 'critical' && "text-destructive",
                          status === 'low' && "text-warning",
                          status === 'medium' && "text-accent",
                          status === 'good' && "text-foreground"
                        )}
                      >
                        {item.currentStock} {item.unit}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-muted-foreground">
                      {item.parLevel} {item.unit}
                    </td>
                    <td className="px-6 py-4 text-muted-foreground">
                      {item.storageLocation}
                    </td>
                    <td className="px-6 py-4">
                      <Badge
                        variant={
                          status === 'critical'
                            ? 'low'
                            : status === 'low'
                            ? 'medium'
                            : status === 'medium'
                            ? 'accent'
                            : 'high'
                        }
                      >
                        {status === 'critical'
                          ? 'Critical'
                          : status === 'low'
                          ? 'Low'
                          : status === 'medium'
                          ? 'OK'
                          : 'Good'}
                      </Badge>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon-sm">
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem>
                            <Edit2 className="h-4 w-4 mr-2" />
                            Edit
                          </DropdownMenuItem>
                          <DropdownMenuItem className="text-destructive">
                            <Trash2 className="h-4 w-4 mr-2" />
                            Delete
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </CardContent>
    </Card>
  );
}
