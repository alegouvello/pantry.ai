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
  city: z.string().max(100).trim().optional(),
  state: z.string().max(50).trim().optional(),
});

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
    
    // Extract JWT token from Bearer header
    const token = authHeader.replace('Bearer ', '');
    
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? ''
    );
    
    // Use getUser with the token directly for edge function auth
    const { data: { user }, error: authError } = await supabaseClient.auth.getUser(token);
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
    
    const { restaurantName, city, state } = parseResult.data;

    const FIRECRAWL_API_KEY = Deno.env.get('FIRECRAWL_API_KEY');
    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    
    if (!FIRECRAWL_API_KEY) {
      console.error('FIRECRAWL_API_KEY not configured');
      return new Response(
        JSON.stringify({ success: false, error: 'Service temporarily unavailable' }),
        { status: 503, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (!LOVABLE_API_KEY) {
      console.error('LOVABLE_API_KEY not configured');
      return new Response(
        JSON.stringify({ success: false, error: 'Service temporarily unavailable' }),
        { status: 503, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const location = [city, state].filter(Boolean).join(', ');
    
    // Search for address specifically using Yelp/Google as targets
    const addressSearchQuery = location 
      ? `"${restaurantName}" address phone ${location}`
      : `"${restaurantName}" restaurant address phone`;
    
    // Also search for general info
    const generalSearchQuery = location 
      ? `${restaurantName} restaurant ${location}`
      : `${restaurantName} restaurant`;

    console.log('Searching for restaurant address with Firecrawl:', addressSearchQuery);

    // Step 1a: Search for address info (targeting business listings)
    const addressSearchPromise = fetch('https://api.firecrawl.dev/v1/search', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${FIRECRAWL_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        query: addressSearchQuery,
        limit: 3,
        scrapeOptions: {
          formats: ['markdown']
        }
      }),
    });

    // Step 1b: Search for general info
    const generalSearchPromise = fetch('https://api.firecrawl.dev/v1/search', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${FIRECRAWL_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        query: generalSearchQuery,
        limit: 3,
        scrapeOptions: {
          formats: ['markdown']
        }
      }),
    });

    // Run both searches in parallel
    const [addressResponse, generalResponse] = await Promise.all([
      addressSearchPromise,
      generalSearchPromise
    ]);

    let allContent: string[] = [];

    if (addressResponse.ok) {
      const addressData = await addressResponse.json();
      console.log('Address search results count:', addressData.data?.length || 0);
      if (addressData.data) {
        allContent.push(...addressData.data.map((result: any) => 
          `Source: ${result.url}\n${result.markdown || result.description || ''}`
        ));
      }
    }

    if (generalResponse.ok) {
      const generalData = await generalResponse.json();
      console.log('General search results count:', generalData.data?.length || 0);
      if (generalData.data) {
        allContent.push(...generalData.data.map((result: any) => 
          `Source: ${result.url}\n${result.markdown || result.description || ''}`
        ));
      }
    }

    const scrapedContent = allContent.join('\n\n---\n\n');

    if (!scrapedContent) {
      console.log('No search results found, falling back to AI-only enrichment');
    } else {
      console.log('Total scraped content length:', scrapedContent.length);
    }

    // Truncate content to prevent excessive payload sizes
    const truncatedContent = scrapedContent.substring(0, 50000);

    // Step 2: Use Lovable AI to extract structured data from scraped content
    const aiResponse = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${LOVABLE_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'google/gemini-2.5-flash',
        messages: [
          {
            role: 'system',
            content: `You are a restaurant data extraction assistant. Extract REAL restaurant information from web search results. 
            
CRITICAL RULES:
- ONLY include data that you actually find in the search results
- If a field is not found, use an EMPTY STRING "" - never put placeholder text like "low confidence" or "not found"
- For street addresses, ALWAYS include the FULL address with building/street number (e.g., "188 Orchard Street" not just "Orchard Street")
- For zip codes, only include actual 5-digit zip codes, otherwise leave empty
- For phone numbers, only include real phone numbers found, otherwise leave empty
- For websites, only include real URLs found, otherwise leave empty
- Confidence should be "high" if data is found in search results, "low" if inferred from name alone`
          },
          {
            role: 'user',
            content: `Extract restaurant details for "${restaurantName}"${location ? ` in ${location}` : ''} from the following web search results:

${truncatedContent || 'No search results available.'}

IMPORTANT: Only return actual data found. Leave fields EMPTY (empty string "") if not found - do not put placeholder text.`
          }
        ],
        tools: [
          {
            type: 'function',
            function: {
              name: 'return_restaurant_data',
              description: 'Return extracted restaurant data. Use empty strings for missing fields.',
              parameters: {
                type: 'object',
                properties: {
                  address: {
                    type: 'object',
                    properties: {
                      street: { type: 'string', description: 'COMPLETE street address WITH building number (e.g., "188 Orchard Street") or empty string if not found' },
                      city: { type: 'string', description: 'City name or empty string if not found' },
                      state: { type: 'string', description: 'State abbreviation or empty string if not found' },
                      zip: { type: 'string', description: '5-digit ZIP code ONLY or empty string if not found' }
                    },
                    required: ['street', 'city', 'state', 'zip']
                  },
                  phone: { type: 'string', description: 'Phone number in (XXX) XXX-XXXX format or empty string' },
                  website: { type: 'string', description: 'Website URL or empty string if not found' },
                  instagram: { type: 'string', description: 'Instagram handle with @ or empty string if not found' },
                  conceptType: { 
                    type: 'string',
                    enum: ['fine_dining', 'casual', 'quick_service', 'bar', 'coffee', 'bakery'],
                    description: 'Type of restaurant concept'
                  },
                  services: {
                    type: 'array',
                    items: { 
                      type: 'string',
                      enum: ['lunch', 'dinner', 'brunch', 'delivery', 'catering', 'tasting_menu', 'seasonal_menu']
                    },
                    description: 'Services offered by the restaurant'
                  },
                  cuisineTags: {
                    type: 'array',
                    items: { type: 'string' },
                    description: 'Cuisine types (e.g., French, Italian, American)'
                  },
                  confidence: {
                    type: 'string',
                    enum: ['high', 'medium', 'low'],
                    description: 'high if data found in search results, low if inferred'
                  },
                  sources: {
                    type: 'array',
                    items: { type: 'string' },
                    description: 'URLs of sources used'
                  }
                },
                required: ['address', 'conceptType', 'services', 'cuisineTags', 'confidence']
              }
            }
          }
        ],
        tool_choice: { type: 'function', function: { name: 'return_restaurant_data' } }
      }),
    });

    if (!aiResponse.ok) {
      const errorText = await aiResponse.text();
      console.error('AI gateway error:', aiResponse.status, errorText);
      if (aiResponse.status === 429) {
        return new Response(
          JSON.stringify({ success: false, error: 'Please try again later' }),
          { status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      return new Response(
        JSON.stringify({ success: false, error: 'Service temporarily unavailable' }),
        { status: 503, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const aiData = await aiResponse.json();
    console.log('AI extraction completed');

    // Extract the tool call result
    const toolCall = aiData.choices?.[0]?.message?.tool_calls?.[0];
    if (!toolCall || toolCall.function.name !== 'return_restaurant_data') {
      console.error('Unexpected AI response format:', aiData);
      return new Response(
        JSON.stringify({ success: false, error: 'Failed to parse AI response' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const enrichedData = JSON.parse(toolCall.function.arguments);
    
    // Sanitize: remove any fields that contain placeholder text instead of real data
    const placeholderPatterns = ['low confidence', 'not found', 'unknown', 'n/a', 'none'];
    const sanitize = (value: string | undefined): string => {
      if (!value) return '';
      const lower = value.toLowerCase().trim();
      if (placeholderPatterns.some(p => lower.includes(p))) return '';
      return value;
    };
    
    // Clean up the data
    if (enrichedData.address) {
      enrichedData.address.street = sanitize(enrichedData.address.street);
      enrichedData.address.city = sanitize(enrichedData.address.city);
      enrichedData.address.state = sanitize(enrichedData.address.state);
      enrichedData.address.zip = sanitize(enrichedData.address.zip);
      // Validate zip is actually a number
      if (enrichedData.address.zip && !/^\d{5}(-\d{4})?$/.test(enrichedData.address.zip)) {
        enrichedData.address.zip = '';
      }
    }
    enrichedData.phone = sanitize(enrichedData.phone);
    enrichedData.website = sanitize(enrichedData.website);
    enrichedData.instagram = sanitize(enrichedData.instagram);
    
    console.log('Sanitized enriched data:', enrichedData);

    return new Response(
      JSON.stringify({ success: true, data: enrichedData }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error enriching restaurant:', error);
    return new Response(
      JSON.stringify({ success: false, error: 'An error occurred processing your request' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
