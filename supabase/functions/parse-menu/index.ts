import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface ParsedIngredient {
  name: string;
  quantity: number;
  unit: string;
  optional: boolean;
  confidence: 'high' | 'medium' | 'low';
  isHouseMade?: boolean;
}

interface PrepRecipe {
  name: string;
  yieldAmount: number;
  yieldUnit: string;
  ingredients: ParsedIngredient[];
}

interface ParsedDish {
  name: string;
  section: string;
  description?: string;
  price?: number;
  ingredients: ParsedIngredient[];
  confidence: 'high' | 'medium' | 'low';
  tags: string[];
}

// Common house-made items that restaurants typically prepare from scratch
const HOUSE_MADE_ITEMS: Record<string, PrepRecipe> = {
  'mayonnaise': {
    name: 'House Mayonnaise',
    yieldAmount: 500,
    yieldUnit: 'g',
    ingredients: [
      { name: 'Egg yolk', quantity: 3, unit: 'piece', optional: false, confidence: 'high' },
      { name: 'Vegetable oil', quantity: 350, unit: 'ml', optional: false, confidence: 'high' },
      { name: 'Dijon mustard', quantity: 1, unit: 'tsp', optional: false, confidence: 'high' },
      { name: 'Lemon juice', quantity: 2, unit: 'tbsp', optional: false, confidence: 'high' },
      { name: 'Salt', quantity: 1, unit: 'tsp', optional: false, confidence: 'high' },
      { name: 'White pepper', quantity: 0.5, unit: 'tsp', optional: true, confidence: 'medium' },
    ],
  },
  'aioli': {
    name: 'House Aioli',
    yieldAmount: 400,
    yieldUnit: 'g',
    ingredients: [
      { name: 'Egg yolk', quantity: 2, unit: 'piece', optional: false, confidence: 'high' },
      { name: 'Garlic', quantity: 4, unit: 'clove', optional: false, confidence: 'high' },
      { name: 'Olive oil', quantity: 300, unit: 'ml', optional: false, confidence: 'high' },
      { name: 'Lemon juice', quantity: 1, unit: 'tbsp', optional: false, confidence: 'high' },
      { name: 'Salt', quantity: 1, unit: 'tsp', optional: false, confidence: 'high' },
    ],
  },
  'vinaigrette': {
    name: 'House Vinaigrette',
    yieldAmount: 300,
    yieldUnit: 'ml',
    ingredients: [
      { name: 'Olive oil', quantity: 200, unit: 'ml', optional: false, confidence: 'high' },
      { name: 'Red wine vinegar', quantity: 75, unit: 'ml', optional: false, confidence: 'high' },
      { name: 'Dijon mustard', quantity: 1, unit: 'tbsp', optional: false, confidence: 'high' },
      { name: 'Shallot', quantity: 1, unit: 'piece', optional: false, confidence: 'medium' },
      { name: 'Salt', quantity: 0.5, unit: 'tsp', optional: false, confidence: 'high' },
      { name: 'Black pepper', quantity: 0.25, unit: 'tsp', optional: false, confidence: 'high' },
    ],
  },
  'hollandaise': {
    name: 'Hollandaise Sauce',
    yieldAmount: 400,
    yieldUnit: 'ml',
    ingredients: [
      { name: 'Egg yolk', quantity: 4, unit: 'piece', optional: false, confidence: 'high' },
      { name: 'Clarified butter', quantity: 250, unit: 'g', optional: false, confidence: 'high' },
      { name: 'Lemon juice', quantity: 2, unit: 'tbsp', optional: false, confidence: 'high' },
      { name: 'Cayenne pepper', quantity: 0.25, unit: 'tsp', optional: true, confidence: 'medium' },
      { name: 'Salt', quantity: 0.5, unit: 'tsp', optional: false, confidence: 'high' },
    ],
  },
  'béarnaise': {
    name: 'Béarnaise Sauce',
    yieldAmount: 400,
    yieldUnit: 'ml',
    ingredients: [
      { name: 'Egg yolk', quantity: 4, unit: 'piece', optional: false, confidence: 'high' },
      { name: 'Clarified butter', quantity: 250, unit: 'g', optional: false, confidence: 'high' },
      { name: 'White wine vinegar', quantity: 60, unit: 'ml', optional: false, confidence: 'high' },
      { name: 'Shallot', quantity: 2, unit: 'piece', optional: false, confidence: 'high' },
      { name: 'Tarragon', quantity: 2, unit: 'tbsp', optional: false, confidence: 'high' },
      { name: 'Salt', quantity: 0.5, unit: 'tsp', optional: false, confidence: 'high' },
    ],
  },
  'pesto': {
    name: 'House Pesto',
    yieldAmount: 300,
    yieldUnit: 'g',
    ingredients: [
      { name: 'Basil leaves', quantity: 100, unit: 'g', optional: false, confidence: 'high' },
      { name: 'Pine nuts', quantity: 50, unit: 'g', optional: false, confidence: 'high' },
      { name: 'Parmesan cheese', quantity: 50, unit: 'g', optional: false, confidence: 'high' },
      { name: 'Garlic', quantity: 2, unit: 'clove', optional: false, confidence: 'high' },
      { name: 'Olive oil', quantity: 150, unit: 'ml', optional: false, confidence: 'high' },
      { name: 'Salt', quantity: 0.5, unit: 'tsp', optional: false, confidence: 'high' },
    ],
  },
  'demi-glace': {
    name: 'Demi-Glace',
    yieldAmount: 1000,
    yieldUnit: 'ml',
    ingredients: [
      { name: 'Veal stock', quantity: 2000, unit: 'ml', optional: false, confidence: 'high' },
      { name: 'Brown stock', quantity: 2000, unit: 'ml', optional: false, confidence: 'high' },
      { name: 'Tomato paste', quantity: 2, unit: 'tbsp', optional: false, confidence: 'medium' },
      { name: 'Red wine', quantity: 250, unit: 'ml', optional: true, confidence: 'medium' },
    ],
  },
  'beurre blanc': {
    name: 'Beurre Blanc',
    yieldAmount: 300,
    yieldUnit: 'ml',
    ingredients: [
      { name: 'Butter', quantity: 250, unit: 'g', optional: false, confidence: 'high' },
      { name: 'White wine', quantity: 100, unit: 'ml', optional: false, confidence: 'high' },
      { name: 'White wine vinegar', quantity: 50, unit: 'ml', optional: false, confidence: 'high' },
      { name: 'Shallot', quantity: 2, unit: 'piece', optional: false, confidence: 'high' },
      { name: 'Heavy cream', quantity: 2, unit: 'tbsp', optional: true, confidence: 'medium' },
      { name: 'Salt', quantity: 0.5, unit: 'tsp', optional: false, confidence: 'high' },
    ],
  },
  'stock': {
    name: 'House Stock',
    yieldAmount: 4000,
    yieldUnit: 'ml',
    ingredients: [
      { name: 'Chicken bones', quantity: 2, unit: 'kg', optional: false, confidence: 'high' },
      { name: 'Onion', quantity: 2, unit: 'piece', optional: false, confidence: 'high' },
      { name: 'Carrot', quantity: 2, unit: 'piece', optional: false, confidence: 'high' },
      { name: 'Celery', quantity: 2, unit: 'stalk', optional: false, confidence: 'high' },
      { name: 'Bay leaf', quantity: 2, unit: 'piece', optional: false, confidence: 'high' },
      { name: 'Black peppercorn', quantity: 1, unit: 'tsp', optional: false, confidence: 'medium' },
    ],
  },
  'croutons': {
    name: 'House Croutons',
    yieldAmount: 200,
    yieldUnit: 'g',
    ingredients: [
      { name: 'Bread', quantity: 200, unit: 'g', optional: false, confidence: 'high' },
      { name: 'Olive oil', quantity: 3, unit: 'tbsp', optional: false, confidence: 'high' },
      { name: 'Garlic', quantity: 2, unit: 'clove', optional: true, confidence: 'medium' },
      { name: 'Salt', quantity: 0.5, unit: 'tsp', optional: false, confidence: 'high' },
    ],
  },
  'caesar dressing': {
    name: 'Caesar Dressing',
    yieldAmount: 400,
    yieldUnit: 'ml',
    ingredients: [
      { name: 'Egg yolk', quantity: 2, unit: 'piece', optional: false, confidence: 'high' },
      { name: 'Anchovy', quantity: 4, unit: 'piece', optional: false, confidence: 'high' },
      { name: 'Garlic', quantity: 2, unit: 'clove', optional: false, confidence: 'high' },
      { name: 'Dijon mustard', quantity: 1, unit: 'tsp', optional: false, confidence: 'high' },
      { name: 'Lemon juice', quantity: 2, unit: 'tbsp', optional: false, confidence: 'high' },
      { name: 'Olive oil', quantity: 250, unit: 'ml', optional: false, confidence: 'high' },
      { name: 'Parmesan cheese', quantity: 50, unit: 'g', optional: false, confidence: 'high' },
      { name: 'Worcestershire sauce', quantity: 1, unit: 'tsp', optional: true, confidence: 'medium' },
    ],
  },
};

// Keywords that suggest an ingredient is house-made
const HOUSE_MADE_KEYWORDS = [
  'mayonnaise', 'mayo', 'aioli', 'vinaigrette', 'dressing', 'hollandaise',
  'béarnaise', 'bearnaise', 'pesto', 'demi-glace', 'demi glace', 'beurre blanc',
  'stock', 'broth', 'jus', 'croutons', 'caesar dressing', 'remoulade', 'rouille',
];

function detectHouseMadeIngredients(ingredients: ParsedIngredient[]): { 
  updatedIngredients: ParsedIngredient[]; 
  detectedPrepRecipes: PrepRecipe[];
} {
  const detectedPrepRecipes: PrepRecipe[] = [];
  const seenPrepRecipes = new Set<string>();
  
  const updatedIngredients = ingredients.map(ing => {
    const lowerName = ing.name.toLowerCase();
    
    // Check if this ingredient matches a house-made item
    for (const [key, prepRecipe] of Object.entries(HOUSE_MADE_ITEMS)) {
      if (lowerName.includes(key) || lowerName === key) {
        // Mark as house-made
        if (!seenPrepRecipes.has(prepRecipe.name)) {
          detectedPrepRecipes.push(prepRecipe);
          seenPrepRecipes.add(prepRecipe.name);
        }
        return { ...ing, isHouseMade: true };
      }
    }
    
    // Check for generic house-made keywords
    const isHouseMade = HOUSE_MADE_KEYWORDS.some(keyword => lowerName.includes(keyword));
    return isHouseMade ? { ...ing, isHouseMade: true } : ing;
  });
  
  return { updatedIngredients, detectedPrepRecipes };
}

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
    
    // Extract JWT token and verify user
    const token = authHeader.replace('Bearer ', '');
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? ''
    );
    
    const { data: { user }, error: authError } = await supabaseClient.auth.getUser(token);
    if (authError || !user) {
      console.error('Auth error:', authError);
      return new Response(
        JSON.stringify({ success: false, error: 'Unauthorized' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
    
    console.log('Authenticated user:', user.id);
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
    console.log('Menu type:', menuType);

    const detailInstructions = {
      basic: 'Include only the main 3-5 ingredients per dish.',
      standard: 'Include all ingredients with quantities, including garnishes and seasonings.',
      advanced: 'Include all ingredients with precise quantities, prep components, and potential modifiers.',
    };

    const systemPrompt = `You are a professional chef and menu analyst. You parse restaurant menus and extract dishes with their likely ingredients.

For each dish, provide:
1. Name (exactly as it appears on the menu)
2. Section (appetizers, mains, desserts, drinks, salads, sides, etc.)
3. Description if provided
4. Price if visible (as a number, e.g. 12.99)
5. Estimated ingredients with quantities based on typical restaurant preparations
6. Confidence level (high/medium/low) based on how certain you are
7. Tags (vegetarian, vegan, gluten-free, seafood, popular, spicy, etc.)

${detailInstructions[detailLevel as keyof typeof detailInstructions] || detailInstructions.standard}

For ingredients, estimate typical restaurant portion quantities. Use common units: g, kg, ml, L, oz, lb, piece, tbsp, tsp, cup.

IMPORTANT: Respond ONLY with a valid JSON array of dishes. No markdown formatting, no code blocks, no explanation text.`;

    const userPrompt = `Parse this menu and extract ALL dishes with their ingredients.

Return a JSON array with this exact structure:
[
  {
    "name": "Dish Name",
    "section": "Section Name",
    "description": "Description if any",
    "price": 12.99,
    "confidence": "high",
    "tags": ["tag1", "tag2"],
    "ingredients": [
      {"name": "Ingredient Name", "quantity": 100, "unit": "g", "optional": false, "confidence": "high"}
    ]
  }
]`;

    // Check if the content is an image (base64)
    const isImage = menuContent.startsWith('data:image/') || menuContent.includes('[IMAGE MENU]');
    
    let messages: any[];
    
    if (isImage) {
      console.log('Processing image-based menu with vision model...');
      
      // Extract the base64 data URL
      let imageUrl = menuContent;
      if (menuContent.includes('[IMAGE MENU]')) {
        // Extract the data URL from the wrapped content
        const match = menuContent.match(/(data:image\/[^;]+;base64,[^\s]+)/);
        if (match) {
          imageUrl = match[1];
        }
      }
      
      // Use multimodal message format for vision
      messages = [
        { role: 'system', content: systemPrompt },
        { 
          role: 'user', 
          content: [
            {
              type: 'text',
              text: `${userPrompt}\n\nPlease analyze the menu image and extract all visible dishes with their ingredients. Read all text carefully including dish names, descriptions, prices, and any ingredient lists.`
            },
            {
              type: 'image_url',
              image_url: {
                url: imageUrl
              }
            }
          ]
        },
      ];
    } else {
      console.log('Processing text-based menu...');
      console.log('Menu content preview:', menuContent.substring(0, 500));
      
      messages = [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: `${userPrompt}\n\nMenu content:\n${menuContent}` },
      ];
    }

    console.log('Calling Lovable AI for menu parsing...');

    const response = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'google/gemini-2.5-flash', // Supports vision
        messages,
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
    console.log('Response preview:', content.substring(0, 300));

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
      
      // Try to extract JSON from the response
      const jsonMatch = cleanContent.match(/\[[\s\S]*\]/);
      if (jsonMatch) {
        try {
          dishes = JSON.parse(jsonMatch[0]);
        } catch {
          throw new Error('Failed to parse menu structure from AI response');
        }
      } else {
        throw new Error('Failed to parse menu structure');
      }
    }

    // Ensure dishes is an array
    if (!Array.isArray(dishes)) {
      dishes = [dishes];
    }

    // Collect all detected prep recipes across all dishes
    const allPrepRecipes: PrepRecipe[] = [];
    const seenPrepRecipes = new Set<string>();

    // Validate and enhance the dishes
    const validatedDishes = dishes.map((dish, index) => {
      const rawIngredients = (dish.ingredients || []).map((ing: any, ingIndex: number) => ({
        id: `ing-${Date.now()}-${index}-${ingIndex}`,
        name: ing.name || 'Unknown ingredient',
        quantity: typeof ing.quantity === 'number' ? ing.quantity : 0,
        unit: ing.unit || 'g',
        optional: Boolean(ing.optional),
        confidence: (['high', 'medium', 'low'].includes(ing.confidence) ? ing.confidence : 'medium') as 'high' | 'medium' | 'low',
      }));
      
      // Detect house-made items
      const { updatedIngredients, detectedPrepRecipes } = detectHouseMadeIngredients(rawIngredients);
      
      // Add unique prep recipes to the collection
      for (const prep of detectedPrepRecipes) {
        if (!seenPrepRecipes.has(prep.name)) {
          allPrepRecipes.push(prep);
          seenPrepRecipes.add(prep.name);
        }
      }
      
      return {
        id: `dish-${Date.now()}-${index}`,
        name: dish.name || 'Unnamed Dish',
        section: dish.section || 'Other',
        description: dish.description || '',
        price: typeof dish.price === 'number' ? dish.price : null,
        confidence: (['high', 'medium', 'low'].includes(dish.confidence) ? dish.confidence : 'medium') as 'high' | 'medium' | 'low',
        tags: Array.isArray(dish.tags) ? dish.tags : [],
        ingredients: updatedIngredients,
      };
    });
    
    // Format prep recipes with IDs
    const formattedPrepRecipes = allPrepRecipes.map((prep, index) => ({
      id: `prep-${Date.now()}-${index}`,
      name: prep.name,
      section: 'Prep',
      description: `House-made ${prep.name.toLowerCase()}`,
      price: null,
      confidence: 'high' as const,
      tags: ['prep', 'house-made'],
      yieldAmount: prep.yieldAmount,
      yieldUnit: prep.yieldUnit,
      isPrep: true,
      ingredients: prep.ingredients.map((ing, ingIndex) => ({
        id: `prep-ing-${Date.now()}-${index}-${ingIndex}`,
        ...ing,
      })),
    }));

    console.log(`Successfully parsed ${validatedDishes.length} dishes and ${formattedPrepRecipes.length} prep recipes`);

    return new Response(
      JSON.stringify({ 
        success: true, 
        dishes: validatedDishes,
        prepRecipes: formattedPrepRecipes,
        count: validatedDishes.length,
        prepCount: formattedPrepRecipes.length,
        isImageBased: isImage,
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
