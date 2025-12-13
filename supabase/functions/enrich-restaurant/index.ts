import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { restaurantName, city, state } = await req.json();
    
    if (!restaurantName) {
      return new Response(
        JSON.stringify({ success: false, error: 'Restaurant name is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const FIRECRAWL_API_KEY = Deno.env.get('FIRECRAWL_API_KEY');
    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    
    if (!FIRECRAWL_API_KEY) {
      console.error('FIRECRAWL_API_KEY not configured');
      return new Response(
        JSON.stringify({ success: false, error: 'Firecrawl API not configured. Please add your FIRECRAWL_API_KEY.' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (!LOVABLE_API_KEY) {
      console.error('LOVABLE_API_KEY not configured');
      return new Response(
        JSON.stringify({ success: false, error: 'AI service not configured' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const location = [city, state].filter(Boolean).join(', ');
    const searchQuery = location 
      ? `${restaurantName} restaurant ${location}`
      : `${restaurantName} restaurant`;

    console.log('Searching for restaurant with Firecrawl:', searchQuery);

    // Step 1: Use Firecrawl to search for the restaurant
    const firecrawlResponse = await fetch('https://api.firecrawl.dev/v1/search', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${FIRECRAWL_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        query: searchQuery,
        limit: 5,
        scrapeOptions: {
          formats: ['markdown']
        }
      }),
    });

    if (!firecrawlResponse.ok) {
      const errorText = await firecrawlResponse.text();
      console.error('Firecrawl error:', firecrawlResponse.status, errorText);
      return new Response(
        JSON.stringify({ success: false, error: 'Failed to search for restaurant data' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const firecrawlData = await firecrawlResponse.json();
    console.log('Firecrawl results count:', firecrawlData.data?.length || 0);

    // Combine all scraped content
    const scrapedContent = firecrawlData.data
      ?.map((result: any) => `Source: ${result.url}\n${result.markdown || result.description || ''}`)
      .join('\n\n---\n\n') || '';

    if (!scrapedContent) {
      console.log('No search results found, falling back to AI-only enrichment');
    }

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
            content: `You are a restaurant data extraction assistant. Extract real restaurant information from web search results. If specific information is not found, leave it blank or make a reasonable inference clearly marked with low confidence.`
          },
          {
            role: 'user',
            content: `Extract restaurant details for "${restaurantName}"${location ? ` in ${location}` : ''} from the following web search results:

${scrapedContent || 'No search results available. Please provide your best inference based on the restaurant name.'}

Extract and return structured data. Only include information you find in the search results. If you cannot find specific details, you may infer based on the restaurant name but mark confidence as "low".`
          }
        ],
        tools: [
          {
            type: 'function',
            function: {
              name: 'return_restaurant_data',
              description: 'Return extracted restaurant data',
              parameters: {
                type: 'object',
                properties: {
                  address: {
                    type: 'object',
                    properties: {
                      street: { type: 'string' },
                      city: { type: 'string' },
                      state: { type: 'string' },
                      zip: { type: 'string' }
                    },
                    required: ['street', 'city', 'state', 'zip']
                  },
                  phone: { type: 'string', description: 'Phone number in format (XXX) XXX-XXXX' },
                  website: { type: 'string', description: 'Restaurant website URL' },
                  instagram: { type: 'string', description: 'Instagram handle starting with @' },
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
                    description: 'How confident you are in the extracted data. "high" if found in search results, "medium" if partially found, "low" if inferred'
                  },
                  sources: {
                    type: 'array',
                    items: { type: 'string' },
                    description: 'URLs of sources used to extract data'
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
      if (aiResponse.status === 429) {
        return new Response(
          JSON.stringify({ success: false, error: 'Rate limit exceeded. Please try again later.' }),
          { status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      if (aiResponse.status === 402) {
        return new Response(
          JSON.stringify({ success: false, error: 'AI service credits exhausted. Please add credits.' }),
          { status: 402, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      const errorText = await aiResponse.text();
      console.error('AI gateway error:', aiResponse.status, errorText);
      return new Response(
        JSON.stringify({ success: false, error: 'AI service error' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
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
    console.log('Enriched data:', enrichedData);

    return new Response(
      JSON.stringify({ success: true, data: enrichedData }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error enriching restaurant:', error);
    return new Response(
      JSON.stringify({ success: false, error: error instanceof Error ? error.message : 'Unknown error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
