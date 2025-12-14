import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export interface WeatherData {
  date: string;
  temp: number;
  tempMin: number;
  tempMax: number;
  condition: string;
  description: string;
  icon: string;
  humidity: number;
  windSpeed: number;
  pop: number;
  impact: number;
}

export interface WeatherForecast {
  forecast: WeatherData[];
  city?: string;
  country?: string;
}

// Weather condition to icon mapping
export const WEATHER_ICONS: Record<string, string> = {
  'Clear': '☀️',
  'Clouds': '☁️',
  'Rain': '🌧️',
  'Drizzle': '🌦️',
  'Thunderstorm': '⛈️',
  'Snow': '❄️',
  'Mist': '🌫️',
  'Fog': '🌫️',
  'Haze': '🌫️',
};

export function useWeatherForecast(city?: string, lat?: number, lon?: number, days: number = 7) {
  return useQuery({
    queryKey: ['weather-forecast', city, lat, lon, days],
    queryFn: async (): Promise<WeatherForecast> => {
      const { data, error } = await supabase.functions.invoke('get-weather-forecast', {
        body: { city, lat, lon, days },
      });

      if (error) {
        console.error('Weather fetch error:', error);
        throw error;
      }

      return data as WeatherForecast;
    },
    enabled: !!(city || (lat && lon)),
    staleTime: 1000 * 60 * 30, // 30 minutes
    gcTime: 1000 * 60 * 60, // 1 hour
    retry: 1,
  });
}

// Helper to get weather icon
export function getWeatherIcon(condition: string): string {
  return WEATHER_ICONS[condition] || '🌡️';
}

// Helper to format temperature
export function formatTemp(temp: number): string {
  return `${Math.round(temp)}°F`;
}

// Helper to get impact color
export function getImpactColor(impact: number): string {
  if (impact >= 10) return 'text-green-600';
  if (impact >= 0) return 'text-muted-foreground';
  if (impact >= -10) return 'text-yellow-600';
  if (impact >= -20) return 'text-orange-600';
  return 'text-red-600';
}

// Helper to get impact badge variant
export function getImpactBadgeVariant(impact: number): 'default' | 'secondary' | 'destructive' | 'outline' {
  if (impact >= 10) return 'default';
  if (impact >= 0) return 'secondary';
  if (impact >= -15) return 'outline';
  return 'destructive';
}
