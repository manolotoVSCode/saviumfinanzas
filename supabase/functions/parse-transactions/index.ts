import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.49.1';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface Category {
  id: string;
  categoria: string;
  subcategoria: string;
  tipo: string | null;
}

interface HistoricalTransaction {
  comentario: string;
  categoria: string;
  subcategoria: string;
}

interface ParsedTransaction {
  fecha: string;
  comentario: string;
  ingreso: number;
  gasto: number;
  suggestedCategoryId: string;
  suggestedCategory: string;
  suggestedSubcategory: string;
  confidence: 'high' | 'medium' | 'low';
  isNewCategory: boolean;
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

    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      throw new Error('No authorization header');
    }

    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      { global: { headers: { Authorization: authHeader } } }
    );

    const { data: { user }, error: userError } = await supabaseClient.auth.getUser();
    if (userError || !user) {
      throw new Error('User not authenticated');
    }

    const formData = await req.formData();
    const file = formData.get('file') as File;
    const categoriesJson = formData.get('categories') as string;
    
    if (!file) {
      throw new Error('No file provided');
    }

    const categories: Category[] = JSON.parse(categoriesJson || '[]');
    
    // Fetch user's historical transactions for learning
    const { data: historicalData } = await supabaseClient
      .from('transacciones')
      .select(`
        comentario,
        categorias:subcategoria_id (
          categoria,
          subcategoria
        )
      `)
      .eq('user_id', user.id)
      .limit(500);

    const historicalTransactions: HistoricalTransaction[] = (historicalData || [])
      .filter((t: any) => t.categorias && t.categorias.subcategoria !== 'SIN ASIGNAR')
      .map((t: any) => ({
        comentario: t.comentario,
        categoria: t.categorias.categoria,
        subcategoria: t.categorias.subcategoria,
      }));

    // Read file content
    const fileContent = await file.text();
    const fileType = file.name.toLowerCase().endsWith('.pdf') ? 'pdf' : 
                     file.name.toLowerCase().endsWith('.xlsx') || file.name.toLowerCase().endsWith('.xls') ? 'excel' : 'csv';
    
    console.log(`Processing ${fileType} file: ${file.name}, size: ${file.size} bytes`);

    // Build prompt for AI
    const categoriesInfo = categories.map(c => `- ${c.categoria} > ${c.subcategoria}`).join('\n');
    const historicalExamples = historicalTransactions.slice(0, 50).map(t => 
      `"${t.comentario}" → ${t.categoria} > ${t.subcategoria}`
    ).join('\n');

    const systemPrompt = `Eres un asistente financiero experto en clasificar transacciones bancarias.

Tu tarea es:
1. Extraer las transacciones del contenido del archivo (puede ser CSV, texto de PDF, o datos de Excel)
2. Para cada transacción, clasificarla en la categoría y subcategoría más apropiada

CATEGORÍAS DISPONIBLES DEL USUARIO:
${categoriesInfo}

EJEMPLOS DEL HISTORIAL DEL USUARIO (para aprender su estilo de clasificación):
${historicalExamples || 'Sin historial previo'}

REGLAS DE CLASIFICACIÓN:
- Si encuentras una categoría existente que encaje bien, úsala (confidence: "high" o "medium")
- Si no hay categoría apropiada, sugiere una nueva (isNewCategory: true, confidence: "low")
- Prioriza las categorías del historial del usuario cuando el comentario sea similar
- Para transferencias entre cuentas, usa "Interno > Transferencia Entre Cuentas" si existe
- Para gastos de supermercado, busca "Alimentación" o similar
- Para salarios, busca "Trabajo" o "Salario"

FORMATO DE RESPUESTA:
Devuelve ÚNICAMENTE un JSON válido con este formato:
{
  "transactions": [
    {
      "fecha": "YYYY-MM-DD",
      "comentario": "descripción de la transacción",
      "ingreso": 0,
      "gasto": 1500.50,
      "suggestedCategory": "Alimentación",
      "suggestedSubcategory": "Supermercado",
      "confidence": "high",
      "isNewCategory": false
    }
  ],
  "newCategorySuggestions": [
    {
      "categoria": "Nueva Categoría",
      "subcategoria": "Nueva Subcategoría",
      "razon": "Por qué sugieres crear esta categoría"
    }
  ]
}

IMPORTANTE:
- Las fechas deben estar en formato YYYY-MM-DD
- Los montos deben ser números positivos (sin símbolos de moneda)
- Si una transacción es ingreso, gasto = 0 y viceversa
- Limpia los comentarios de caracteres especiales innecesarios`;

    const userPrompt = `Analiza este contenido de archivo ${fileType} y extrae las transacciones:

---CONTENIDO DEL ARCHIVO---
${fileContent.substring(0, 30000)}
---FIN DEL CONTENIDO---

Extrae todas las transacciones y clasifícalas según las categorías del usuario.`;

    console.log('Calling AI for transaction parsing...');

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
          { role: 'user', content: userPrompt }
        ],
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('AI gateway error:', response.status, errorText);
      
      if (response.status === 429) {
        return new Response(JSON.stringify({ error: 'Rate limits exceeded, please try again later.' }), {
          status: 429,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
      if (response.status === 402) {
        return new Response(JSON.stringify({ error: 'Payment required, please add funds to your Lovable AI workspace.' }), {
          status: 402,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
      throw new Error(`AI gateway error: ${response.status}`);
    }

    const aiResponse = await response.json();
    const aiContent = aiResponse.choices?.[0]?.message?.content || '';
    
    console.log('AI response received, parsing JSON...');

    // Extract JSON from response (handle markdown code blocks)
    let jsonStr = aiContent;
    const jsonMatch = aiContent.match(/```(?:json)?\s*([\s\S]*?)```/);
    if (jsonMatch) {
      jsonStr = jsonMatch[1].trim();
    }

    let parsedResult;
    try {
      parsedResult = JSON.parse(jsonStr);
    } catch (parseError) {
      console.error('Failed to parse AI response as JSON:', jsonStr.substring(0, 500));
      throw new Error('Failed to parse AI response');
    }

    // Map suggested categories to category IDs
    const transactions: ParsedTransaction[] = (parsedResult.transactions || []).map((t: any) => {
      const matchedCategory = categories.find(c => 
        c.categoria.toLowerCase() === (t.suggestedCategory || '').toLowerCase() &&
        c.subcategoria.toLowerCase() === (t.suggestedSubcategory || '').toLowerCase()
      );

      // If no exact match, try partial match
      const partialMatch = !matchedCategory ? categories.find(c => 
        c.subcategoria.toLowerCase().includes((t.suggestedSubcategory || '').toLowerCase()) ||
        (t.suggestedSubcategory || '').toLowerCase().includes(c.subcategoria.toLowerCase())
      ) : null;

      const finalCategory = matchedCategory || partialMatch;
      const sinAsignar = categories.find(c => c.subcategoria.toUpperCase() === 'SIN ASIGNAR');

      return {
        fecha: t.fecha,
        comentario: t.comentario,
        ingreso: Number(t.ingreso) || 0,
        gasto: Number(t.gasto) || 0,
        suggestedCategoryId: finalCategory?.id || sinAsignar?.id || '',
        suggestedCategory: finalCategory?.categoria || t.suggestedCategory || 'SIN ASIGNAR',
        suggestedSubcategory: finalCategory?.subcategoria || t.suggestedSubcategory || 'SIN ASIGNAR',
        confidence: matchedCategory ? 'high' : (partialMatch ? 'medium' : 'low'),
        isNewCategory: !finalCategory && t.isNewCategory,
      };
    });

    console.log(`Parsed ${transactions.length} transactions`);

    return new Response(
      JSON.stringify({
        success: true,
        transactions,
        newCategorySuggestions: parsedResult.newCategorySuggestions || [],
        totalProcessed: transactions.length,
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error in parse-transactions:', error);
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: error instanceof Error ? error.message : 'Unknown error' 
      }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
