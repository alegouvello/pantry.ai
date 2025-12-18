import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";
import { z } from "https://deno.land/x/zod@v3.22.4/mod.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Input validation schema
const IngredientSchema = z.object({
  name: z.string().min(1).max(200),
  quantity: z.number().min(0).max(100000),
  unit: z.string().max(50),
});

const InputSchema = z.object({
  recipeName: z.string().min(1).max(200).trim(),
  category: z.string().max(100).trim(),
  ingredients: z.array(IngredientSchema).max(100),
  yieldAmount: z.number().min(0).max(10000),
  yieldUnit: z.string().max(50),
  prepTime: z.number().min(0).max(10000).optional(),
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
    
    const { recipeName, category, ingredients, yieldAmount, yieldUnit, prepTime } = parseResult.data;

    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    if (!LOVABLE_API_KEY) {
      console.error('LOVABLE_API_KEY not configured');
      return new Response(
        JSON.stringify({ error: 'Service temporarily unavailable' }),
        { status: 503, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const ingredientsList = ingredients
      .map((i) => `${i.quantity} ${i.unit} ${i.name}`)
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
      const errorText = await response.text();
      console.error('AI service error:', response.status, errorText);
      if (response.status === 429) {
        return new Response(JSON.stringify({ error: 'Please try again later' }), {
          status: 429,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
      return new Response(JSON.stringify({ error: 'Service temporarily unavailable' }), {
        status: 503,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
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
    return new Response(JSON.stringify({ error: 'Failed to generate steps' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
