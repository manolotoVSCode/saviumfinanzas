import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Fallback logic for when AI fails - with improved grouping
function createFallbackGroups(comments: string[]) {
  const serviceMap = new Map<string, { serviceName: string; description: string; originalComments: string[] }>();
  
  comments.forEach(comment => {
    let serviceName = comment;
    let description = "Servicio de suscripción";
    let normalizedKey = comment.toLowerCase();
    
// Enhanced service name extraction and grouping - EXPANDED COVERAGE
    if (normalizedKey.includes('spotify')) {
      serviceName = "Spotify";
      description = "Plataforma de streaming de música";
      normalizedKey = 'spotify';
    } else if (normalizedKey.includes('netflix')) {
      serviceName = "Netflix";
      description = "Plataforma de streaming de video";
      normalizedKey = 'netflix';
    } else if (normalizedKey.includes('openai') || normalizedKey.includes('chatgpt')) {
      serviceName = "ChatGPT";
      description = "Asistente de inteligencia artificial";
      normalizedKey = 'chatgpt';
    } else if (normalizedKey.includes('apple')) {
      serviceName = "Apple";
      description = "Servicios de Apple";
      normalizedKey = 'apple';
    } else if (normalizedKey.includes('google') || normalizedKey.includes('nest')) {
      serviceName = "Google";
      description = "Servicios de Google";
      normalizedKey = 'google';
    } else if (normalizedKey.includes('amazon')) {
      serviceName = "Amazon";
      description = "Servicios de Amazon";
      normalizedKey = 'amazon';
    } else if (normalizedKey.includes('rotoplas')) {
      serviceName = "Rotoplas";
      description = "Servicio de agua";
      normalizedKey = 'rotoplas';
    } else if (normalizedKey.includes('uber')) {
      serviceName = "Uber";
      description = "Plataforma de transporte";
      normalizedKey = 'uber';
    } else if (normalizedKey.includes('didi')) {
      serviceName = "DiDi";
      description = "Plataforma de transporte";
      normalizedKey = 'didi';
    } else if (normalizedKey.includes('rappi')) {
      serviceName = "Rappi";
      description = "Plataforma de delivery";
      normalizedKey = 'rappi';
    } else if (normalizedKey.includes('mercadolibre') || normalizedKey.includes('mercadopago')) {
      serviceName = "MercadoLibre";
      description = "Plataforma de comercio electrónico";
      normalizedKey = 'mercadolibre';
    } else if (normalizedKey.includes('disney')) {
      serviceName = "Disney+";
      description = "Plataforma de streaming de video";
      normalizedKey = 'disney';
    } else if (normalizedKey.includes('hbo') || normalizedKey.includes('max')) {
      serviceName = "HBO Max";
      description = "Plataforma de streaming de video";
      normalizedKey = 'hbo';
    } else if (normalizedKey.includes('youtube') || normalizedKey.includes('premium')) {
      serviceName = "YouTube Premium";
      description = "Plataforma de streaming de video";
      normalizedKey = 'youtube';
    } else if (normalizedKey.includes('microsoft') || normalizedKey.includes('office') || normalizedKey.includes('365') || normalizedKey.includes('msbill')) {
      serviceName = "Microsoft";
      description = "Servicios de Microsoft (Office 365, Xbox, etc.)";
      normalizedKey = 'microsoft';
    } else if (normalizedKey.includes('adobe')) {
      serviceName = "Adobe";
      description = "Software de diseño y creatividad";
      normalizedKey = 'adobe';
    } else if (normalizedKey.includes('dropbox')) {
      serviceName = "Dropbox";
      description = "Almacenamiento en la nube";
      normalizedKey = 'dropbox';
    } else if (normalizedKey.includes('zoom')) {
      serviceName = "Zoom";
      description = "Plataforma de videoconferencias";
      normalizedKey = 'zoom';
    } else if (normalizedKey.includes('canva')) {
      serviceName = "Canva";
      description = "Herramienta de diseño gráfico";
      normalizedKey = 'canva';
    } else if (normalizedKey.includes('notion')) {
      serviceName = "Notion";
      description = "Herramienta de productividad";
      normalizedKey = 'notion';
    } else if (normalizedKey.includes('github')) {
      serviceName = "GitHub";
      description = "Plataforma de desarrollo";
      normalizedKey = 'github';
    } else if (normalizedKey.includes('lovable')) {
      serviceName = "Lovable";
      description = "Plataforma de desarrollo web";
      normalizedKey = 'lovable';
    } else if (normalizedKey.includes('opus') || normalizedKey.includes('clip')) {
      serviceName = "Opus Clip";
      description = "Herramienta de edición de video";
      normalizedKey = 'opus';
    } else if (normalizedKey.includes('paypal') && normalizedKey.includes('p36')) {
      // Generic PayPal services that might be recurring
      serviceName = "PayPal Service";
      description = "Servicio via PayPal";
      normalizedKey = 'paypal_generic';
    } else {
      // For unknown services, normalize by removing special characters and numbers
      normalizedKey = comment.toLowerCase()
        .replace(/[*\s\d]/g, '')
        .replace(/paypal/g, '')
        .substring(0, 10);
      serviceName = comment.split(' ')[0] || comment.substring(0, 15);
    }
    
    // Group similar services
    if (serviceMap.has(normalizedKey)) {
      serviceMap.get(normalizedKey)!.originalComments.push(comment);
    } else {
      serviceMap.set(normalizedKey, {
        serviceName,
        description,
        originalComments: [comment]
      });
    }
  });
  
  return { groups: Array.from(serviceMap.values()) };
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

    // Use free intelligent analysis - no external APIs needed
    console.log('Using free intelligent analysis system');
    const fallbackResult = createFallbackGroups(comments);
    return new Response(JSON.stringify(fallbackResult), {
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