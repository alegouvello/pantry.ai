import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import type { OnboardingProgress, Restaurant } from '@/types/onboarding';
import type { Json } from '@/integrations/supabase/types';

// Helper to convert DB types to our types
const mapRestaurant = (data: any): Restaurant => ({
  ...data,
  address: (data.address || {}) as Restaurant['address'],
  hours: (data.hours || {}) as Restaurant['hours'],
  brand: (data.brand || {}) as Restaurant['brand'],
  services: data.services || [],
  cuisine_tags: data.cuisine_tags || [],
});

export function useOnboardingProgress(userId: string | undefined) {
  return useQuery({
    queryKey: ['onboarding-progress', userId],
    queryFn: async () => {
      if (!userId) return null;
      
      const { data, error } = await supabase
        .from('onboarding_progress')
        .select('*')
        .eq('user_id', userId)
        .maybeSingle();
      
      if (error) throw error;
      return data as OnboardingProgress | null;
    },
    enabled: !!userId,
  });
}

export function useCreateOnboarding() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async ({ userId }: { userId: string }) => {
      // Create organization
      const { data: org, error: orgError } = await supabase
        .from('organizations')
        .insert({})
        .select()
        .single();
      
      if (orgError) throw orgError;

      // Create membership
      const { error: memberError } = await supabase
        .from('memberships')
        .insert({
          user_id: userId,
          org_id: org.id,
          role: 'owner',
        });
      
      if (memberError) throw memberError;

      // Create onboarding progress
      const { data: progress, error: progressError } = await supabase
        .from('onboarding_progress')
        .insert({
          user_id: userId,
          org_id: org.id,
          current_step: 1,
          setup_health_score: 0,
        })
        .select()
        .single();
      
      if (progressError) throw progressError;
      
      return { org, progress };
    },
    onSuccess: (_, { userId }) => {
      queryClient.invalidateQueries({ queryKey: ['onboarding-progress', userId] });
    },
  });
}

export function useUpdateOnboardingProgress() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async ({ 
      id, 
      currentStep, 
      completedSteps, 
      setupHealthScore,
      data 
    }: { 
      id: string;
      currentStep?: number;
      completedSteps?: number[];
      setupHealthScore?: number;
      data?: Record<string, any>;
    }) => {
      const updates: Record<string, any> = {};
      if (currentStep !== undefined) updates.current_step = currentStep;
      if (completedSteps !== undefined) updates.completed_steps = completedSteps;
      if (setupHealthScore !== undefined) updates.setup_health_score = setupHealthScore;
      if (data !== undefined) updates.data = data;

      const { data: progress, error } = await supabase
        .from('onboarding_progress')
        .update(updates)
        .eq('id', id)
        .select()
        .single();
      
      if (error) throw error;
      return progress;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['onboarding-progress'] });
    },
  });
}

export function useRestaurant(orgId: string | undefined) {
  return useQuery({
    queryKey: ['restaurant', orgId],
    queryFn: async () => {
      if (!orgId) return null;
      
      const { data, error } = await supabase
        .from('restaurants')
        .select('*')
        .eq('org_id', orgId)
        .maybeSingle();
      
      if (error) throw error;
      return data ? mapRestaurant(data) : null;
    },
    enabled: !!orgId,
  });
}

export function useCreateRestaurant() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (restaurant: { org_id: string; name: string; address?: Json; [key: string]: any }) => {
      const { data, error } = await supabase
        .from('restaurants')
        .insert(restaurant)
        .select()
        .single();
      
      if (error) throw error;
      return mapRestaurant(data);
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['restaurant', data.org_id] });
    },
  });
}

export function useUpdateRestaurant() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async ({ id, ...updates }: { id: string; [key: string]: any }) => {
      const { data, error } = await supabase
        .from('restaurants')
        .update(updates)
        .eq('id', id)
        .select()
        .single();
      
      if (error) throw error;
      return mapRestaurant(data);
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['restaurant', data.org_id] });
    },
  });
}

// Storage locations
export function useStorageLocations(restaurantId: string | undefined) {
  return useQuery({
    queryKey: ['storage-locations', restaurantId],
    queryFn: async () => {
      if (!restaurantId) return [];
      
      const { data, error } = await supabase
        .from('storage_locations')
        .select('*')
        .eq('restaurant_id', restaurantId)
        .order('sort_order');
      
      if (error) throw error;
      return data;
    },
    enabled: !!restaurantId,
  });
}

export function useCreateStorageLocation() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async ({ restaurant_id, name, sort_order }: { restaurant_id: string; name: string; sort_order?: number }) => {
      const { data, error } = await supabase
        .from('storage_locations')
        .insert({ restaurant_id, name, sort_order })
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['storage-locations', data.restaurant_id] });
    },
  });
}

// Menus
export function useMenus(restaurantId: string | undefined) {
  return useQuery({
    queryKey: ['menus', restaurantId],
    queryFn: async () => {
      if (!restaurantId) return [];
      
      const { data, error } = await supabase
        .from('menus')
        .select(`
          *,
          menu_sections (
            *,
            menu_items (*)
          )
        `)
        .eq('restaurant_id', restaurantId);
      
      if (error) throw error;
      return data;
    },
    enabled: !!restaurantId,
  });
}

export function useCreateMenu() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async ({ restaurant_id, name, source_type, source_ref }: { 
      restaurant_id: string; 
      name?: string; 
      source_type?: string;
      source_ref?: string;
    }) => {
      const { data, error } = await supabase
        .from('menus')
        .insert({ restaurant_id, name, source_type, source_ref })
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['menus', data.restaurant_id] });
    },
  });
}

// Integrations (POS connections)
export function useIntegrations(restaurantId: string | undefined) {
  return useQuery({
    queryKey: ['integrations', restaurantId],
    queryFn: async () => {
      if (!restaurantId) return [];
      
      const { data, error } = await supabase
        .from('integrations')
        .select('*')
        .eq('restaurant_id', restaurantId);
      
      if (error) throw error;
      return data;
    },
    enabled: !!restaurantId,
  });
}

export function useCreateIntegration() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async ({ restaurant_id, type, status }: { 
      restaurant_id: string; 
      type: string; 
      status?: string;
    }) => {
      const { data, error } = await supabase
        .from('integrations')
        .insert({ restaurant_id, type, status: status || 'connected' })
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['integrations', data.restaurant_id] });
    },
  });
}

export function useUpdateIntegration() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async ({ id, ...updates }: { id: string; status?: string; last_sync_at?: string }) => {
      const { data, error } = await supabase
        .from('integrations')
        .update(updates)
        .eq('id', id)
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['integrations', data.restaurant_id] });
    },
  });
}

// Forecast configs (automation settings)
export function useForecastConfig(restaurantId: string | undefined) {
  return useQuery({
    queryKey: ['forecast-config', restaurantId],
    queryFn: async () => {
      if (!restaurantId) return null;
      
      const { data, error } = await supabase
        .from('forecast_configs')
        .select('*')
        .eq('restaurant_id', restaurantId)
        .maybeSingle();
      
      if (error) throw error;
      return data;
    },
    enabled: !!restaurantId,
  });
}

export function useUpsertForecastConfig() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async ({ 
      restaurant_id, 
      auto_alert,
      auto_generate_po,
      require_approval,
      method,
      horizon_days
    }: { 
      restaurant_id: string; 
      auto_alert?: boolean;
      auto_generate_po?: boolean;
      require_approval?: boolean;
      method?: string;
      horizon_days?: number;
    }) => {
      const { data, error } = await supabase
        .from('forecast_configs')
        .upsert({ 
          restaurant_id, 
          auto_alert,
          auto_generate_po,
          require_approval,
          method,
          horizon_days
        }, { onConflict: 'restaurant_id' })
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['forecast-config', data.restaurant_id] });
    },
  });
}

// Reorder rules (par levels)
export function useReorderRules(restaurantId: string | undefined) {
  return useQuery({
    queryKey: ['reorder-rules', restaurantId],
    queryFn: async () => {
      if (!restaurantId) return [];
      
      const { data, error } = await supabase
        .from('reorder_rules')
        .select('*, ingredients(name, unit)')
        .eq('restaurant_id', restaurantId);
      
      if (error) throw error;
      return data;
    },
    enabled: !!restaurantId,
  });
}

export function useUpsertReorderRule() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async ({ 
      restaurant_id, 
      ingredient_id,
      reorder_point_qty,
      par_qty,
      preferred_vendor_id,
      safety_buffer_level
    }: { 
      restaurant_id: string; 
      ingredient_id: string;
      reorder_point_qty?: number;
      par_qty?: number;
      preferred_vendor_id?: string;
      safety_buffer_level?: string;
    }) => {
      // Check if rule exists
      const { data: existing } = await supabase
        .from('reorder_rules')
        .select('id')
        .eq('restaurant_id', restaurant_id)
        .eq('ingredient_id', ingredient_id)
        .maybeSingle();

      if (existing) {
        const { data, error } = await supabase
          .from('reorder_rules')
          .update({ reorder_point_qty, par_qty, preferred_vendor_id, safety_buffer_level })
          .eq('id', existing.id)
          .select()
          .single();
        
        if (error) throw error;
        return data;
      } else {
        const { data, error } = await supabase
          .from('reorder_rules')
          .insert({ 
            restaurant_id, 
            ingredient_id,
            reorder_point_qty: reorder_point_qty || 0,
            par_qty: par_qty || 0,
            preferred_vendor_id,
            safety_buffer_level
          })
          .select()
          .single();
        
        if (error) throw error;
        return data;
      }
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['reorder-rules', data.restaurant_id] });
    },
  });
}

// POS Recipe Maps
export function usePosRecipeMaps(integrationId: string | undefined) {
  return useQuery({
    queryKey: ['pos-recipe-maps', integrationId],
    queryFn: async () => {
      if (!integrationId) return [];
      
      const { data, error } = await supabase
        .from('pos_recipe_maps')
        .select('*, pos_menu_items!inner(*), recipes(*)')
        .eq('pos_menu_items.integration_id', integrationId);
      
      if (error) throw error;
      return data;
    },
    enabled: !!integrationId,
  });
}

export function useUpsertPosRecipeMap() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async ({ 
      pos_menu_item_id, 
      recipe_id,
      confidence
    }: { 
      pos_menu_item_id: string; 
      recipe_id: string;
      confidence?: string;
    }) => {
      const { data, error } = await supabase
        .from('pos_recipe_maps')
        .upsert({ pos_menu_item_id, recipe_id, confidence }, { onConflict: 'pos_menu_item_id,recipe_id' })
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['pos-recipe-maps'] });
    },
  });
}
