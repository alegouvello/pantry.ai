import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";
import { z } from "https://deno.land/x/zod@v3.22.4/mod.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Input validation schema
const IngredientInputSchema = z.object({
  id: z.string().uuid(),
  name: z.string().min(1).max(200),
  category: z.string().max(100),
  unit: z.string().max(50),
  currentStock: z.number().min(0).max(1000000),
  storageLocation: z.string().max(100).optional(),
});

const InputSchema = z.object({
  ingredients: z.array(IngredientInputSchema).min(1).max(500),
  conceptType: z.string().max(100).optional(),
});

serve(async (req) => {
  // Handle CORS preflight requests
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
    
    const { ingredients, conceptType } = parseResult.data;
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    
    if (!LOVABLE_API_KEY) {
      console.error('LOVABLE_API_KEY not configured');
      return new Response(
        JSON.stringify({ error: 'Service temporarily unavailable' }),
        { status: 503, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`Generating par level suggestions for ${ingredients.length} ingredients`);

    const systemPrompt = `You are an expert restaurant inventory consultant specializing in par level optimization. 
Based on industry standards and best practices, suggest appropriate par levels for restaurant ingredients.

Consider these factors:
- Ingredient category (proteins need higher turnover than dry goods)
- Storage type (refrigerated items have shorter shelf life)
- Typical usage patterns in ${conceptType || 'casual dining'} restaurants
- Industry benchmarks for food cost optimization
- Buffer for busy periods (typically 20-30% above average daily usage)

For each ingredient, suggest:
1. par_level: The optimal maximum stock level (in the same unit as provided)
2. reorder_point: The trigger point for reordering (typically 30-40% of par level)
3. reasoning: Brief explanation of why this level is recommended

IMPORTANT: Return ONLY a valid JSON array with no additional text. Each object must have: id, par_level (number), reorder_point (number), reasoning (string).`;

    const ingredientList = ingredients.map(ing => 
      `- ${ing.name} (${ing.category}, stored in ${ing.storageLocation || 'dry storage'}, unit: ${ing.unit}, current: ${ing.currentStock})`
    ).join('\n');

    const userPrompt = `Suggest optimal par levels for these restaurant ingredients:\n\n${ingredientList}\n\nReturn a JSON array with id, par_level, reorder_point, and reasoning for each.`;

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt }
        ],
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("AI service error:", response.status, errorText);
      if (response.status === 429) {
        return new Response(JSON.stringify({ error: "Please try again later" }), {
          status: 429,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      return new Response(JSON.stringify({ error: "Service temporarily unavailable" }), {
        status: 503,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content;
    
    if (!content) {
      throw new Error("No content in AI response");
    }

    console.log("AI response received, parsing...");

    // Parse the JSON from the response (handle markdown code blocks if present)
    let suggestions;
    try {
      const jsonMatch = content.match(/```(?:json)?\s*([\s\S]*?)```/) || [null, content];
      const jsonStr = jsonMatch[1]?.trim() || content.trim();
      suggestions = JSON.parse(jsonStr);
    } catch (parseError) {
      console.error("Failed to parse AI response:", content);
      throw new Error("Failed to parse AI suggestions");
    }

    // Map suggestions back to ingredient IDs
    const suggestionsMap: Record<string, { par_level: number; reorder_point: number; reasoning: string }> = {};
    
    for (let i = 0; i < ingredients.length; i++) {
      const ing = ingredients[i];
      const suggestion = suggestions[i] || suggestions.find((s: any) => s.id === ing.id);
      
      if (suggestion) {
        suggestionsMap[ing.id] = {
          par_level: Math.round(suggestion.par_level),
          reorder_point: Math.round(suggestion.reorder_point),
          reasoning: suggestion.reasoning || "Based on industry standards",
        };
      }
    }

    console.log(`Generated suggestions for ${Object.keys(suggestionsMap).length} ingredients`);

    return new Response(JSON.stringify({ suggestions: suggestionsMap }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  } catch (error) {
    console.error("Error in suggest-par-levels:", error);
    return new Response(JSON.stringify({ error: "Failed to generate suggestions" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
