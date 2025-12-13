import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import type { Tables, TablesInsert, TablesUpdate, Enums } from '@/integrations/supabase/types';

export type PurchaseOrder = Tables<'purchase_orders'>;
export type PurchaseOrderInsert = TablesInsert<'purchase_orders'>;
export type PurchaseOrderUpdate = TablesUpdate<'purchase_orders'>;
export type PurchaseOrderItem = Tables<'purchase_order_items'>;
export type POStatus = Enums<'po_status'>;

export interface PurchaseOrderWithDetails extends PurchaseOrder {
  vendors: Tables<'vendors'>;
  purchase_order_items: (PurchaseOrderItem & {
    ingredients: Tables<'ingredients'>;
  })[];
}

export function usePurchaseOrders() {
  return useQuery({
    queryKey: ['purchase_orders'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('purchase_orders')
        .select(`
          *,
          vendors (*),
          purchase_order_items (
            *,
            ingredients (*)
          )
        `)
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      return data as PurchaseOrderWithDetails[];
    },
  });
}

export function usePurchaseOrdersByStatus(status: POStatus | POStatus[]) {
  const statuses = Array.isArray(status) ? status : [status];
  
  return useQuery({
    queryKey: ['purchase_orders', 'status', statuses],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('purchase_orders')
        .select(`
          *,
          vendors (*),
          purchase_order_items (
            *,
            ingredients (*)
          )
        `)
        .in('status', statuses)
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      return data as PurchaseOrderWithDetails[];
    },
  });
}

export function usePurchaseOrder(id: string) {
  return useQuery({
    queryKey: ['purchase_orders', id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('purchase_orders')
        .select(`
          *,
          vendors (*),
          purchase_order_items (
            *,
            ingredients (*)
          )
        `)
        .eq('id', id)
        .single();
      
      if (error) throw error;
      return data as PurchaseOrderWithDetails;
    },
    enabled: !!id,
  });
}

export function useCreatePurchaseOrder() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (order: PurchaseOrderInsert) => {
      const { data, error } = await supabase
        .from('purchase_orders')
        .insert(order)
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['purchase_orders'] });
    },
  });
}

export function useUpdatePurchaseOrder() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async ({ id, ...updates }: PurchaseOrderUpdate & { id: string }) => {
      const { data, error } = await supabase
        .from('purchase_orders')
        .update(updates)
        .eq('id', id)
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['purchase_orders'] });
    },
  });
}

export function useApprovePurchaseOrder() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (id: string) => {
      const { data: { user } } = await supabase.auth.getUser();
      
      const { data, error } = await supabase
        .from('purchase_orders')
        .update({ 
          status: 'approved' as POStatus,
          approved_by: user?.id 
        })
        .eq('id', id)
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['purchase_orders'] });
    },
  });
}

export function useSendPurchaseOrder() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (id: string) => {
      const { data, error } = await supabase
        .from('purchase_orders')
        .update({ status: 'sent' as POStatus })
        .eq('id', id)
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['purchase_orders'] });
    },
  });
}
