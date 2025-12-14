import "https://deno.land/x/xhr@0.1.0/mod.ts";
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
    const { recipeName, category } = await req.json();

    const FIRECRAWL_API_KEY = Deno.env.get('FIRECRAWL_API_KEY');
    if (!FIRECRAWL_API_KEY) {
      throw new Error('FIRECRAWL_API_KEY is not configured');
    }

    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    if (!LOVABLE_API_KEY) {
      throw new Error('LOVABLE_API_KEY is not configured');
    }

    console.log(`Searching web for recipe: ${recipeName}`);

    // Search for the recipe using Firecrawl
    const searchQuery = `${recipeName} recipe instructions steps how to make`;
    const searchResponse = await fetch('https://api.firecrawl.dev/v1/search', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${FIRECRAWL_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        query: searchQuery,
        limit: 3,
        scrapeOptions: {
          formats: ['markdown'],
        },
      }),
    });

    if (!searchResponse.ok) {
      const errorText = await searchResponse.text();
      console.error('Firecrawl search error:', searchResponse.status, errorText);
      throw new Error('Failed to search for recipe');
    }

    const searchData = await searchResponse.json();
    console.log('Search results found:', searchData.data?.length || 0);

    if (!searchData.data || searchData.data.length === 0) {
      return new Response(JSON.stringify({ 
        steps: [], 
        source: null,
        error: 'No recipes found on the web' 
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Get the best result with content
    const bestResult = searchData.data.find((r: any) => r.markdown && r.markdown.length > 200) || searchData.data[0];
    const recipeContent = bestResult.markdown || '';
    const sourceUrl = bestResult.url || '';
    const sourceTitle = bestResult.title || '';

    console.log('Best source:', sourceUrl);

    // Use AI to extract structured steps from the scraped content
    const extractionPrompt = `Extract the cooking instructions/steps from this recipe content. Return ONLY a JSON object with a "steps" array containing objects with "step" (number) and "instruction" (string) properties.

Recipe content:
${recipeContent.substring(0, 8000)}

Important:
- Extract only the actual cooking/preparation steps
- Number them sequentially starting from 1
- Keep each step concise but complete
- Ignore ingredient lists, nutrition info, comments, etc.
- If no clear steps are found, return {"steps": []}`;

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
            content: 'You are a recipe parser. Extract cooking steps from content and return valid JSON only.' 
          },
          { role: 'user', content: extractionPrompt }
        ],
      }),
    });

    if (!aiResponse.ok) {
      if (aiResponse.status === 429) {
        return new Response(JSON.stringify({ error: 'Rate limit exceeded, please try again later.' }), {
          status: 429,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
      if (aiResponse.status === 402) {
        return new Response(JSON.stringify({ error: 'Payment required, please add credits.' }), {
          status: 402,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
      throw new Error('Failed to parse recipe steps');
    }

    const aiData = await aiResponse.json();
    const content = aiData.choices?.[0]?.message?.content || '';

    // Parse the JSON response
    let steps = [];
    try {
      const jsonMatch = content.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        const parsed = JSON.parse(jsonMatch[0]);
        steps = parsed.steps || [];
      }
    } catch (parseError) {
      console.error('Parse error:', parseError);
    }

    console.log(`Extracted ${steps.length} steps from ${sourceUrl}`);

    return new Response(JSON.stringify({ 
      steps,
      source: {
        url: sourceUrl,
        title: sourceTitle,
      }
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Error searching recipe steps:', error);
    const errorMessage = error instanceof Error ? error.message : 'Failed to search recipes';
    return new Response(JSON.stringify({ error: errorMessage }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
