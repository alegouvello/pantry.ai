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
    const { recipeName, category, ingredients, yieldAmount, yieldUnit, prepTime } = await req.json();

    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    if (!LOVABLE_API_KEY) {
      throw new Error('LOVABLE_API_KEY is not configured');
    }

    const ingredientsList = ingredients
      .map((i: { name: string; quantity: number; unit: string }) => 
        `${i.quantity} ${i.unit} ${i.name}`
      )
      .join('\n');

    const prompt = `Generate professional cooking instructions for this recipe:

Recipe: ${recipeName}
Category: ${category}
Yield: ${yieldAmount} ${yieldUnit}
${prepTime ? `Prep Time: ${prepTime} minutes` : ''}

Ingredients:
${ingredientsList}

Provide clear, numbered step-by-step cooking instructions. Be concise but thorough. Include timing and temperatures where relevant. Format as a JSON object with a "steps" array containing objects with "step" (number) and "instruction" (string) properties.`;

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
            content: 'You are a professional chef assistant. Generate clear, practical cooking instructions. Always respond with valid JSON only, no markdown.' 
          },
          { role: 'user', content: prompt }
        ],
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(JSON.stringify({ error: 'Rate limit exceeded, please try again later.' }), {
          status: 429,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
      if (response.status === 402) {
        return new Response(JSON.stringify({ error: 'Payment required, please add credits.' }), {
          status: 402,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
      const errorText = await response.text();
      console.error('AI gateway error:', response.status, errorText);
      throw new Error('Failed to generate recipe steps');
    }

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content || '';
    
    // Parse the JSON response
    let steps;
    try {
      // Try to extract JSON from the response
      const jsonMatch = content.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        const parsed = JSON.parse(jsonMatch[0]);
        steps = parsed.steps || [];
      } else {
        // Fallback: parse numbered list
        const lines = content.split('\n').filter((l: string) => l.trim());
        steps = lines.map((line: string, index: number) => ({
          step: index + 1,
          instruction: line.replace(/^\d+\.\s*/, '').trim()
        })).filter((s: { instruction: string }) => s.instruction);
      }
    } catch (parseError) {
      console.error('Parse error:', parseError);
      // Fallback to raw text split
      steps = content.split('\n')
        .filter((l: string) => l.trim() && /^\d/.test(l.trim()))
        .map((line: string, index: number) => ({
          step: index + 1,
          instruction: line.replace(/^\d+\.\s*/, '').trim()
        }));
    }

    return new Response(JSON.stringify({ steps }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Error generating recipe steps:', error);
    const errorMessage = error instanceof Error ? error.message : 'Failed to generate steps';
    return new Response(JSON.stringify({ error: errorMessage }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
