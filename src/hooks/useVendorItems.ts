import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import type { Tables, TablesInsert } from '@/integrations/supabase/types';

export type VendorItem = Tables<'vendor_items'>;
export type VendorItemInsert = TablesInsert<'vendor_items'>;
export type IngredientVendorMap = Tables<'ingredient_vendor_maps'>;
export type IngredientVendorMapInsert = TablesInsert<'ingredient_vendor_maps'>;

export function useVendorItems(vendorId?: string) {
  return useQuery({
    queryKey: ['vendor_items', vendorId],
    queryFn: async () => {
      let query = supabase.from('vendor_items').select('*');
      
      if (vendorId) {
        query = query.eq('vendor_id', vendorId);
      }
      
      const { data, error } = await query.order('name');
      if (error) throw error;
      return data as VendorItem[];
    },
    enabled: !!vendorId || vendorId === undefined,
  });
}

export function useCreateVendorItem() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (item: VendorItemInsert) => {
      const { data, error } = await supabase
        .from('vendor_items')
        .insert(item)
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['vendor_items'] });
    },
  });
}

export function useIngredientVendorMaps(ingredientIds?: string[]) {
  return useQuery({
    queryKey: ['ingredient_vendor_maps', ingredientIds],
    queryFn: async () => {
      let query = supabase
        .from('ingredient_vendor_maps')
        .select(`
          *,
          vendor_items (
            id,
            name,
            sku,
            pack_size,
            unit_cost,
            vendor_id
          )
        `);
      
      if (ingredientIds && ingredientIds.length > 0) {
        query = query.in('ingredient_id', ingredientIds);
      }
      
      const { data, error } = await query;
      if (error) throw error;
      return data;
    },
    enabled: !ingredientIds || ingredientIds.length > 0,
  });
}

export function useCreateIngredientVendorMap() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (mapping: IngredientVendorMapInsert) => {
      const { data, error } = await supabase
        .from('ingredient_vendor_maps')
        .insert(mapping)
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['ingredient_vendor_maps'] });
    },
  });
}

export function useUpsertIngredientVendorMapping() {
  const queryClient = useQueryClient();
  const createVendorItem = useCreateVendorItem();
  const createMapping = useCreateIngredientVendorMap();
  
  return useMutation({
    mutationFn: async ({
      ingredientId,
      vendorId,
      sku,
      packSize,
      unitCost,
    }: {
      ingredientId: string;
      vendorId: string;
      sku?: string;
      packSize?: string;
      unitCost?: number;
    }) => {
      // First create or find the vendor item
      const { data: existingItems } = await supabase
        .from('vendor_items')
        .select('id')
        .eq('vendor_id', vendorId)
        .eq('sku', sku || '')
        .maybeSingle();
      
      let vendorItemId: string;
      
      if (existingItems) {
        vendorItemId = existingItems.id;
        // Update the existing vendor item
        await supabase
          .from('vendor_items')
          .update({
            pack_size: packSize,
            unit_cost: unitCost,
          })
          .eq('id', vendorItemId);
      } else {
        // Create a new vendor item
        const newItem = await createVendorItem.mutateAsync({
          vendor_id: vendorId,
          name: sku || 'Unnamed Item',
          sku: sku,
          pack_size: packSize,
          unit_cost: unitCost,
        });
        vendorItemId = newItem.id;
      }
      
      // Check if mapping already exists
      const { data: existingMapping } = await supabase
        .from('ingredient_vendor_maps')
        .select('id')
        .eq('ingredient_id', ingredientId)
        .eq('vendor_item_id', vendorItemId)
        .maybeSingle();
      
      if (!existingMapping) {
        // Create the mapping
        await createMapping.mutateAsync({
          ingredient_id: ingredientId,
          vendor_item_id: vendorItemId,
          priority_rank: 1,
        });
      }
      
      return { vendorItemId };
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['ingredient_vendor_maps'] });
      queryClient.invalidateQueries({ queryKey: ['vendor_items'] });
    },
  });
}
