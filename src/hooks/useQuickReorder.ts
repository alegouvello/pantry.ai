import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useIngredients } from './useIngredients';
import { toast } from 'sonner';

interface VendorOrderGroup {
  vendorId: string;
  vendorName: string;
  items: {
    ingredientId: string;
    ingredientName: string;
    quantity: number;
    unit: string;
    unitCost: number;
  }[];
  totalAmount: number;
}

export function useQuickReorder() {
  const queryClient = useQueryClient();
  const { data: ingredients } = useIngredients();

  const getLowStockItems = () => {
    if (!ingredients) return [];
    return ingredients.filter(
      (ing) => ing.current_stock < ing.reorder_point && ing.is_active
    );
  };

  const createReorderMutation = useMutation({
    mutationFn: async () => {
      const lowStockItems = getLowStockItems();
      
      if (lowStockItems.length === 0) {
        throw new Error('No low stock items to reorder');
      }

      // Group items by vendor
      const vendorGroups: Map<string, VendorOrderGroup> = new Map();
      const noVendorItems: typeof lowStockItems = [];

      for (const item of lowStockItems) {
        // Calculate quantity to order (par level - current stock)
        const orderQty = Math.max(1, item.par_level - item.current_stock);
        
        if (item.vendor_id) {
          const existing = vendorGroups.get(item.vendor_id);
          const itemData = {
            ingredientId: item.id,
            ingredientName: item.name,
            quantity: orderQty,
            unit: item.unit,
            unitCost: item.unit_cost,
          };
          
          if (existing) {
            existing.items.push(itemData);
            existing.totalAmount += orderQty * item.unit_cost;
          } else {
            vendorGroups.set(item.vendor_id, {
              vendorId: item.vendor_id,
              vendorName: '', // Will be filled from vendor lookup
              items: [itemData],
              totalAmount: orderQty * item.unit_cost,
            });
          }
        } else {
          noVendorItems.push(item);
        }
      }

      // Fetch vendor names
      if (vendorGroups.size > 0) {
        const vendorIds = Array.from(vendorGroups.keys());
        const { data: vendors } = await supabase
          .from('vendors')
          .select('id, name')
          .in('id', vendorIds);
        
        vendors?.forEach((v) => {
          const group = vendorGroups.get(v.id);
          if (group) group.vendorName = v.name;
        });
      }

      // Get current user for created_by
      const { data: { user } } = await supabase.auth.getUser();

      // Create purchase orders for each vendor
      const createdOrders: string[] = [];
      
      for (const [vendorId, group] of vendorGroups) {
        // Create the purchase order
        const { data: po, error: poError } = await supabase
          .from('purchase_orders')
          .insert({
            vendor_id: vendorId,
            status: 'draft',
            total_amount: group.totalAmount,
            created_by: user?.id,
            notes: 'Auto-generated from low stock alert',
          })
          .select()
          .single();

        if (poError) {
          console.error('Failed to create PO:', poError);
          continue;
        }

        // Create purchase order items
        const poItems = group.items.map((item) => ({
          purchase_order_id: po.id,
          ingredient_id: item.ingredientId,
          quantity: item.quantity,
          unit: item.unit,
          unit_cost: item.unitCost,
        }));

        const { error: itemsError } = await supabase
          .from('purchase_order_items')
          .insert(poItems);

        if (itemsError) {
          console.error('Failed to create PO items:', itemsError);
        } else {
          createdOrders.push(group.vendorName || 'Unknown Vendor');
        }
      }

      return {
        ordersCreated: createdOrders.length,
        vendorNames: createdOrders,
        itemsWithoutVendor: noVendorItems.length,
      };
    },
    onSuccess: (result) => {
      queryClient.invalidateQueries({ queryKey: ['purchase_orders'] });
      
      if (result.ordersCreated > 0) {
        toast.success(
          `Created ${result.ordersCreated} draft PO${result.ordersCreated > 1 ? 's' : ''} for: ${result.vendorNames.join(', ')}`
        );
      }
      
      if (result.itemsWithoutVendor > 0) {
        toast.warning(
          `${result.itemsWithoutVendor} low-stock items have no vendor assigned`
        );
      }
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Failed to create purchase orders');
    },
  });

  return {
    lowStockCount: getLowStockItems().length,
    createQuickReorder: createReorderMutation.mutate,
    isCreating: createReorderMutation.isPending,
  };
}
