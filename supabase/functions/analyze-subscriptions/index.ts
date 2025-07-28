import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const perplexityApiKey = Deno.env.get('PERPLEXITY_API_KEY');

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { comments } = await req.json();

    if (!perplexityApiKey) {
      throw new Error('PERPLEXITY_API_KEY not configured');
    }

    const prompt = `Analiza estos comentarios de transacciones y agrúpalos por servicio/empresa. 
    
Comentarios: ${comments.join(', ')}

Instrucciones:
1. Identifica qué empresa/servicio representa cada comentario
2. Agrupa comentarios que sean del mismo servicio (ej: "Netflix Mexico", "NETFLIX.COM" → "Netflix")
3. Para servicios poco claros, mantén el nombre original
4. Devuelve SOLO un JSON con este formato:
{
  "groups": [
    {
      "serviceName": "Netflix",
      "description": "Plataforma de streaming de video",
      "originalComments": ["Netflix Mexico", "NETFLIX.COM"]
    },
    {
      "serviceName": "Spotify",
      "description": "Plataforma de streaming de música",
      "originalComments": ["Spotify Premium"]
    }
  ]
}

NO agregues texto adicional, solo el JSON.`;

    const response = await fetch('https://api.perplexity.ai/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${perplexityApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'llama-3.1-sonar-small-128k-online',
        messages: [
          {
            role: 'system',
            content: 'Eres un experto en identificar empresas y servicios a partir de descripciones de transacciones bancarias. Responde solo con JSON válido.'
          },
          {
            role: 'user',
            content: prompt
          }
        ],
        temperature: 0.1,
        max_tokens: 2000,
      }),
    });

    const data = await response.json();
    const aiResponse = data.choices[0].message.content;
    
    // Parse the JSON response
    const analysisResult = JSON.parse(aiResponse);

    return new Response(JSON.stringify(analysisResult), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('Error in analyze-subscriptions function:', error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});