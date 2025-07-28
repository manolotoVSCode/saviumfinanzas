import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const perplexityApiKey = Deno.env.get('PERPLEXITY_API_KEY');

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Fallback logic for when AI fails
function createFallbackGroups(comments: string[]) {
  const groups = comments.map(comment => {
    // Simple pattern matching for common services
    let serviceName = comment;
    let description = "Servicio de suscripción";
    
    if (comment.toLowerCase().includes('netflix')) {
      serviceName = "Netflix";
      description = "Plataforma de streaming de video";
    } else if (comment.toLowerCase().includes('spotify')) {
      serviceName = "Spotify";
      description = "Plataforma de streaming de música";
    } else if (comment.toLowerCase().includes('openai') || comment.toLowerCase().includes('chatgpt')) {
      serviceName = "ChatGPT";
      description = "Asistente de inteligencia artificial";
    } else if (comment.toLowerCase().includes('apple')) {
      serviceName = "Apple";
      description = "Servicios de Apple";
    } else if (comment.toLowerCase().includes('amazon')) {
      serviceName = "Amazon";
      description = "Servicios de Amazon";
    } else if (comment.toLowerCase().includes('google')) {
      serviceName = "Google";
      description = "Servicios de Google";
    } else if (comment.toLowerCase().includes('rotoplas')) {
      serviceName = "Rotoplas";
      description = "Servicio de agua";
    } else {
      // Keep original name but clean it up
      serviceName = comment.split(' ')[0] || comment;
    }
    
    return {
      serviceName,
      description,
      originalComments: [comment]
    };
  });
  
  return { groups };
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log('Starting analyze-subscriptions function');
    
    const { comments } = await req.json();
    console.log('Received comments:', comments);

    if (!comments || comments.length === 0) {
      console.log('No comments provided');
      return new Response(JSON.stringify({ groups: [] }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Try AI analysis first, but have fallback ready
    if (!perplexityApiKey) {
      console.log('PERPLEXITY_API_KEY not configured, using fallback');
      const fallbackResult = createFallbackGroups(comments);
      return new Response(JSON.stringify(fallbackResult), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    try {
      console.log('Making request to Perplexity API');
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

      console.log('Perplexity API response status:', response.status);
      
      if (!response.ok) {
        const errorText = await response.text();
        console.error('Perplexity API error:', errorText);
        throw new Error(`Perplexity API error: ${response.status}`);
      }

      const data = await response.json();
      console.log('Perplexity API response received');
      
      const aiResponse = data.choices[0].message.content;
      console.log('AI response content:', aiResponse);
      
      // Try to parse the JSON response
      let analysisResult;
      try {
        // Clean the response to ensure it's valid JSON
        const cleanedResponse = aiResponse.replace(/```json\n?/g, '').replace(/```/g, '').trim();
        analysisResult = JSON.parse(cleanedResponse);
      } catch (parseError) {
        console.error('JSON parse error, using fallback:', parseError);
        analysisResult = createFallbackGroups(comments);
      }

      console.log('Final analysis result:', analysisResult);

      return new Response(JSON.stringify(analysisResult), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    } catch (aiError) {
      console.error('AI analysis failed, using fallback:', aiError);
      const fallbackResult = createFallbackGroups(comments);
      return new Response(JSON.stringify(fallbackResult), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }
  } catch (error) {
    console.error('Error in analyze-subscriptions function:', error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});