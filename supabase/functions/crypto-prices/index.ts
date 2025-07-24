import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface CryptoPriceResponse {
  [key: string]: {
    usd: number;
    usd_24h_change: number;
  };
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { symbols } = await req.json();
    
    if (!symbols || !Array.isArray(symbols) || symbols.length === 0) {
      return new Response(
        JSON.stringify({ error: 'symbols array is required' }),
        { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    // Mapear símbolos a IDs de CoinGecko
    const symbolToId: Record<string, string> = {
      'BTC': 'bitcoin',
      'ETH': 'ethereum', 
      'SHIB': 'shiba-inu'
    };

    const coinIds = symbols.map(symbol => symbolToId[symbol.toUpperCase()]).filter(Boolean);
    
    if (coinIds.length === 0) {
      return new Response(
        JSON.stringify({ error: 'No valid symbols provided' }),
        { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    console.log(`Fetching prices for: ${coinIds.join(',')}`);

    // Llamar a CoinGecko API
    const response = await fetch(
      `https://api.coingecko.com/api/v3/simple/price?ids=${coinIds.join(',')}&vs_currencies=usd&include_24hr_change=true`,
      {
        headers: {
          'Accept': 'application/json',
        }
      }
    );

    if (!response.ok) {
      console.error(`CoinGecko API error: ${response.status} ${response.statusText}`);
      return new Response(
        JSON.stringify({ error: 'Failed to fetch crypto prices' }),
        { 
          status: 500, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    const data: CryptoPriceResponse = await response.json();
    console.log('CoinGecko response:', data);

    // Transformar respuesta para usar símbolos como claves
    const result: Record<string, { price: number; change24h: number }> = {};
    
    Object.entries(symbolToId).forEach(([symbol, coinId]) => {
      if (data[coinId]) {
        result[symbol] = {
          price: data[coinId].usd,
          change24h: data[coinId].usd_24h_change || 0
        };
      }
    });

    return new Response(
      JSON.stringify(result),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );

  } catch (error) {
    console.error('Error in crypto-prices function:', error);
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }
});