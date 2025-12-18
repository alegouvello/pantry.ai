import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";
import { z } from "https://deno.land/x/zod@v3.22.4/mod.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Input validation schema
const InputSchema = z.object({
  restaurantName: z.string().min(1).max(200).trim(),
  location: z.string().max(200).trim().optional(),
});

interface DayHours {
  open: string;
  close: string;
  closed: boolean;
}

interface BusinessHours {
  [key: string]: DayHours;
}

// Parse time strings like "5:30 PM", "11 AM", "5:30-11 PM" to 24h format "17:30"
// Also handles cases where AM/PM is only on the second time (e.g., "5:30-11 PM" means 5:30 PM to 11 PM)
function parseTime(timeStr: string, inferredPeriod?: string): string {
  if (!timeStr) return '';
  
  const cleaned = timeStr.trim().toLowerCase();
  
  // Handle "closed" or similar
  if (cleaned.includes('closed')) return '';
  
  // Extract hours and minutes - handle formats like "5:30", "11", "5:30 PM", "11PM"
  const timeMatch = cleaned.match(/(\d{1,2})(?::(\d{2}))?\s*(am|pm)?/i);
  if (!timeMatch) return '';
  
  let hours = parseInt(timeMatch[1], 10);
  const minutes = timeMatch[2] || '00';
  let period = timeMatch[3]?.toLowerCase() || inferredPeriod;
  
  // If no period and hours <= 6, likely PM for restaurant hours
  if (!period && hours <= 6) {
    period = 'pm';
  }
  
  // Convert to 24h format
  if (period === 'pm' && hours !== 12) hours += 12;
  if (period === 'am' && hours === 12) hours = 0;
  
  return `${hours.toString().padStart(2, '0')}:${minutes}`;
}

// Extract business hours from scraped content
function extractBusinessHours(content: string): BusinessHours | null {
  const hours: BusinessHours = {
    monday: { open: '', close: '', closed: true },
    tuesday: { open: '', close: '', closed: true },
    wednesday: { open: '', close: '', closed: true },
    thursday: { open: '', close: '', closed: true },
    friday: { open: '', close: '', closed: true },
    saturday: { open: '', close: '', closed: true },
    sunday: { open: '', close: '', closed: true },
  };
  
  const dayMap: Record<string, string> = {
    'monday': 'monday', 'mon': 'monday',
    'tuesday': 'tuesday', 'tue': 'tuesday', 'tues': 'tuesday',
    'wednesday': 'wednesday', 'wed': 'wednesday',
    'thursday': 'thursday', 'thu': 'thursday', 'thur': 'thursday', 'thurs': 'thursday',
    'friday': 'friday', 'fri': 'friday',
    'saturday': 'saturday', 'sat': 'saturday',
    'sunday': 'sunday', 'sun': 'sunday',
  };
  
  let foundAny = false;
  
  // Pattern 1: Google-style "Sunday 5:30-10 PM" or "Monday 5:30–11 PM"
  // Handles: "Day TIME-TIME PM" where PM only appears once at end
  const googlePattern = /\b(mon(?:day)?|tue(?:s(?:day)?)?|wed(?:nesday)?|thu(?:r(?:s(?:day)?)?)?|fri(?:day)?|sat(?:urday)?|sun(?:day)?)\b[:\s]*(\d{1,2}(?::\d{2})?)\s*(am|pm)?\s*[-–—]+\s*(\d{1,2}(?::\d{2})?)\s*(am|pm)/gi;
  
  let match;
  while ((match = googlePattern.exec(content)) !== null) {
    const dayKey = dayMap[match[1].toLowerCase()];
    if (dayKey) {
      const openTimeStr = match[2];
      const openPeriod = match[3]?.toLowerCase();
      const closeTimeStr = match[4];
      const closePeriod = match[5]?.toLowerCase();
      
      // If opening time has no AM/PM, infer from closing time
      const inferredPeriod = openPeriod || closePeriod;
      
      const openTime = parseTime(openTimeStr, inferredPeriod);
      const closeTime = parseTime(closeTimeStr, closePeriod);
      
      if (openTime && closeTime) {
        hours[dayKey] = {
          open: openTime,
          close: closeTime,
          closed: false,
        };
        foundAny = true;
      }
    }
  }
  
  // Pattern 2: "Monday: 11:00 AM - 10:00 PM" (both times have AM/PM)
  const fullPattern = /\b(mon(?:day)?|tue(?:s(?:day)?)?|wed(?:nesday)?|thu(?:r(?:s(?:day)?)?)?|fri(?:day)?|sat(?:urday)?|sun(?:day)?)\b[:\s]*(\d{1,2}(?::\d{2})?)\s*(am|pm)\s*[-–—to]+\s*(\d{1,2}(?::\d{2})?)\s*(am|pm)/gi;
  
  while ((match = fullPattern.exec(content)) !== null) {
    const dayKey = dayMap[match[1].toLowerCase()];
    if (dayKey && hours[dayKey].closed) { // Don't overwrite if already found
      const openTime = parseTime(match[2] + ' ' + match[3]);
      const closeTime = parseTime(match[4] + ' ' + match[5]);
      
      if (openTime && closeTime) {
        hours[dayKey] = {
          open: openTime,
          close: closeTime,
          closed: false,
        };
        foundAny = true;
      }
    }
  }
  
  // Pattern 3: Day listed as "Closed"
  const closedPattern = /\b(mon(?:day)?|tue(?:s(?:day)?)?|wed(?:nesday)?|thu(?:r(?:s(?:day)?)?)?|fri(?:day)?|sat(?:urday)?|sun(?:day)?)\b[:\s]*closed/gi;
  
  while ((match = closedPattern.exec(content)) !== null) {
    const dayKey = dayMap[match[1].toLowerCase()];
    if (dayKey) {
      hours[dayKey] = { open: '', close: '', closed: true };
      foundAny = true;
    }
  }
  
  // Pattern 4: Range of days like "Mon-Fri: 5:30-11 PM"
  const rangePattern = /(mon(?:day)?)\s*[-–—]\s*(fri(?:day)?|sat(?:urday)?|sun(?:day)?)[:\s]*(\d{1,2}(?::\d{2})?)\s*(am|pm)?\s*[-–—to]+\s*(\d{1,2}(?::\d{2})?)\s*(am|pm)/gi;
  
  while ((match = rangePattern.exec(content)) !== null) {
    const startDay = dayMap[match[1].toLowerCase()];
    const endDay = dayMap[match[2].toLowerCase()];
    const inferredPeriod = match[4]?.toLowerCase() || match[6]?.toLowerCase();
    const openTime = parseTime(match[3], inferredPeriod);
    const closeTime = parseTime(match[5], match[6]?.toLowerCase());
    
    if (startDay && endDay && openTime && closeTime) {
      const days = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'];
      const startIdx = days.indexOf(startDay);
      const endIdx = days.indexOf(endDay);
      
      for (let i = startIdx; i <= endIdx; i++) {
        if (hours[days[i]].closed) { // Don't overwrite
          hours[days[i]] = { open: openTime, close: closeTime, closed: false };
          foundAny = true;
        }
      }
    }
  }
  
  return foundAny ? hours : null;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Verify authentication
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(
        JSON.stringify({ success: false, error: 'Unauthorized' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
    
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      { global: { headers: { Authorization: authHeader } } }
    );
    
    const { data: { user }, error: authError } = await supabaseClient.auth.getUser();
    if (authError || !user) {
      console.error('Auth error:', authError);
      return new Response(
        JSON.stringify({ success: false, error: 'Unauthorized' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
    
    console.log('Authenticated user:', user.id);
    
    // Parse and validate input
    const rawInput = await req.json();
    const parseResult = InputSchema.safeParse(rawInput);
    
    if (!parseResult.success) {
      console.error('Validation error:', parseResult.error.errors);
      return new Response(
        JSON.stringify({ success: false, error: 'Invalid input: ' + parseResult.error.errors.map(e => e.message).join(', ') }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
    
    const { restaurantName, location } = parseResult.data;

    const FIRECRAWL_API_KEY = Deno.env.get('FIRECRAWL_API_KEY');
    if (!FIRECRAWL_API_KEY) {
      console.error('FIRECRAWL_API_KEY not configured');
      return new Response(
        JSON.stringify({ success: false, error: 'Lookup service not configured' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Build search query
    const searchQuery = location 
      ? `${restaurantName} ${location} restaurant hours`
      : `${restaurantName} restaurant hours`;

    console.log('Searching for business hours:', searchQuery);

    // Use Firecrawl search to find business hours
    const searchResponse = await fetch('https://api.firecrawl.dev/v1/search', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${FIRECRAWL_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        query: searchQuery,
        limit: 5,
        scrapeOptions: {
          formats: ['markdown'],
        },
      }),
    });

    const searchData = await searchResponse.json();

    if (!searchResponse.ok) {
      console.error('Firecrawl search error:', searchData);
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: searchData.error || 'Search failed' 
        }),
        { status: searchResponse.status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Try to extract hours from search results
    const results = searchData.data || [];
    let extractedHours: BusinessHours | null = null;
    let sourceName = '';

    for (const result of results) {
      const content = result.markdown || result.description || '';
      const hours = extractBusinessHours(content);
      
      if (hours) {
        extractedHours = hours;
        sourceName = result.title || result.url || 'web';
        console.log('Found hours from:', sourceName);
        break;
      }
    }

    if (!extractedHours) {
      // Try a Yelp-specific search
      const yelpQuery = `site:yelp.com ${restaurantName} hours`;
      console.log('Trying Yelp search:', yelpQuery);
      
      const yelpResponse = await fetch('https://api.firecrawl.dev/v1/search', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${FIRECRAWL_API_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          query: yelpQuery,
          limit: 3,
          scrapeOptions: {
            formats: ['markdown'],
          },
        }),
      });

      const yelpData = await yelpResponse.json();
      const yelpResults = yelpData.data || [];

      for (const result of yelpResults) {
        const content = result.markdown || result.description || '';
        const hours = extractBusinessHours(content);
        
        if (hours) {
          extractedHours = hours;
          sourceName = 'Yelp';
          console.log('Found hours from Yelp');
          break;
        }
      }
    }

    if (!extractedHours) {
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: 'Could not find business hours online. Please enter manually.' 
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('Successfully extracted hours:', extractedHours);

    return new Response(
      JSON.stringify({ 
        success: true, 
        hours: extractedHours,
        source: sourceName,
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error looking up hours:', error);
    return new Response(
      JSON.stringify({ success: false, error: 'An error occurred processing your request' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
