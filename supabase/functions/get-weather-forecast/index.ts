import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface WeatherData {
  date: string;
  temp: number;
  tempMin: number;
  tempMax: number;
  condition: string;
  description: string;
  icon: string;
  humidity: number;
  windSpeed: number;
  pop: number; // probability of precipitation
  impact: number; // calculated impact on sales (-50 to +20)
}

// Calculate impact based on weather conditions
function calculateWeatherImpact(condition: string, temp: number, pop: number): number {
  let impact = 0;
  
  // Temperature impact (optimal is around 70°F/21°C)
  if (temp < 32) impact -= 20; // Very cold
  else if (temp < 45) impact -= 10; // Cold
  else if (temp > 95) impact -= 15; // Very hot
  else if (temp > 85) impact -= 5; // Hot
  else if (temp >= 65 && temp <= 75) impact += 5; // Perfect weather
  
  // Condition-based impact
  const lowerCondition = condition.toLowerCase();
  if (lowerCondition.includes('thunderstorm')) impact -= 30;
  else if (lowerCondition.includes('snow')) impact -= 25;
  else if (lowerCondition.includes('rain') || lowerCondition.includes('drizzle')) impact -= 15;
  else if (lowerCondition.includes('mist') || lowerCondition.includes('fog')) impact -= 10;
  else if (lowerCondition.includes('cloud')) impact -= 5;
  else if (lowerCondition.includes('clear') || lowerCondition.includes('sunny')) impact += 10;
  
  // Precipitation probability
  if (pop > 0.8) impact -= 15;
  else if (pop > 0.5) impact -= 10;
  else if (pop > 0.3) impact -= 5;
  
  // Clamp impact between -50 and +20
  return Math.max(-50, Math.min(20, impact));
}

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Weather data is public - no auth required
    const { lat, lon, city, days = 7 } = await req.json();
    
    const apiKey = Deno.env.get('OPENWEATHER_API_KEY');
    if (!apiKey) {
      throw new Error('Weather API key not configured');
    }

    // Build the API URL
    let url: string;
    if (city) {
      url = `https://api.openweathermap.org/data/2.5/forecast?q=${encodeURIComponent(city)}&appid=${apiKey}&units=imperial`;
    } else if (lat && lon) {
      url = `https://api.openweathermap.org/data/2.5/forecast?lat=${lat}&lon=${lon}&appid=${apiKey}&units=imperial`;
    } else {
      throw new Error('Either city name or lat/lon coordinates required');
    }

    console.log('Fetching weather data...');
    
    const response = await fetch(url);
    if (!response.ok) {
      const error = await response.text();
      console.error('OpenWeather API error:', error);
      throw new Error(`Weather API error: ${response.status}`);
    }

    const data = await response.json();
    console.log(`Retrieved ${data.list?.length || 0} weather data points`);

    // Process the 5-day/3-hour forecast into daily summaries
    const dailyMap = new Map<string, WeatherData>();
    
    for (const item of data.list || []) {
      const date = item.dt_txt.split(' ')[0];
      const existing = dailyMap.get(date);
      
      if (!existing) {
        dailyMap.set(date, {
          date,
          temp: item.main.temp,
          tempMin: item.main.temp_min,
          tempMax: item.main.temp_max,
          condition: item.weather[0].main,
          description: item.weather[0].description,
          icon: item.weather[0].icon,
          humidity: item.main.humidity,
          windSpeed: item.wind.speed,
          pop: item.pop || 0,
          impact: 0, // Will calculate after aggregating
        });
      } else {
        // Update min/max temps
        existing.tempMin = Math.min(existing.tempMin, item.main.temp_min);
        existing.tempMax = Math.max(existing.tempMax, item.main.temp_max);
        existing.pop = Math.max(existing.pop, item.pop || 0);
        
        // Use midday reading for condition if available (12:00 or 15:00)
        const hour = parseInt(item.dt_txt.split(' ')[1].split(':')[0]);
        if (hour === 12 || hour === 15) {
          existing.condition = item.weather[0].main;
          existing.description = item.weather[0].description;
          existing.icon = item.weather[0].icon;
          existing.temp = item.main.temp;
        }
      }
    }

    // Calculate impact for each day
    const forecast: WeatherData[] = [];
    for (const [, weather] of dailyMap) {
      weather.impact = calculateWeatherImpact(weather.condition, weather.temp, weather.pop);
      forecast.push(weather);
    }

    // Sort by date and limit to requested days
    forecast.sort((a, b) => a.date.localeCompare(b.date));
    const limitedForecast = forecast.slice(0, days);

    console.log(`Returning ${limitedForecast.length} days of weather forecast`);

    return new Response(JSON.stringify({ 
      forecast: limitedForecast,
      city: data.city?.name,
      country: data.city?.country,
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error: unknown) {
    console.error('Weather function error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return new Response(JSON.stringify({ 
      error: errorMessage,
      forecast: [] 
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
