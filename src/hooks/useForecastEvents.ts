import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Tables, TablesInsert } from '@/integrations/supabase/types';
import { toast } from 'sonner';

export type ForecastEvent = Tables<'forecast_events'>;
export type ForecastEventInsert = TablesInsert<'forecast_events'>;

export const EVENT_TYPES = [
  { value: 'holiday', label: 'Holiday', icon: '🎄', defaultImpact: 25 },
  { value: 'special_event', label: 'Special Event', icon: '🎉', defaultImpact: 15 },
  { value: 'reservation', label: 'Large Reservation', icon: '📅', defaultImpact: 10 },
  { value: 'weather', label: 'Weather Impact', icon: '🌧️', defaultImpact: -15 },
  { value: 'promotion', label: 'Promotion', icon: '🏷️', defaultImpact: 20 },
  { value: 'custom', label: 'Custom', icon: '📝', defaultImpact: 0 },
] as const;

export const PRESET_HOLIDAYS = [
  { name: "Valentine's Day", month: 2, day: 14, impact: 40 },
  { name: "Mother's Day", month: 5, day: 12, impact: 50 },
  { name: "Father's Day", month: 6, day: 15, impact: 30 },
  { name: "Independence Day", month: 7, day: 4, impact: 25 },
  { name: "Halloween", month: 10, day: 31, impact: 15 },
  { name: "Thanksgiving", month: 11, day: 28, impact: 60 },
  { name: "Christmas Eve", month: 12, day: 24, impact: 35 },
  { name: "Christmas Day", month: 12, day: 25, impact: -50 },
  { name: "New Year's Eve", month: 12, day: 31, impact: 75 },
  { name: "New Year's Day", month: 1, day: 1, impact: -30 },
];

export function useForecastEvents(restaurantId?: string, startDate?: Date, endDate?: Date) {
  const queryClient = useQueryClient();

  const eventsQuery = useQuery({
    queryKey: ['forecast-events', restaurantId, startDate?.toISOString(), endDate?.toISOString()],
    queryFn: async () => {
      let query = supabase
        .from('forecast_events')
        .select('*')
        .order('event_date', { ascending: true });

      if (restaurantId) {
        query = query.eq('restaurant_id', restaurantId);
      }

      if (startDate) {
        query = query.gte('event_date', startDate.toISOString().split('T')[0]);
      }

      if (endDate) {
        query = query.lte('event_date', endDate.toISOString().split('T')[0]);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data as ForecastEvent[];
    },
    enabled: !!restaurantId,
  });

  const addEvent = useMutation({
    mutationFn: async (event: ForecastEventInsert) => {
      const { data, error } = await supabase
        .from('forecast_events')
        .insert(event)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['forecast-events'] });
      toast.success('Event added to forecast');
    },
    onError: (error) => {
      toast.error('Failed to add event: ' + error.message);
    },
  });

  const updateEvent = useMutation({
    mutationFn: async ({ id, ...updates }: Partial<ForecastEvent> & { id: string }) => {
      const { data, error } = await supabase
        .from('forecast_events')
        .update(updates)
        .eq('id', id)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['forecast-events'] });
      toast.success('Event updated');
    },
    onError: (error) => {
      toast.error('Failed to update event: ' + error.message);
    },
  });

  const deleteEvent = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('forecast_events')
        .delete()
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['forecast-events'] });
      toast.success('Event removed');
    },
    onError: (error) => {
      toast.error('Failed to delete event: ' + error.message);
    },
  });

  // Helper to get impact for a specific date
  const getImpactForDate = (date: Date): number => {
    if (!eventsQuery.data) return 0;
    const dateStr = date.toISOString().split('T')[0];
    const event = eventsQuery.data.find(e => e.event_date === dateStr);
    return event ? Number(event.impact_percent) : 0;
  };

  return {
    events: eventsQuery.data || [],
    isLoading: eventsQuery.isLoading,
    error: eventsQuery.error,
    addEvent,
    updateEvent,
    deleteEvent,
    getImpactForDate,
  };
}
