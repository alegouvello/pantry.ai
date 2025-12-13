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

    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    if (!LOVABLE_API_KEY) {
      console.error('LOVABLE_API_KEY not configured');
      return new Response(
        JSON.stringify({ success: false, error: 'AI service not configured' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const location = [city, state].filter(Boolean).join(', ');
    const searchQuery = location 
      ? `${restaurantName} restaurant in ${location}`
      : `${restaurantName} restaurant`;

    console.log('Searching for restaurant:', searchQuery);

    // Use Lovable AI to generate realistic restaurant data based on the name
    const response = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
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
            content: `You are a restaurant data enrichment assistant. Given a restaurant name and optional location, provide realistic details about what this restaurant might be. Return ONLY valid JSON with no markdown formatting or code blocks.`
          },
          {
            role: 'user',
            content: `Generate realistic restaurant details for: "${restaurantName}"${location ? ` in ${location}` : ''}.

Return a JSON object with these fields:
- address: { street: string, city: string, state: string, zip: string }
- phone: string (format: (XXX) XXX-XXXX)
- website: string (generate a plausible URL)
- instagram: string (generate a plausible handle starting with @)
- conceptType: one of "fine_dining", "casual", "quick_service", "bar", "coffee", "bakery"
- services: array of services offered (from: "lunch", "dinner", "brunch", "delivery", "catering", "tasting_menu", "seasonal_menu")
- cuisineTags: array of cuisine types (e.g., "French", "Italian", "American")
- confidence: "high", "medium", or "low" based on how confident you are in the data

Base your response on the restaurant name - if it suggests a cuisine type (like "French Diner"), use that to inform your response. If a city was provided, use it. Otherwise, use a major US city.`
          }
        ],
        tools: [
          {
            type: 'function',
            function: {
              name: 'return_restaurant_data',
              description: 'Return enriched restaurant data',
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
                  phone: { type: 'string' },
                  website: { type: 'string' },
                  instagram: { type: 'string' },
                  conceptType: { 
                    type: 'string',
                    enum: ['fine_dining', 'casual', 'quick_service', 'bar', 'coffee', 'bakery']
                  },
                  services: {
                    type: 'array',
                    items: { 
                      type: 'string',
                      enum: ['lunch', 'dinner', 'brunch', 'delivery', 'catering', 'tasting_menu', 'seasonal_menu']
                    }
                  },
                  cuisineTags: {
                    type: 'array',
                    items: { type: 'string' }
                  },
                  confidence: {
                    type: 'string',
                    enum: ['high', 'medium', 'low']
                  }
                },
                required: ['address', 'phone', 'website', 'instagram', 'conceptType', 'services', 'cuisineTags', 'confidence']
              }
            }
          }
        ],
        tool_choice: { type: 'function', function: { name: 'return_restaurant_data' } }
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(
          JSON.stringify({ success: false, error: 'Rate limit exceeded. Please try again later.' }),
          { status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      if (response.status === 402) {
        return new Response(
          JSON.stringify({ success: false, error: 'AI service credits exhausted. Please add credits.' }),
          { status: 402, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      const errorText = await response.text();
      console.error('AI gateway error:', response.status, errorText);
      return new Response(
        JSON.stringify({ success: false, error: 'AI service error' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const aiResponse = await response.json();
    console.log('AI response received');

    // Extract the tool call result
    const toolCall = aiResponse.choices?.[0]?.message?.tool_calls?.[0];
    if (!toolCall || toolCall.function.name !== 'return_restaurant_data') {
      console.error('Unexpected AI response format:', aiResponse);
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
