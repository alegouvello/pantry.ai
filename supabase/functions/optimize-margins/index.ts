import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface RecipeData {
  name: string;
  category: string;
  totalCost: number;
  menuPrice: number | null;
  foodCostPct: number | null;
  yieldAmount: number;
  yieldUnit: string;
  ingredients: {
    name: string;
    quantity: number;
    unit: string;
    unitCost: number;
    lineCost: number;
    percentage: number;
  }[];
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { recipe } = await req.json() as { recipe: RecipeData };
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    
    if (!LOVABLE_API_KEY) {
      throw new Error("LOVABLE_API_KEY is not configured");
    }

    console.log("Analyzing recipe for margin optimization:", recipe.name);

    const systemPrompt = `You are an expert restaurant consultant specializing in food cost optimization and menu engineering. Analyze recipe costs and provide actionable suggestions to improve profit margins without sacrificing quality.

Focus on:
1. High-cost ingredients that could be substituted or reduced
2. Portion size optimizations
3. Menu pricing adjustments based on market standards
4. Preparation efficiency improvements
5. Ingredient sourcing alternatives

Be specific, practical, and considerate of maintaining dish quality and customer satisfaction.`;

    const userPrompt = `Analyze this recipe and provide profit margin optimization suggestions:

Recipe: ${recipe.name}
Category: ${recipe.category}
Current Menu Price: ${recipe.menuPrice ? `$${recipe.menuPrice.toFixed(2)}` : 'Not set'}
Total Ingredient Cost: $${recipe.totalCost.toFixed(2)}
Food Cost Percentage: ${recipe.foodCostPct ? `${recipe.foodCostPct.toFixed(1)}%` : 'N/A'}
Yield: ${recipe.yieldAmount} ${recipe.yieldUnit}

Ingredient Breakdown (sorted by cost):
${recipe.ingredients.map(i => `- ${i.name}: ${i.quantity} ${i.unit} @ $${i.unitCost.toFixed(2)} = $${i.lineCost.toFixed(2)} (${i.percentage.toFixed(0)}% of cost)`).join('\n')}

Provide 3-5 specific, actionable suggestions to improve the profit margin on this dish.`;

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
          { role: "user", content: userPrompt },
        ],
        tools: [
          {
            type: "function",
            function: {
              name: "provide_optimization_suggestions",
              description: "Return profit margin optimization suggestions for a recipe",
              parameters: {
                type: "object",
                properties: {
                  summary: {
                    type: "string",
                    description: "Brief 1-2 sentence summary of the recipe's margin situation"
                  },
                  targetFoodCostPct: {
                    type: "number",
                    description: "Recommended target food cost percentage for this category"
                  },
                  potentialSavings: {
                    type: "number",
                    description: "Estimated potential cost savings in dollars per portion"
                  },
                  suggestions: {
                    type: "array",
                    items: {
                      type: "object",
                      properties: {
                        type: {
                          type: "string",
                          enum: ["substitution", "portion", "pricing", "sourcing", "technique"]
                        },
                        title: { type: "string" },
                        description: { type: "string" },
                        impact: {
                          type: "string",
                          enum: ["low", "medium", "high"]
                        },
                        estimatedSavings: {
                          type: "string",
                          description: "Estimated savings like '$0.50/portion' or '5% reduction'"
                        }
                      },
                      required: ["type", "title", "description", "impact"]
                    }
                  }
                },
                required: ["summary", "suggestions"]
              }
            }
          }
        ],
        tool_choice: { type: "function", function: { name: "provide_optimization_suggestions" } }
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(JSON.stringify({ error: "Rate limit exceeded. Please try again later." }), {
          status: 429,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (response.status === 402) {
        return new Response(JSON.stringify({ error: "AI credits exhausted. Please add funds." }), {
          status: 402,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const errorText = await response.text();
      console.error("AI gateway error:", response.status, errorText);
      throw new Error(`AI gateway error: ${response.status}`);
    }

    const data = await response.json();
    console.log("AI response received");

    const toolCall = data.choices?.[0]?.message?.tool_calls?.[0];
    if (!toolCall || toolCall.function.name !== "provide_optimization_suggestions") {
      throw new Error("Unexpected AI response format");
    }

    const suggestions = JSON.parse(toolCall.function.arguments);
    console.log("Parsed suggestions:", suggestions);

    return new Response(JSON.stringify(suggestions), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  } catch (error) {
    console.error("Error in optimize-margins:", error);
    return new Response(JSON.stringify({ 
      error: error instanceof Error ? error.message : "Unknown error" 
    }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
