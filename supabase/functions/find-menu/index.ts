import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

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
    const { restaurantName, website, city } = await req.json();
    
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
        JSON.stringify({ success: false, error: 'Web search not configured' }),
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

    let menuContent = '';
    const sources: string[] = [];

    // Strategy 1: If we have a website, try to find and scrape the menu page
    if (website) {
      console.log('Trying to find menu on restaurant website:', website);
      
      // First, map the website to find menu-related URLs
      const mapResponse = await fetch('https://api.firecrawl.dev/v1/map', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${FIRECRAWL_API_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          url: website,
          search: 'menu',
          limit: 10,
          includeSubdomains: true,
        }),
      });

      if (mapResponse.ok) {
        const mapData = await mapResponse.json();
        console.log('Found URLs on website:', mapData.links?.length || 0);
        
        // Find menu-related URLs
        const menuUrls = (mapData.links || []).filter((url: string) => 
          /menu|food|dishes|carte|plats|speisekarte/i.test(url)
        ).slice(0, 3);

        // Scrape the menu pages
        for (const menuUrl of menuUrls) {
          console.log('Scraping menu page:', menuUrl);
          const scrapeResponse = await fetch('https://api.firecrawl.dev/v1/scrape', {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${FIRECRAWL_API_KEY}`,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              url: menuUrl,
              formats: ['markdown'],
              onlyMainContent: true,
            }),
          });

          if (scrapeResponse.ok) {
            const scrapeData = await scrapeResponse.json();
            if (scrapeData.data?.markdown) {
              menuContent += `\n\n--- Menu from ${menuUrl} ---\n\n${scrapeData.data.markdown}`;
              sources.push(menuUrl);
            }
          }
        }

        // If no menu URLs found, try scraping the main page
        if (!menuContent && mapData.links?.length > 0) {
          console.log('No specific menu page found, scraping main website');
          const mainScrapeResponse = await fetch('https://api.firecrawl.dev/v1/scrape', {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${FIRECRAWL_API_KEY}`,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              url: website,
              formats: ['markdown'],
              onlyMainContent: true,
            }),
          });

          if (mainScrapeResponse.ok) {
            const mainData = await mainScrapeResponse.json();
            if (mainData.data?.markdown) {
              menuContent = mainData.data.markdown;
              sources.push(website);
            }
          }
        }
      }
    }

    // Strategy 2: If no website or no menu found, search the web
    if (!menuContent) {
      const location = city || '';
      const searchQuery = location 
        ? `"${restaurantName}" menu ${location}`
        : `"${restaurantName}" restaurant menu`;
      
      console.log('Searching web for menu:', searchQuery);

      const searchResponse = await fetch('https://api.firecrawl.dev/v1/search', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${FIRECRAWL_API_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          query: searchQuery,
          limit: 5,
          scrapeOptions: {
            formats: ['markdown'],
          },
        }),
      });

      if (searchResponse.ok) {
        const searchData = await searchResponse.json();
        console.log('Search results:', searchData.data?.length || 0);
        
        if (searchData.data) {
          for (const result of searchData.data) {
            if (result.markdown) {
              menuContent += `\n\n--- From ${result.url} ---\n\n${result.markdown}`;
              sources.push(result.url);
            }
          }
        }
      }
    }

    if (!menuContent) {
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: 'Could not find menu online. Try uploading a menu or entering the URL directly.' 
        }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('Total menu content length:', menuContent.length);
    console.log('Sources:', sources);

    // Truncate content if too long (keep first 50k chars)
    const truncatedContent = menuContent.length > 50000 
      ? menuContent.substring(0, 50000) + '\n\n[Content truncated...]'
      : menuContent;

    return new Response(
      JSON.stringify({ 
        success: true, 
        content: truncatedContent,
        sources,
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error finding menu:', error);
    return new Response(
      JSON.stringify({ success: false, error: error instanceof Error ? error.message : 'Unknown error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});

