import { Category } from '@/types/finance';

export interface ParsedTransaction {
  fecha: string;
  comentario: string;
  ingreso: number;
  gasto: number;
  /** Tipo de movimiento (según columna/monto), independiente del tipo de categoría */
  movementType: 'Ingreso' | 'Gasto' | 'Reembolso';
  suggestedCategoryId?: string;
  /** Tipo de categoría sugerida */
  suggestedCategoryType?: 'Ingreso' | 'Gasto';
  confidence: 'high' | 'medium' | 'low';
  isReembolso?: boolean;
}

// Historial de transacciones para clasificación
export interface TransactionHistory {
  comentario: string;
  subcategoriaId: string;
  tipo: 'Ingreso' | 'Gasto';
}

export interface BankFormat {
  id: string;
  name: string;
  description: string;
  fileTypes: string[];
  dateFormat: 'DD/MM/YYYY' | 'DD/MM/YY' | 'DD MMM YYYY' | 'YYYY-MM-DD';
  decimalSeparator: '.' | ',';
  thousandsSeparator: '.' | ',' | ' ' | '';
  hasHeader: boolean;
  headerRows?: number;
  delimiter?: string;
}

// Definición de formatos bancarios conocidos
export const BANK_FORMATS: BankFormat[] = [
  {
    id: 'hsbc',
    name: 'HSBC',
    description: 'CSV con formato: Fecha, Descripción, Monto',
    fileTypes: ['csv'],
    dateFormat: 'DD/MM/YYYY',
    decimalSeparator: ',',
    thousandsSeparator: '.',
    hasHeader: false,
    delimiter: ','
  },
  {
    id: 'amex',
    name: 'American Express',
    description: 'CSV con cabecera: Fecha, Descripción, Importe',
    fileTypes: ['csv'],
    dateFormat: 'DD MMM YYYY',
    decimalSeparator: '.',
    thousandsSeparator: ',',
    hasHeader: true,
    headerRows: 1,
    delimiter: ','
  },
  {
    id: 'mastercard_tc',
    name: 'MasterCard/Visa TC',
    description: 'CSV sin cabecera: Fecha, Concepto, Monto',
    fileTypes: ['csv'],
    dateFormat: 'DD/MM/YYYY',
    decimalSeparator: ',',
    thousandsSeparator: '.',
    hasHeader: false,
    delimiter: ','
  },
  {
    id: 'ing',
    name: 'ING Direct',
    description: 'Excel/CSV con F.valor, Categoría, Subcategoría, Movimiento, Importe',
    fileTypes: ['xls', 'xlsx', 'csv'],
    dateFormat: 'DD/MM/YYYY',
    decimalSeparator: ',',
    thousandsSeparator: '.',
    hasHeader: true,
    headerRows: 1,
    delimiter: ';'
  },
  {
    id: 'generic',
    name: 'Formato Genérico',
    description: 'CSV: Fecha, Descripción, Ingreso, Gasto',
    fileTypes: ['csv'],
    dateFormat: 'DD/MM/YYYY',
    decimalSeparator: ',',
    thousandsSeparator: '.',
    hasHeader: false,
    delimiter: ','
  }
];

// Keywords para clasificación automática
const CATEGORY_KEYWORDS: Record<string, string[]> = {
  // Alimentación
  'supermercado': ['mercadona', 'carrefour', 'lidl', 'aldi', 'eroski', 'dia', 'alcampo', 'hipercor', 'el corte ingles', 'walmart', 'soriana', 'chedraui', 'superama', 'costco', 'sams club', 'heb', 'oxxo', 'canasta', 'abarrey', 'kowi', 'city market'],
  'restaurantes': ['uber eats', 'rappi', 'didi food', 'just eat', 'glovo', 'deliveroo', 'mcdonalds', 'burger king', 'kfc', 'dominos', 'pizza hut', 'starbucks', 'vips', 'sanborns', 'restaurant', 'rest ', 'cafe', 'bar', 'comida', 'bronco', 'dogos', 'melo cafe', 'panarra', 'copines', 'niddo', 'estiatorio', 'azul centro'],
  
  // Transporte
  'gasolina': ['gasolinera', 'pemex', 'bp', 'shell', 'repsol', 'cepsa', 'total', 'fuel', 'petromax', 'gasolina', 'gasoline'],
  'transporte publico': ['metro', 'autobus', 'bus', 'tren', 'renfe', 'cercanias', 'transporte', 'cabify', 'uber trip', 'didi', 'beat', 'taxi'],
  'peajes': ['peaje', 'autopista', 'toll', 'via t', 'telepeaje', 'tag', 'iave', 'pase ', 'pase d isra', 'pase tlalpan', 'pase tepoztlan', 'pase ejerc'],
  
  // Hogar
  'alquiler': ['alquiler', 'renta', 'rent', 'arrendamiento'],
  'hipoteca': ['hipoteca', 'mortgage', 'credito vivienda'],
  'servicios': ['luz', 'agua', 'gas natural', 'electricidad', 'enel', 'endesa', 'iberdrola', 'naturgy', 'cfe', 'telmex', 'izzi', 'totalplay', 'megacable', 'at&t', 'rotoplas'],
  
  // Salud
  'farmacia': ['farmacia', 'pharmacy', 'farmacias del ahorro', 'san pablo', 'guadalajara', 'benavides', 'similares', 'fbenavides', 'far guad'],
  'medico': ['doctor', 'medico', 'hospital', 'clinica', 'dentista', 'odontologo', 'laboratorio'],
  'deporte': ['natacion', 'padel', 'playtomic', 'gym', 'gimnasio', 'decathlon', 'duo padel'],
  
  // Entretenimiento
  'streaming': ['netflix', 'spotify', 'hbo', 'disney', 'amazon prime', 'apple tv', 'youtube premium', 'deezer', 'crunchyroll', 'apple.com/bill'],
  'cine': ['cine', 'cinepolis', 'cinemex', 'cinemark', 'movie'],
  
  // Compras
  'amazon': ['amazon'],
  'mercado libre': ['mercadopago', 'mercado libre'],
  'tiendas': ['liverpool', 'palacio de hierro', 'steren', 'hexclad', 'barrabes'],
  
  // Finanzas
  'comisiones': ['comision', 'commission', 'fee', 'cargo', 'mantenimiento', 'cuota anual', 'iva aplicable'],
  'pago tarjeta': ['pago', 'gracias por su pago', 'su pago gracias', 'pago de credito'],
  
  // Ingresos
  'salario': ['nomina', 'salario', 'sueldo', 'payroll', 'salary', 'wage'],
  'rendimientos': ['rendimiento', 'mt rendimiento', 'interes', 'dividendo'],
  'transferencia': ['transferencia', 'deposito', 'abono', 'reemb saldo'],
  'descuento': ['descuento', 'bono', 'reembolso'],
};

// Keywords que indican reembolso en tarjeta de crédito
const REFUND_KEYWORDS = ['devolucion', 'reembolso', 'refund', 'return', 'reversion', 'cancelacion', 'amazon', 'liverpool', 'mercadolibre', 'mercado libre', 'mercadopago', 'wish', 'aliexpress', 'shein', 'servicio de facturacion', 'barrabes'];

// Buscar en historial de transacciones para clasificación
function findInHistory(
  comentario: string, 
  history: TransactionHistory[]
): { categoryId: string; categoryType: 'Ingreso' | 'Gasto' } | null {
  const lowerComentario = comentario.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
  
  // Buscar coincidencia exacta o parcial en historial
  for (const tx of history) {
    const historyComentario = tx.comentario.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
    
    // Coincidencia por primeras palabras clave (quitar números y fechas)
    const cleanCurrent = lowerComentario.replace(/\d+/g, '').replace(/\s+/g, ' ').trim();
    const cleanHistory = historyComentario.replace(/\d+/g, '').replace(/\s+/g, ' ').trim();
    
    // Si las primeras 20 caracteres coinciden después de limpiar
    if (cleanCurrent.length > 5 && cleanHistory.length > 5) {
      const prefix = Math.min(20, cleanCurrent.length, cleanHistory.length);
      if (cleanCurrent.substring(0, prefix) === cleanHistory.substring(0, prefix)) {
        return { categoryId: tx.subcategoriaId, categoryType: tx.tipo };
      }
    }
    
    // Coincidencia por palabras clave significativas
    const keywords = cleanHistory.split(' ').filter(w => w.length > 3);
    const matches = keywords.filter(k => cleanCurrent.includes(k));
    if (keywords.length > 0 && matches.length >= Math.ceil(keywords.length * 0.6)) {
      return { categoryId: tx.subcategoriaId, categoryType: tx.tipo };
    }
  }
  
  return null;
}

export function parseCSVLine(line: string, delimiter: string = ','): string[] {
  const result: string[] = [];
  let current = '';
  let inQuotes = false;
  
  for (let i = 0; i < line.length; i++) {
    const char = line[i];
    
    if (char === '"') {
      inQuotes = !inQuotes;
    } else if (char === delimiter && !inQuotes) {
      result.push(current.trim().replace(/^"|"$/g, ''));
      current = '';
    } else {
      current += char;
    }
  }
  
  result.push(current.trim().replace(/^"|"$/g, ''));
  return result;
}

const MONTH_NAMES: Record<string, string> = {
  'jan': '01', 'feb': '02', 'mar': '03', 'apr': '04', 'may': '05', 'jun': '06',
  'jul': '07', 'aug': '08', 'sep': '09', 'oct': '10', 'nov': '11', 'dec': '12',
  'ene': '01', 'abr': '04', 'ago': '08', 'dic': '12'
};

export function parseDate(dateStr: string, format: BankFormat['dateFormat']): string {
  if (!dateStr || dateStr.trim() === '') return new Date().toISOString().split('T')[0];
  
  const cleaned = dateStr.trim().replace(/['"]/g, '');
  
  try {
    if (format === 'DD MMM YYYY') {
      // Format: "06 Jan 2026"
      const parts = cleaned.split(' ');
      if (parts.length < 3) return new Date().toISOString().split('T')[0];
      
      const day = parts[0].padStart(2, '0');
      const monthName = parts[1].toLowerCase().substring(0, 3);
      const month = MONTH_NAMES[monthName] || '01';
      const year = parts[2];
      
      return `${year}-${month}-${day}`;
    }
    
    if (format === 'DD/MM/YYYY' || format === 'DD/MM/YY') {
      const parts = cleaned.split(/[\/\-]/);
      if (parts.length < 3) return new Date().toISOString().split('T')[0];
      
      const day = parts[0].padStart(2, '0');
      const month = parts[1].padStart(2, '0');
      let year = parts[2];
      
      if (year.length === 2) {
        const yearNum = parseInt(year);
        year = yearNum < 50 ? `20${year}` : `19${year}`;
      }
      
      return `${year}-${month}-${day}`;
    }
    
    if (format === 'YYYY-MM-DD') {
      const parts = cleaned.split('-');
      if (parts.length < 3) return new Date().toISOString().split('T')[0];
      
      return `${parts[0]}-${parts[1].padStart(2, '0')}-${parts[2].padStart(2, '0')}`;
    }
    
    return new Date().toISOString().split('T')[0];
  } catch {
    return new Date().toISOString().split('T')[0];
  }
}

export function parseAmount(amountStr: string, format: BankFormat): { value: number; isNegative: boolean } {
  if (!amountStr || amountStr.trim() === '' || amountStr.trim() === '0') {
    return { value: 0, isNegative: false };
  }
  
  let cleaned = amountStr
    .replace(/['"]/g, '')
    .replace(/[€$MXN]/gi, '')
    .trim();
  
  // Check for negative sign
  const isNegative = cleaned.startsWith('-') || cleaned.startsWith('(') || cleaned.endsWith('-');
  cleaned = cleaned.replace(/[()]/g, '').replace(/-/g, '').trim();
  
  // Handle separators
  if (format.decimalSeparator === ',' && format.thousandsSeparator === '.') {
    // European: 1.234,56 -> 1234.56
    cleaned = cleaned.replace(/\./g, '').replace(',', '.');
  } else if (format.decimalSeparator === '.' && format.thousandsSeparator === ',') {
    // US: 1,234.56 -> 1234.56
    cleaned = cleaned.replace(/,/g, '');
  } else {
    // Default: try to detect
    if (cleaned.includes(',') && cleaned.includes('.')) {
      // If both, the last one is decimal
      const lastComma = cleaned.lastIndexOf(',');
      const lastDot = cleaned.lastIndexOf('.');
      if (lastComma > lastDot) {
        cleaned = cleaned.replace(/\./g, '').replace(',', '.');
      } else {
        cleaned = cleaned.replace(/,/g, '');
      }
    } else if (cleaned.includes(',')) {
      // Only comma - check if it's decimal (has digits after)
      const afterComma = cleaned.split(',')[1];
      if (afterComma && afterComma.length <= 2) {
        cleaned = cleaned.replace(',', '.');
      } else {
        cleaned = cleaned.replace(/,/g, '');
      }
    }
  }
  
  const value = parseFloat(cleaned);
  return { 
    value: isNaN(value) ? 0 : Math.abs(value), 
    isNegative 
  };
}

export function classifyTransaction(
  comentario: string, 
  categories: Category[],
  isIncome: boolean = false,
  isCreditCardAccount: boolean = false,
  history: TransactionHistory[] = []
): { categoryId?: string; categoryType?: 'Ingreso' | 'Gasto'; confidence: 'high' | 'medium' | 'low'; isReembolso: boolean } {
  const lowerComentario = comentario.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
  
  // Check if it's a refund on credit card
  let isReembolso = false;
  if (isCreditCardAccount && isIncome) {
    isReembolso = REFUND_KEYWORDS.some(keyword => lowerComentario.includes(keyword));
  }
  
  // PRIMERO: Buscar en historial de transacciones (máxima prioridad)
  const historyMatch = findInHistory(comentario, history);
  if (historyMatch) {
    return {
      categoryId: historyMatch.categoryId,
      categoryType: historyMatch.categoryType,
      confidence: 'high',
      isReembolso
    };
  }
  
  // SEGUNDO: Buscar por keywords
  let bestMatch: { categoryId: string; categoryType?: 'Ingreso' | 'Gasto'; confidence: 'high' | 'medium' | 'low'; score: number } | null = null;
  
  for (const [keyword, patterns] of Object.entries(CATEGORY_KEYWORDS)) {
    for (const pattern of patterns) {
      const normalizedPattern = pattern.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
      
      if (lowerComentario.includes(normalizedPattern)) {
        // Find category that matches this keyword
        const matchingCategory = categories.find(cat => {
          const catSubcategoria = cat.subcategoria.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
          const catCategoria = cat.categoria.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
          const keywordNormalized = keyword.normalize('NFD').replace(/[\u0300-\u036f]/g, '');
          
          return catSubcategoria.includes(keywordNormalized) || 
                 catCategoria.includes(keywordNormalized) ||
                 keywordNormalized.includes(catSubcategoria) ||
                 keywordNormalized.includes(catCategoria);
        });
        
        if (matchingCategory) {
          const score = pattern.length;
          const confidence = pattern.length > 5 ? 'high' : 'medium';
          
          if (!bestMatch || score > bestMatch.score) {
            bestMatch = { 
              categoryId: matchingCategory.id, 
              categoryType: matchingCategory.tipo as 'Ingreso' | 'Gasto',
              confidence, 
              score 
            };
          }
        }
      }
    }
  }
  
  if (bestMatch) {
    return { 
      categoryId: bestMatch.categoryId, 
      categoryType: bestMatch.categoryType,
      confidence: bestMatch.confidence,
      isReembolso 
    };
  }
  
  return { confidence: 'low', isReembolso };
}

// HSBC Parser: Fecha, Descripción, Monto (sin header)
// HSBC: Monto positivo = gasto, monto negativo = ingreso/abono
export function parseHSBC(lines: string[], format: BankFormat, categories: Category[], isCreditCard: boolean, history: TransactionHistory[] = []): ParsedTransaction[] {
  const transactions: ParsedTransaction[] = [];
  
  for (const line of lines) {
    const trimmedLine = line.trim();
    if (!trimmedLine) continue;
    
    const columns = parseCSVLine(trimmedLine, format.delimiter || ',');
    if (columns.length < 3) continue;
    
    const fecha = parseDate(columns[0], format.dateFormat);
    const comentario = columns[1].trim();
    const { value, isNegative } = parseAmount(columns[2], format);
    
    if (value === 0 || !comentario) continue;
    
    // HSBC TDC: positivo = gasto, negativo = abono/crédito
    const isCredit = isNegative;
    const classification = classifyTransaction(comentario, categories, isCredit, isCreditCard, history);
    
    let ingreso = 0;
    let gasto = 0;
    
    if (isCreditCard) {
      if (isCredit) {
        // Negativo = crédito/abono
        if (classification.isReembolso) {
          // Reembolso: poner como gasto positivo para que reste
          gasto = value;
        } else {
          ingreso = value;
        }
      } else {
        // Positivo = gasto normal
        gasto = value;
      }
    } else {
      // Cuenta normal: negativo = gasto, positivo = ingreso
      ingreso = !isNegative ? value : 0;
      gasto = isNegative ? value : 0;
    }
    
    const movementType: ParsedTransaction['movementType'] = classification.isReembolso
      ? 'Reembolso'
      : gasto > 0
        ? 'Gasto'
        : 'Ingreso';

    transactions.push({
      fecha,
      comentario,
      ingreso: Math.abs(ingreso),
      gasto: Math.abs(gasto),
      movementType,
      suggestedCategoryId: classification.categoryId,
      suggestedCategoryType: classification.categoryType,
      confidence: classification.confidence,
      isReembolso: classification.isReembolso
    });
  }
  
  return transactions;
}

// AMEX Parser: Fecha,Fecha Compra,Descripción,Titular,Cuenta,Importe,... (con header)
export function parseAMEX(lines: string[], format: BankFormat, categories: Category[], isCreditCard: boolean, history: TransactionHistory[] = []): ParsedTransaction[] {
  const transactions: ParsedTransaction[] = [];
  const startLine = 1; // Skip header
  
  for (let i = startLine; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line) continue;
    
    const columns = parseCSVLine(line, format.delimiter || ',');
    if (columns.length < 6) continue;
    
    const fecha = parseDate(columns[0], format.dateFormat);
    const comentario = columns[2].trim(); // Descripción está en columna 2
    const { value, isNegative } = parseAmount(columns[5], format); // Importe en columna 5
    
    if (value === 0 || !comentario) continue;
    
    // AMEX: positive = expense, negative = credit/payment
    const isCredit = isNegative;
    const classification = classifyTransaction(comentario, categories, isCredit, true, history);
    
    let ingreso = 0;
    let gasto = 0;
    
    if (isCredit) {
      // Negativo en AMEX = crédito/pago
      if (classification.isReembolso) {
        gasto = value; // Reembolso como gasto positivo
      } else {
        ingreso = value;
      }
    } else {
      gasto = value;
    }
    
    const movementType: ParsedTransaction['movementType'] = classification.isReembolso
      ? 'Reembolso'
      : gasto > 0
        ? 'Gasto'
        : 'Ingreso';

    transactions.push({
      fecha,
      comentario,
      ingreso: Math.abs(ingreso),
      gasto: Math.abs(gasto),
      movementType,
      suggestedCategoryId: classification.categoryId,
      suggestedCategoryType: classification.categoryType,
      confidence: classification.confidence,
      isReembolso: classification.isReembolso
    });
  }
  
  return transactions;
}

// MasterCard TC Parser: Fecha, Concepto, Monto (sin header, negativo = pago/crédito)
export function parseMasterCard(lines: string[], format: BankFormat, categories: Category[], isCreditCard: boolean, history: TransactionHistory[] = []): ParsedTransaction[] {
  const transactions: ParsedTransaction[] = [];
  
  for (const line of lines) {
    const trimmedLine = line.trim();
    if (!trimmedLine) continue;
    
    const columns = parseCSVLine(trimmedLine, format.delimiter || ',');
    if (columns.length < 3) continue;
    
    const fecha = parseDate(columns[0], format.dateFormat);
    const comentario = columns[1].trim();
    const { value, isNegative } = parseAmount(columns[2], format);
    
    if (value === 0 || !comentario) continue;
    
    // MasterCard TC: positive = expense, negative = payment/credit
    const isCredit = isNegative;
    const classification = classifyTransaction(comentario, categories, isCredit, true, history);
    
    let ingreso = 0;
    let gasto = 0;
    
    if (isCredit) {
      if (classification.isReembolso) {
        gasto = value;
      } else {
        ingreso = value;
      }
    } else {
      gasto = value;
    }
    
    const movementType: ParsedTransaction['movementType'] = classification.isReembolso
      ? 'Reembolso'
      : gasto > 0
        ? 'Gasto'
        : 'Ingreso';

    transactions.push({
      fecha,
      comentario,
      ingreso: Math.abs(ingreso),
      gasto: Math.abs(gasto),
      movementType,
      suggestedCategoryId: classification.categoryId,
      suggestedCategoryType: classification.categoryType,
      confidence: classification.confidence,
      isReembolso: classification.isReembolso
    });
  }
  
  return transactions;
}

// ING Parser: F.valor;Categoría;Subcategoría;Movimiento;Importe;Saldo (con header)
export function parseING(lines: string[], format: BankFormat, categories: Category[], isCreditCard: boolean, history: TransactionHistory[] = []): ParsedTransaction[] {
  const transactions: ParsedTransaction[] = [];
  const startLine = 1; // Skip header
  
  for (let i = startLine; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line) continue;
    
    const columns = parseCSVLine(line, format.delimiter || ';');
    if (columns.length < 5) continue;
    
    const fecha = parseDate(columns[0], format.dateFormat);
    const comentario = columns[3].trim(); // Movimiento
    const { value, isNegative } = parseAmount(columns[4], format);
    
    if (value === 0 || !comentario) continue;
    
    const isIncome = !isNegative;
    const classification = classifyTransaction(comentario, categories, isIncome, isCreditCard, history);
    
    let ingreso = 0;
    let gasto = 0;
    
    if (isCreditCard) {
      if (isIncome && classification.isReembolso) {
        gasto = value;
      } else if (isIncome) {
        ingreso = value;
      } else {
        gasto = value;
      }
    } else {
      ingreso = isIncome ? value : 0;
      gasto = isNegative ? value : 0;
    }
    
    const movementType: ParsedTransaction['movementType'] = classification.isReembolso
      ? 'Reembolso'
      : gasto > 0
        ? 'Gasto'
        : 'Ingreso';

    transactions.push({
      fecha,
      comentario,
      ingreso: Math.abs(ingreso),
      gasto: Math.abs(gasto),
      movementType,
      suggestedCategoryId: classification.categoryId,
      suggestedCategoryType: classification.categoryType,
      confidence: classification.confidence,
      isReembolso: classification.isReembolso
    });
  }
  
  return transactions;
}

// Generic Parser: Fecha, Descripción, Ingreso, Gasto
export function parseGeneric(lines: string[], format: BankFormat, categories: Category[], isCreditCard: boolean, history: TransactionHistory[] = []): ParsedTransaction[] {
  const transactions: ParsedTransaction[] = [];
  
  for (const line of lines) {
    const trimmedLine = line.trim();
    if (!trimmedLine) continue;
    
    const columns = parseCSVLine(trimmedLine, format.delimiter || ',');
    if (columns.length < 4) continue;
    
    const fecha = parseDate(columns[0], format.dateFormat);
    const comentario = columns[1].trim();
    const { value: ingresoValue } = parseAmount(columns[2], format);
    const { value: gastoValue } = parseAmount(columns[3], format);
    
    if ((ingresoValue === 0 && gastoValue === 0) || !comentario) continue;
    
    const isIncome = ingresoValue > 0;
    const classification = classifyTransaction(comentario, categories, isIncome, isCreditCard, history);
    
    let ingreso = ingresoValue;
    let gasto = gastoValue;
    
    if (isCreditCard && isIncome && classification.isReembolso) {
      gasto = ingresoValue;
      ingreso = 0;
    }
    
    const movementType: ParsedTransaction['movementType'] = classification.isReembolso
      ? 'Reembolso'
      : gasto > 0
        ? 'Gasto'
        : 'Ingreso';

    transactions.push({
      fecha,
      comentario,
      ingreso: Math.abs(ingreso),
      gasto: Math.abs(gasto),
      movementType,
      suggestedCategoryId: classification.categoryId,
      suggestedCategoryType: classification.categoryType,
      confidence: classification.confidence,
      isReembolso: classification.isReembolso
    });
  }
  
  return transactions;
}

export function parseBankFile(
  content: string, 
  bankFormatId: string, 
  categories: Category[],
  isCreditCard: boolean,
  history: TransactionHistory[] = []
): ParsedTransaction[] {
  const format = BANK_FORMATS.find(f => f.id === bankFormatId);
  if (!format) {
    throw new Error(`Formato de banco no reconocido: ${bankFormatId}`);
  }
  
  // Split by lines, handling different line endings
  const lines = content.split(/\r?\n/).filter(line => line.trim());
  
  switch (bankFormatId) {
    case 'hsbc':
      return parseHSBC(lines, format, categories, isCreditCard, history);
    case 'amex':
      return parseAMEX(lines, format, categories, isCreditCard, history);
    case 'mastercard_tc':
      return parseMasterCard(lines, format, categories, isCreditCard, history);
    case 'ing':
      return parseING(lines, format, categories, isCreditCard, history);
    case 'generic':
    default:
      return parseGeneric(lines, format, categories, isCreditCard, history);
  }
}
