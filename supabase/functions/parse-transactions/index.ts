import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

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

// Convert ArrayBuffer to base64
function arrayBufferToBase64(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer);
  let binary = '';
  for (let i = 0; i < bytes.byteLength; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
}

type CsvSignedEntry = {
  fechaIso: string;
  descripcion: string;
  importe: number; // signed
};

function normalizeText(s: string) {
  return (s || '')
    .toUpperCase()
    .replace(/\s+/g, ' ')
    .replace(/[^A-Z0-9 ]/g, '')
    .trim();
}

function parseAmexDateToIso(value: string): string | null {
  // Example: "06 Jan 2026"
  const parts = (value || '').trim().split(/\s+/);
  if (parts.length !== 3) return null;
  const [ddStr, monStr, yyyyStr] = parts;
  const dd = Number(ddStr);
  const yyyy = Number(yyyyStr);
  const months: Record<string, number> = {
    JAN: 1,
    FEB: 2,
    MAR: 3,
    APR: 4,
    MAY: 5,
    JUN: 6,
    JUL: 7,
    AUG: 8,
    SEP: 9,
    OCT: 10,
    NOV: 11,
    DEC: 12,
  };
  const mm = months[monStr.toUpperCase()];
  if (!dd || !mm || !yyyy) return null;
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${yyyy}-${pad(mm)}-${pad(dd)}`;
}

function parseCsv(content: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let field = '';
  let inQuotes = false;

  for (let i = 0; i < content.length; i++) {
    const ch = content[i];

    if (inQuotes) {
      if (ch === '"') {
        const next = content[i + 1];
        if (next === '"') {
          field += '"';
          i++;
        } else {
          inQuotes = false;
        }
      } else {
        field += ch;
      }
      continue;
    }

    if (ch === '"') {
      inQuotes = true;
      continue;
    }

    if (ch === ',') {
      row.push(field);
      field = '';
      continue;
    }

    if (ch === '\n') {
      row.push(field);
      field = '';
      rows.push(row);
      row = [];
      continue;
    }

    if (ch === '\r') {
      continue;
    }

    field += ch;
  }

  // Flush last field
  row.push(field);
  rows.push(row);

  return rows.filter((r) => r.some((c) => (c || '').trim() !== ''));
}

function tryParseAmexSignedEntries(fileContent: string): CsvSignedEntry[] | null {
  // Only attempt for CSV exports that contain the "Importe" column
  if (!fileContent.includes('Importe')) return null;

  const rows = parseCsv(fileContent);
  if (!rows.length) return null;

  const header = rows[0].map((h) => (h || '').trim());
  const idxFecha = header.findIndex((h) => h.toLowerCase() === 'fecha');
  const idxDesc = header.findIndex((h) => h.toLowerCase() === 'descripción' || h.toLowerCase() === 'descripcion');
  const idxImporte = header.findIndex((h) => h.toLowerCase() === 'importe');

  if (idxFecha === -1 || idxDesc === -1 || idxImporte === -1) return null;

  const entries: CsvSignedEntry[] = [];
  for (const r of rows.slice(1)) {
    const fechaIso = parseAmexDateToIso(r[idxFecha] || '');
    const descripcion = (r[idxDesc] || '').trim();
    const importe = Number(String(r[idxImporte] || '').replace(/,/g, '').trim());
    if (!fechaIso || !descripcion || !Number.isFinite(importe)) continue;
    entries.push({ fechaIso, descripcion, importe });
  }

  return entries.length ? entries : null;
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
    const accountType = formData.get('accountType') as string || 'bank'; // 'bank' or 'credit_card'
    
    if (!file) {
      throw new Error('No file provided');
    }

    const categories: Category[] = JSON.parse(categoriesJson || '[]');
    const fileName = file.name.toLowerCase();
    const isPDF = fileName.endsWith('.pdf');
    const isImage = fileName.endsWith('.png') || fileName.endsWith('.jpg') || fileName.endsWith('.jpeg');
    
    console.log(`Processing file: ${file.name}, size: ${file.size} bytes, isPDF: ${isPDF}, isImage: ${isImage}, accountType: ${accountType}`);

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

    // Build categories info
    const categoriesInfo = categories.map(c => `- ${c.categoria} > ${c.subcategoria}`).join('\n');
    const historicalExamples = historicalTransactions.slice(0, 30).map(t => 
      `"${t.comentario}" → ${t.categoria} > ${t.subcategoria}`
    ).join('\n');

    const systemPrompt = `Eres un asistente financiero experto en extraer y clasificar transacciones de estados de cuenta.

Tu tarea es:
1. EXTRAER todas las transacciones del documento (fechas, descripciones, montos)
2. CLASIFICAR cada transacción en la categoría y subcategoría más apropiada
3. DETERMINAR si es GASTO o INGRESO basándote en el SIGNIFICADO de la transacción, NO en el signo del monto
4. SUGERIR nuevas categorías cuando no exista una apropiada

CATEGORÍAS DISPONIBLES DEL USUARIO:
${categoriesInfo}

EJEMPLOS DEL HISTORIAL DEL USUARIO (aprende su estilo de clasificación):
${historicalExamples || 'Sin historial previo'}

REGLAS DE EXTRACCIÓN:
- Busca patrones de fecha (DD/MM/AAAA, DD-MM-AAAA, MM/DD/AAAA, etc.)
- Identifica montos con símbolos de moneda ($, €, MXN, USD) o sin ellos
- IMPORTANTE: Ignora líneas de saldo, totales, o información que no sea una transacción individual

REGLAS CRÍTICAS PARA DETERMINAR GASTO vs INGRESO:
Analiza el CONCEPTO/DESCRIPCIÓN de la transacción, NO el signo del monto:

1. Son GASTOS (gasto > 0, ingreso = 0):
   - Compras (Amazon, tiendas, restaurantes, supermercados)
   - Pagos de servicios (luz, agua, internet, streaming)
   - Suscripciones y membresías
   - Pagos de cuotas anuales, seguros
   - Cualquier consumo o cargo
   - REEMBOLSOS/DEVOLUCIONES/REVERSOS/CHARGEBACKS (se registran como gasto POSITIVO en esta app)

2. Son INGRESOS (ingreso > 0, gasto = 0):
   - PAGOS A TARJETA: "PAGO RECIBIDO", "GRACIAS POR SU PAGO", "TU PAGO", "PAGO EN LINEA" → categoría "SIN ASIGNAR > SIN ASIGNAR"

3. Si NO puedes determinar con certeza si es gasto o ingreso:
   - Usa "SIN ASIGNAR > SIN ASIGNAR" como categoría
   - Deja ingreso = 0 y gasto = 0
   - El usuario lo corregirá manualmente

REGLAS DE CLASIFICACIÓN DE CATEGORÍAS:
- Si hay categoría existente que encaje EXACTAMENTE, úsala (confidence: "high")
- Si hay categoría similar pero no exacta, úsala (confidence: "medium")  
- Si NO hay categoría apropiada en la lista del usuario:
  * Marca isNewCategory: true
  * Sugiere una nueva categoría y subcategoría lógica
  * confidence: "low"
  * IMPORTANTE: Agrega la sugerencia al array "newCategorySuggestions"
- Prioriza las categorías del historial cuando el comentario sea similar
- IMPORTANTE: "SIN ASIGNAR" NO es una categoría nueva, es la categoría por defecto del sistema. 
  Si no sabes cómo clasificar algo, usa "SIN ASIGNAR > SIN ASIGNAR" con isNewCategory: false

REGLAS PARA NUEVAS CATEGORÍAS:
- NUNCA sugieras "SIN ASIGNAR" como categoría nueva - ya existe en el sistema
- Si una transacción NO encaja en ninguna categoría existente, DEBES agregarla a "newCategorySuggestions"
- Agrupa transacciones similares en la misma sugerencia de categoría
- Las sugerencias deben ser específicas pero reutilizables (ej: "Salud > Farmacia" no "Salud > Farmacia San Pablo")
- Incluye una razón breve y clara de por qué se necesita esta categoría

FORMATO DE RESPUESTA (SOLO JSON, sin explicaciones):
{
  "transactions": [
    {
      "fecha": "2025-01-15",
      "comentario": "UBER EATS",
      "ingreso": 0,
      "gasto": 350.50,
      "suggestedCategory": "Alimentación",
      "suggestedSubcategory": "Restaurantes",
      "confidence": "high",
      "isNewCategory": false
    },
    {
      "fecha": "2025-01-16",
      "comentario": "AMAZON MX MARKETPLACE - monto negativo en CSV significa devolución",
      "ingreso": 0,
      "gasto": 150.00,
      "suggestedCategory": "Compras personales",
      "suggestedSubcategory": "Compras en linea",
      "confidence": "high",
      "isNewCategory": false
    },
    {
      "fecha": "2025-01-17",
      "comentario": "PAGO RECIBIDO GRACIAS",
      "ingreso": 5000.00,
      "gasto": 0,
      "suggestedCategory": "SIN ASIGNAR",
      "suggestedSubcategory": "SIN ASIGNAR",
      "confidence": "high",
      "isNewCategory": false
    }
  ],
  "newCategorySuggestions": [
    {
      "categoria": "Salud",
      "subcategoria": "Farmacia",
      "razon": "Compras en farmacias y medicamentos no tienen categoría existente"
    }
  ]
}

IMPORTANTE:
- Fechas en formato YYYY-MM-DD
- Montos como números POSITIVOS siempre (sin símbolos de moneda)
- Si es gasto, ingreso = 0 y viceversa
- Limpia los comentarios de caracteres especiales
- NO incluyas saldos, solo transacciones individuales
- En tarjetas de crédito: un monto negativo en el archivo NORMALMENTE significa reembolso/devolución, pero ANALIZA EL CONCEPTO para confirmarlo
- SIEMPRE incluye newCategorySuggestions cuando hay transacciones con isNewCategory: true (excepto SIN ASIGNAR)
- Cada categoría nueva debe aparecer UNA sola vez en newCategorySuggestions aunque haya múltiples transacciones
- NUNCA agregues "SIN ASIGNAR" a newCategorySuggestions - es una categoría del sistema que ya existe`;

    let messages: any[];

    if (isPDF || isImage) {
      // For PDFs and images, use vision model with base64
      const fileBuffer = await file.arrayBuffer();
      const base64Content = arrayBufferToBase64(fileBuffer);
      const mimeType = isPDF ? 'application/pdf' : (fileName.endsWith('.png') ? 'image/png' : 'image/jpeg');
      
      console.log(`Sending ${mimeType} to AI with vision capabilities...`);

      messages = [
        { role: 'system', content: systemPrompt },
        { 
          role: 'user', 
          content: [
            {
              type: 'text',
              text: 'Analiza este estado de cuenta y extrae TODAS las transacciones. Devuelve SOLO el JSON con las transacciones encontradas.'
            },
            {
              type: 'image_url',
              image_url: {
                url: `data:${mimeType};base64,${base64Content}`
              }
            }
          ]
        }
      ];
    } else {
      // For CSV/Excel/text files, read as text
      const fileContent = await file.text();
      console.log(`Processing text file, content length: ${fileContent.length} chars`);
      
      messages = [
        { role: 'system', content: systemPrompt },
        { 
          role: 'user', 
          content: `Analiza este contenido y extrae TODAS las transacciones:\n\n${fileContent.substring(0, 50000)}`
        }
      ];
    }

    console.log('Calling AI for transaction parsing...');

    // Use gemini-2.5-pro for vision capabilities with PDFs
    const modelToUse = (isPDF || isImage) ? 'google/gemini-2.5-pro' : 'google/gemini-2.5-flash';
    console.log(`Using model: ${modelToUse}`);

    const response = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: modelToUse,
        messages,
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
      throw new Error(`AI gateway error: ${response.status} - ${errorText}`);
    }

    const aiResponse = await response.json();
    const aiContent = aiResponse.choices?.[0]?.message?.content || '';
    
    console.log('AI response received, length:', aiContent.length);
    console.log('AI response preview:', aiContent.substring(0, 500));

    // Extract JSON from response (handle markdown code blocks)
    let jsonStr = aiContent;
    const jsonMatch = aiContent.match(/```(?:json)?\s*([\s\S]*?)```/);
    if (jsonMatch) {
      jsonStr = jsonMatch[1].trim();
    } else {
      // Try to find JSON object directly
      const jsonStart = aiContent.indexOf('{');
      const jsonEnd = aiContent.lastIndexOf('}');
      if (jsonStart !== -1 && jsonEnd !== -1) {
        jsonStr = aiContent.substring(jsonStart, jsonEnd + 1);
      }
    }

    let parsedResult;
    try {
      parsedResult = JSON.parse(jsonStr);
    } catch (parseError) {
      console.error('Failed to parse AI response as JSON:', jsonStr.substring(0, 1000));
      throw new Error('Failed to parse AI response. The AI could not extract transactions from this file format.');
    }

    // Map suggested categories to category IDs + apply sign logic based on account type
    const isRefundLike = (comentarioRaw: string) => {
      const comentario = (comentarioRaw || '').toUpperCase();
      return [
        'REEMBOL',
        'DEVOLUC',
        'BONIFIC',
        'AJUSTE A FAVOR',
        'A FAVOR',
        'CASHBACK',
        'REVERS',
        'REFUND',
        'CHARGEBACK',
        'DISPUTE',
      ].some((k) => comentario.includes(k));
    };

    const isPaymentToCard = (comentarioRaw: string) => {
      const comentario = (comentarioRaw || '').toUpperCase();
      return [
        'PAGO RECIBIDO',
        'PAGO GRACIAS',
        'TU PAGO',
        'PAGO EN LINEA',
        'PAYMENT RECEIVED',
        'THANK YOU',
        'GRACIAS POR SU PAGO',
      ].some((k) => comentario.includes(k));
    };

    const transactions: ParsedTransaction[] = (parsedResult.transactions || []).map((t: any) => {
      const matchedCategory = categories.find(
        (c) =>
          c.categoria.toLowerCase() === (t.suggestedCategory || '').toLowerCase() &&
          c.subcategoria.toLowerCase() === (t.suggestedSubcategory || '').toLowerCase()
      );

      // If no exact match, try partial match on subcategory
      const partialMatch = !matchedCategory
        ? categories.find(
            (c) =>
              c.subcategoria.toLowerCase().includes((t.suggestedSubcategory || '').toLowerCase()) ||
              (t.suggestedSubcategory || '').toLowerCase().includes(c.subcategoria.toLowerCase())
          )
        : null;

      // If still no match, try matching just the category
      const categoryMatch = !matchedCategory && !partialMatch
        ? categories.find((c) => c.categoria.toLowerCase() === (t.suggestedCategory || '').toLowerCase())
        : null;

      const finalCategory = matchedCategory || partialMatch || categoryMatch;
      const sinAsignar = categories.find((c) => c.subcategoria.toUpperCase() === 'SIN ASIGNAR');

      // Use AI's interpretation directly - it analyzes the concept, not the sign
      const rawIngreso = Number(t.ingreso) || 0;
      const rawGasto = Number(t.gasto) || 0;

      // Safety net: if AI marked both or neither, check for refund/payment keywords
      let ingreso = rawIngreso;
      let gasto = rawGasto;

      const baseAmount = Math.max(Math.abs(rawIngreso), Math.abs(rawGasto));

      if ((rawIngreso === 0 && rawGasto === 0) || (rawIngreso > 0 && rawGasto > 0)) {
        // AI didn't provide clear direction, use keyword heuristics
        if (isPaymentToCard(t.comentario)) {
          ingreso = baseAmount;
          gasto = 0;
        } else if (isRefundLike(t.comentario)) {
          // In this app refunds are stored as "gasto positivo"
          ingreso = 0;
          gasto = baseAmount;
        } else {
          ingreso = 0;
          gasto = baseAmount;
        }
      }

      // Ensure positive amounts
      ingreso = Math.abs(ingreso);
      gasto = Math.abs(gasto);

      return {
        fecha: t.fecha,
        comentario: t.comentario,
        ingreso,
        gasto,
        suggestedCategoryId: finalCategory?.id || sinAsignar?.id || '',
        suggestedCategory: finalCategory?.categoria || t.suggestedCategory || 'SIN ASIGNAR',
        suggestedSubcategory: finalCategory?.subcategoria || t.suggestedSubcategory || 'SIN ASIGNAR',
        confidence: matchedCategory ? 'high' : partialMatch || categoryMatch ? 'medium' : 'low',
        isNewCategory: !finalCategory && t.isNewCategory,
      };
    });

    // Filter out "SIN ASIGNAR" and anything that already exists in user's categories
    const filteredNewCategorySuggestions = (parsedResult.newCategorySuggestions || [])
      .filter((s: any) => s?.categoria && s?.subcategoria)
      .filter((s: any) => s.subcategoria?.toUpperCase() !== 'SIN ASIGNAR' && s.categoria?.toUpperCase() !== 'SIN ASIGNAR')
      .filter((s: any) => !categories.some((c) =>
        c.categoria.toLowerCase() === String(s.categoria).toLowerCase() &&
        c.subcategoria.toLowerCase() === String(s.subcategoria).toLowerCase()
      ));

    console.log(`Successfully parsed ${transactions.length} transactions`);

    return new Response(
      JSON.stringify({
        success: true,
        transactions,
        newCategorySuggestions: filteredNewCategorySuggestions,
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
