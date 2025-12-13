import { useState } from 'react';
import {
  Package,
  Search,
  Filter,
  MoreHorizontal,
  Edit2,
  Trash2,
  ArrowUpDown,
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
import { Ingredient } from '@/types/inventory';
import { cn } from '@/lib/utils';

interface InventoryTableProps {
  ingredients: Ingredient[];
}

export function InventoryTable({ ingredients }: InventoryTableProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [sortField, setSortField] = useState<keyof Ingredient>('name');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc');

  const filteredIngredients = ingredients
    .filter(
      (item) =>
        item.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        item.category.toLowerCase().includes(searchQuery.toLowerCase())
    )
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
        </CardTitle>
        <div className="flex items-center gap-2 w-full sm:w-auto">
          <div className="relative flex-1 sm:w-64">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search ingredients..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9 bg-muted/50 border-muted"
            />
          </div>
          <Button variant="outline" size="icon">
            <Filter className="h-4 w-4" />
          </Button>
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
                          <p className="font-medium text-foreground">
                            {item.name}
                          </p>
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
