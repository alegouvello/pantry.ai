import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import type { Tables, TablesInsert, TablesUpdate } from '@/integrations/supabase/types';

export type Alert = Tables<'alerts'>;
export type AlertInsert = TablesInsert<'alerts'>;
export type AlertUpdate = TablesUpdate<'alerts'>;

export function useAlerts() {
  return useQuery({
    queryKey: ['alerts'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('alerts')
        .select('*')
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      return data as Alert[];
    },
  });
}

export function useActiveAlerts() {
  return useQuery({
    queryKey: ['alerts', 'active'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('alerts')
        .select('*')
        .eq('is_resolved', false)
        .order('severity', { ascending: false })
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      return data as Alert[];
    },
  });
}

export function useResolvedAlerts() {
  return useQuery({
    queryKey: ['alerts', 'resolved'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('alerts')
        .select('*')
        .eq('is_resolved', true)
        .order('resolved_at', { ascending: false });
      
      if (error) throw error;
      return data as Alert[];
    },
  });
}

export function useCreateAlert() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (alert: AlertInsert) => {
      const { data, error } = await supabase
        .from('alerts')
        .insert(alert)
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['alerts'] });
    },
  });
}

export function useResolveAlert() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (id: string) => {
      const { data: { user } } = await supabase.auth.getUser();
      
      const { data, error } = await supabase
        .from('alerts')
        .update({ 
          is_resolved: true,
          resolved_by: user?.id,
          resolved_at: new Date().toISOString()
        })
        .eq('id', id)
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['alerts'] });
    },
  });
}
