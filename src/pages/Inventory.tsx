import { useState } from 'react';
import { Plus, Upload, Download, LogIn } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { InventoryTable } from '@/components/inventory/InventoryTable';
import { Skeleton } from '@/components/ui/skeleton';
import { Card } from '@/components/ui/card';
import { useIngredients } from '@/hooks/useIngredients';
import { useAuth } from '@/hooks/useAuth';
import { Link } from 'react-router-dom';

export default function Inventory() {
  const { user, loading: authLoading } = useAuth();
  const { data: ingredients, isLoading, error } = useIngredients();

  if (!authLoading && !user) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] space-y-6">
        <div className="text-center space-y-2">
          <h1 className="text-2xl font-bold text-foreground">Sign in required</h1>
          <p className="text-muted-foreground">
            Please sign in to view and manage inventory.
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

  // Map database ingredients to the format expected by InventoryTable
  const mappedIngredients = ingredients?.map(item => ({
    id: item.id,
    name: item.name,
    category: item.category,
    unit: item.unit,
    storageLocation: item.storage_location?.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase()) || 'Dry Storage',
    currentStock: item.current_stock,
    parLevel: item.par_level,
    reorderPoint: item.reorder_point,
    unitCost: item.unit_cost,
    lastUpdated: new Date(item.updated_at),
    shelfLifeDays: item.shelf_life_days || undefined,
    allergens: item.allergens || undefined,
    vendorId: item.vendor_id || undefined,
    vendorSku: item.vendor_sku || undefined,
  })) || [];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Inventory</h1>
          <p className="text-muted-foreground">
            Manage your ingredients and stock levels
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm">
            <Upload className="h-4 w-4 mr-2" />
            Import
          </Button>
          <Button variant="outline" size="sm">
            <Download className="h-4 w-4 mr-2" />
            Export
          </Button>
          <Button variant="accent">
            <Plus className="h-4 w-4 mr-2" />
            Add Item
          </Button>
        </div>
      </div>

      {/* Content */}
      {isLoading ? (
        <Card variant="elevated" className="p-6">
          <div className="space-y-4">
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-64 w-full" />
          </div>
        </Card>
      ) : error ? (
        <Card variant="elevated" className="p-8 text-center">
          <p className="text-destructive">Error loading inventory: {error.message}</p>
        </Card>
      ) : mappedIngredients.length === 0 ? (
        <Card variant="elevated" className="p-8 text-center">
          <div className="space-y-4">
            <p className="text-muted-foreground">No ingredients yet. Add your first ingredient to get started!</p>
            <Button variant="accent">
              <Plus className="h-4 w-4 mr-2" />
              Add First Ingredient
            </Button>
          </div>
        </Card>
      ) : (
        <InventoryTable ingredients={mappedIngredients} />
      )}
    </div>
  );
}
