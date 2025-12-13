import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface ParsedDish {
  name: string;
  section: string;
  description?: string;
  price?: number;
  ingredients: {
    name: string;
    quantity: number;
    unit: string;
    optional: boolean;
    confidence: 'high' | 'medium' | 'low';
  }[];
  confidence: 'high' | 'medium' | 'low';
  tags: string[];
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    if (!LOVABLE_API_KEY) {
      throw new Error('LOVABLE_API_KEY is not configured');
    }

    const { menuContent, menuType, detailLevel = 'standard' } = await req.json();

    if (!menuContent) {
      return new Response(
        JSON.stringify({ success: false, error: 'Menu content is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('Parsing menu with detail level:', detailLevel);
    console.log('Menu content length:', menuContent.length);

    const detailInstructions = {
      basic: 'Include only the main 3-5 ingredients per dish.',
      standard: 'Include all ingredients with quantities, including garnishes and seasonings.',
      advanced: 'Include all ingredients with precise quantities, prep components, and potential modifiers.',
    };

    const systemPrompt = `You are a professional chef and menu analyst. You parse restaurant menus and extract dishes with their likely ingredients.

For each dish, provide:
1. Name (exactly as it appears on the menu)
2. Section (appetizers, mains, desserts, drinks, etc.)
3. Description if provided
4. Price if visible
5. Estimated ingredients with quantities based on typical restaurant preparations
6. Confidence level (high/medium/low) based on how certain you are
7. Tags (vegetarian, vegan, gluten-free, seafood, popular, etc.)

${detailInstructions[detailLevel as keyof typeof detailInstructions] || detailInstructions.standard}

For ingredients, estimate typical restaurant portion quantities. Use common units: g, kg, ml, L, oz, lb, piece, tbsp, tsp.

Respond ONLY with a valid JSON array of dishes. No markdown, no explanation.`;

    const userPrompt = `Parse this menu and extract all dishes with their ingredients:

${menuContent}

Return a JSON array of dishes with this structure:
[
  {
    "name": "Dish Name",
    "section": "Section Name",
    "description": "Description if any",
    "price": 12.99,
    "confidence": "high",
    "tags": ["vegetarian"],
    "ingredients": [
      {"name": "Ingredient", "quantity": 100, "unit": "g", "optional": false, "confidence": "high"}
    ]
  }
]`;

    console.log('Calling Lovable AI for menu parsing...');

    const response = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'google/gemini-2.5-flash',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt },
        ],
        temperature: 0.3,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Lovable AI error:', response.status, errorText);
      
      if (response.status === 429) {
        return new Response(
          JSON.stringify({ success: false, error: 'Rate limit exceeded. Please try again later.' }),
          { status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      if (response.status === 402) {
        return new Response(
          JSON.stringify({ success: false, error: 'AI credits required. Please add credits to continue.' }),
          { status: 402, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      
      throw new Error(`AI request failed: ${response.status}`);
    }

    const aiData = await response.json();
    const content = aiData.choices?.[0]?.message?.content;

    if (!content) {
      throw new Error('No response from AI');
    }

    console.log('AI response received, parsing JSON...');

    // Clean up the response (remove markdown code blocks if present)
    let cleanContent = content.trim();
    if (cleanContent.startsWith('```json')) {
      cleanContent = cleanContent.slice(7);
    }
    if (cleanContent.startsWith('```')) {
      cleanContent = cleanContent.slice(3);
    }
    if (cleanContent.endsWith('```')) {
      cleanContent = cleanContent.slice(0, -3);
    }
    cleanContent = cleanContent.trim();

    let dishes: ParsedDish[];
    try {
      dishes = JSON.parse(cleanContent);
    } catch (parseError) {
      console.error('Failed to parse AI response:', cleanContent.substring(0, 500));
      throw new Error('Failed to parse menu structure');
    }

    // Validate and enhance the dishes
    const validatedDishes = dishes.map((dish, index) => ({
      id: `dish-${Date.now()}-${index}`,
      name: dish.name || 'Unnamed Dish',
      section: dish.section || 'Other',
      description: dish.description || '',
      price: dish.price || null,
      confidence: dish.confidence || 'medium',
      tags: Array.isArray(dish.tags) ? dish.tags : [],
      ingredients: (dish.ingredients || []).map((ing, ingIndex) => ({
        id: `ing-${Date.now()}-${index}-${ingIndex}`,
        name: ing.name || 'Unknown ingredient',
        quantity: ing.quantity || 0,
        unit: ing.unit || 'g',
        optional: ing.optional || false,
        confidence: ing.confidence || 'medium',
      })),
    }));

    console.log(`Successfully parsed ${validatedDishes.length} dishes`);

    return new Response(
      JSON.stringify({ 
        success: true, 
        dishes: validatedDishes,
        count: validatedDishes.length,
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error parsing menu:', error);
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: error instanceof Error ? error.message : 'Failed to parse menu' 
      }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
