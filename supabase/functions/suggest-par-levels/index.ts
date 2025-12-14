import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface IngredientInput {
  id: string;
  name: string;
  category: string;
  unit: string;
  currentStock: number;
  storageLocation?: string;
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { ingredients, conceptType } = await req.json();
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    
    if (!LOVABLE_API_KEY) {
      throw new Error("LOVABLE_API_KEY is not configured");
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

    const ingredientList = (ingredients as IngredientInput[]).map(ing => 
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
      if (response.status === 429) {
        return new Response(JSON.stringify({ error: "Rate limit exceeded. Please try again in a moment." }), {
          status: 429,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (response.status === 402) {
        return new Response(JSON.stringify({ error: "AI credits depleted. Please add credits to continue." }), {
          status: 402,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const errorText = await response.text();
      console.error("AI gateway error:", response.status, errorText);
      throw new Error(`AI gateway error: ${response.status}`);
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
      const ing = ingredients[i] as IngredientInput;
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
    return new Response(JSON.stringify({ 
      error: error instanceof Error ? error.message : "Failed to generate suggestions" 
    }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});