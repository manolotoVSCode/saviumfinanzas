import { Category } from '@/types/finance';

export interface ParsedTransaction {
  fecha: string;
  comentario: string;
  ingreso: number;
  gasto: number;
  suggestedCategoryId?: string;
  confidence: 'high' | 'medium' | 'low';
  isReembolso?: boolean;
}

export interface BankFormat {
  id: string;
  name: string;
  fileTypes: string[];
  // Column indices or names
  dateColumn: number | string;
  descriptionColumn: number | string;
  amountColumn?: number | string; // Single amount column (+ or -)
  incomeColumn?: number | string; // Separate income column
  expenseColumn?: number | string; // Separate expense column
  // Format specifics
  dateFormat: 'DD/MM/YYYY' | 'DD/MM/YY' | 'YYYY-MM-DD' | 'DD-MM-YYYY';
  decimalSeparator: '.' | ',';
  thousandsSeparator: '.' | ',' | ' ' | '';
  hasHeader: boolean;
  headerRows?: number;
  encoding?: string;
  delimiter?: string;
  // Credit card specifics
  creditIndicator?: string; // e.g., "CR" for credits
  negativeAsIncome?: boolean; // For credit cards where negative = payment/income
}

// Definición de formatos bancarios conocidos
export const BANK_FORMATS: BankFormat[] = [
  {
    id: 'hsbc',
    name: 'HSBC',
    fileTypes: ['csv'],
    dateColumn: 0,
    descriptionColumn: 1,
    amountColumn: 2,
    dateFormat: 'DD/MM/YYYY',
    decimalSeparator: ',',
    thousandsSeparator: '.',
    hasHeader: true,
    headerRows: 1,
    delimiter: ','
  },
  {
    id: 'amex',
    name: 'American Express',
    fileTypes: ['csv'],
    dateColumn: 0, // "Fecha"
    descriptionColumn: 1, // "Descripción"
    amountColumn: 4, // "Importe" (negative = expense)
    dateFormat: 'DD/MM/YYYY',
    decimalSeparator: ',',
    thousandsSeparator: '.',
    hasHeader: true,
    headerRows: 1,
    delimiter: ','
  },
  {
    id: 'ing',
    name: 'ING Direct',
    fileTypes: ['xls', 'xlsx', 'csv'],
    dateColumn: 'F. valor', // or index 0
    descriptionColumn: 'Movimiento',
    incomeColumn: 'Importe',
    expenseColumn: 'Importe',
    dateFormat: 'DD/MM/YYYY',
    decimalSeparator: ',',
    thousandsSeparator: '.',
    hasHeader: true,
    headerRows: 1,
    delimiter: ';'
  },
  {
    id: 'mastercard_tc',
    name: 'MasterCard/Visa TC',
    fileTypes: ['csv'],
    dateColumn: 0,
    descriptionColumn: 1,
    amountColumn: 2, // or columns 2 and 3 for income/expense
    incomeColumn: 2,
    expenseColumn: 3,
    dateFormat: 'DD/MM/YY',
    decimalSeparator: ',',
    thousandsSeparator: '.',
    hasHeader: false,
    delimiter: ','
  },
  {
    id: 'generic',
    name: 'Formato Genérico',
    fileTypes: ['csv'],
    dateColumn: 0,
    descriptionColumn: 1,
    incomeColumn: 2,
    expenseColumn: 3,
    dateFormat: 'DD/MM/YYYY',
    decimalSeparator: ',',
    thousandsSeparator: '.',
    hasHeader: false,
    delimiter: ','
  }
];

// Keywords para clasificación automática - mapeo a subcategorías
const CATEGORY_KEYWORDS: Record<string, string[]> = {
  // Alimentación
  'supermercado': ['mercadona', 'carrefour', 'lidl', 'aldi', 'eroski', 'dia', 'alcampo', 'hipercor', 'el corte ingles', 'walmart', 'soriana', 'chedraui', 'superama', 'costco', 'sams club', 'heb', 'oxxo'],
  'restaurantes': ['uber eats', 'rappi', 'didi food', 'just eat', 'glovo', 'deliveroo', 'mcdonalds', 'burger king', 'kfc', 'dominos', 'pizza hut', 'starbucks', 'vips', 'sanborns', 'restaurant', 'cafe', 'bar', 'comida'],
  
  // Transporte
  'gasolina': ['gasolinera', 'pemex', 'bp', 'shell', 'repsol', 'cepsa', 'total', 'fuel', 'petromax', 'gasolina', 'gasoline'],
  'transporte publico': ['metro', 'autobus', 'bus', 'tren', 'renfe', 'cercanias', 'transporte', 'cabify', 'uber', 'didi', 'beat', 'taxi'],
  'peajes': ['peaje', 'autopista', 'toll', 'via t', 'telepeaje', 'tag', 'iave'],
  
  // Hogar
  'alquiler': ['alquiler', 'renta', 'rent', 'arrendamiento'],
  'hipoteca': ['hipoteca', 'mortgage', 'credito vivienda'],
  'servicios': ['luz', 'agua', 'gas natural', 'electricidad', 'enel', 'endesa', 'iberdrola', 'naturgy', 'cfe', 'telmex', 'izzi', 'totalplay', 'megacable'],
  
  // Salud
  'farmacia': ['farmacia', 'pharmacy', 'farmacias del ahorro', 'san pablo', 'guadalajara', 'benavides', 'similares'],
  'medico': ['doctor', 'medico', 'hospital', 'clinica', 'dentista', 'odontologo', 'laboratorio'],
  'seguro medico': ['seguro medico', 'sanitas', 'adeslas', 'mapfre salud', 'axa salud', 'gnp salud'],
  
  // Entretenimiento
  'streaming': ['netflix', 'spotify', 'hbo', 'disney', 'amazon prime', 'apple tv', 'youtube premium', 'deezer', 'crunchyroll'],
  'cine': ['cine', 'cinepolis', 'cinemex', 'cinemark', 'movie'],
  'videojuegos': ['steam', 'playstation', 'xbox', 'nintendo', 'epic games'],
  
  // Suscripciones
  'suscripciones': ['suscripcion', 'subscription', 'membership', 'mensualidad', 'cuota'],
  
  // Tecnología
  'electronica': ['apple', 'amazon', 'mercado libre', 'liverpool', 'best buy', 'office depot', 'palacio de hierro'],
  'software': ['microsoft', 'adobe', 'google', 'dropbox', 'icloud', 'notion', 'slack'],
  
  // Finanzas
  'comisiones': ['comision', 'commission', 'fee', 'cargo', 'mantenimiento cuenta'],
  'seguros': ['seguro', 'insurance', 'poliza', 'axa', 'mapfre', 'allianz', 'zurich', 'gnp', 'qualitas', 'chubb'],
  'inversiones': ['inversion', 'investment', 'fondo', 'acciones', 'etf', 'gbm', 'kuspit', 'cetesdirecto', 'bursanet'],
  
  // Ingresos
  'salario': ['nomina', 'salario', 'sueldo', 'payroll', 'salary', 'wage'],
  'transferencia recibida': ['transferencia recibida', 'abono', 'deposito', 'ingreso'],
  'rendimientos': ['rendimiento', 'interes', 'dividendo', 'dividend', 'yield', 'interest'],
  
  // Reembolsos (para tarjetas de crédito)
  'reembolso': ['devolucion', 'reembolso', 'refund', 'return', 'abono', 'cr'],
};

// Keywords que indican reembolso en tarjeta de crédito
const REFUND_KEYWORDS = ['devolucion', 'reembolso', 'refund', 'return', 'abono', 'cancelacion', 'amazon', 'mercado libre', 'paypal'];

export function parseDate(dateStr: string, format: BankFormat['dateFormat']): string {
  if (!dateStr || dateStr.trim() === '') return new Date().toISOString().split('T')[0];
  
  const cleaned = dateStr.trim().replace(/['"]/g, '');
  
  try {
    let day: string, month: string, year: string;
    
    if (format === 'DD/MM/YYYY' || format === 'DD/MM/YY') {
      const parts = cleaned.split(/[\/\-]/);
      if (parts.length < 3) return new Date().toISOString().split('T')[0];
      
      day = parts[0].padStart(2, '0');
      month = parts[1].padStart(2, '0');
      year = parts[2];
      
      if (year.length === 2) {
        const yearNum = parseInt(year);
        year = yearNum < 50 ? `20${year}` : `19${year}`;
      }
    } else if (format === 'DD-MM-YYYY') {
      const parts = cleaned.split('-');
      if (parts.length < 3) return new Date().toISOString().split('T')[0];
      
      day = parts[0].padStart(2, '0');
      month = parts[1].padStart(2, '0');
      year = parts[2];
    } else if (format === 'YYYY-MM-DD') {
      const parts = cleaned.split('-');
      if (parts.length < 3) return new Date().toISOString().split('T')[0];
      
      year = parts[0];
      month = parts[1].padStart(2, '0');
      day = parts[2].padStart(2, '0');
    } else {
      return new Date().toISOString().split('T')[0];
    }
    
    return `${year}-${month}-${day}`;
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
    .replace(/\s/g, '')
    .replace(/[€$MXN]/gi, '')
    .trim();
  
  // Check for negative sign or parentheses
  const isNegative = cleaned.startsWith('-') || cleaned.startsWith('(') || cleaned.endsWith('-');
  cleaned = cleaned.replace(/[()]/g, '').replace(/-/g, '');
  
  // Handle separators based on format
  if (format.thousandsSeparator === '.' && format.decimalSeparator === ',') {
    // European format: 1.234,56
    cleaned = cleaned.replace(/\./g, '').replace(',', '.');
  } else if (format.thousandsSeparator === ',' && format.decimalSeparator === '.') {
    // US format: 1,234.56
    cleaned = cleaned.replace(/,/g, '');
  } else if (format.thousandsSeparator === ' ') {
    // Space as thousands: 1 234,56
    cleaned = cleaned.replace(/\s/g, '').replace(',', '.');
  } else {
    // Default handling
    cleaned = cleaned.replace(/\./g, '').replace(',', '.');
  }
  
  const value = parseFloat(cleaned);
  return { 
    value: isNaN(value) ? 0 : Math.abs(value), 
    isNegative 
  };
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
      result.push(current.trim());
      current = '';
    } else {
      current += char;
    }
  }
  
  result.push(current.trim());
  return result;
}

export function classifyTransaction(
  comentario: string, 
  categories: Category[],
  isCredit: boolean = false,
  isCreditCardAccount: boolean = false
): { categoryId?: string; confidence: 'high' | 'medium' | 'low'; isReembolso: boolean } {
  const lowerComentario = comentario.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
  
  // Check if it's a refund on credit card
  let isReembolso = false;
  if (isCreditCardAccount && isCredit) {
    isReembolso = REFUND_KEYWORDS.some(keyword => lowerComentario.includes(keyword));
  }
  
  // Find best matching category
  let bestMatch: { categoryId: string; confidence: 'high' | 'medium' | 'low'; score: number } | null = null;
  
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
          const score = pattern.length; // Longer matches are more specific
          const confidence = pattern.length > 5 ? 'high' : 'medium';
          
          if (!bestMatch || score > bestMatch.score) {
            bestMatch = { categoryId: matchingCategory.id, confidence, score };
          }
        }
      }
    }
  }
  
  if (bestMatch) {
    return { 
      categoryId: bestMatch.categoryId, 
      confidence: bestMatch.confidence,
      isReembolso 
    };
  }
  
  return { confidence: 'low', isReembolso };
}

export function parseHSBC(lines: string[], format: BankFormat, categories: Category[], isCreditCard: boolean): ParsedTransaction[] {
  const transactions: ParsedTransaction[] = [];
  const startLine = format.hasHeader ? (format.headerRows || 1) : 0;
  
  for (let i = startLine; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line) continue;
    
    const columns = parseCSVLine(line, format.delimiter || ',');
    if (columns.length < 3) continue;
    
    const fecha = parseDate(columns[0], format.dateFormat);
    const comentario = columns[1].replace(/['"]/g, '').trim();
    const { value, isNegative } = parseAmount(columns[2], format);
    
    if (value === 0) continue;
    
    // For HSBC: negative = expense, positive = income
    const isCredit = !isNegative;
    const classification = classifyTransaction(comentario, categories, isCredit, isCreditCard);
    
    let ingreso = 0;
    let gasto = 0;
    
    if (isCreditCard) {
      if (isCredit && classification.isReembolso) {
        // Reembolso en tarjeta de crédito: poner como gasto positivo
        gasto = value;
      } else if (isCredit) {
        // Pago a tarjeta de crédito
        ingreso = value;
      } else {
        // Gasto normal
        gasto = value;
      }
    } else {
      ingreso = isCredit ? value : 0;
      gasto = isNegative ? value : 0;
    }
    
    transactions.push({
      fecha,
      comentario,
      ingreso,
      gasto,
      suggestedCategoryId: classification.categoryId,
      confidence: classification.confidence,
      isReembolso: classification.isReembolso
    });
  }
  
  return transactions;
}

export function parseAMEX(lines: string[], format: BankFormat, categories: Category[], isCreditCard: boolean): ParsedTransaction[] {
  const transactions: ParsedTransaction[] = [];
  const startLine = format.hasHeader ? (format.headerRows || 1) : 0;
  
  for (let i = startLine; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line) continue;
    
    const columns = parseCSVLine(line, format.delimiter || ',');
    if (columns.length < 5) continue;
    
    const fecha = parseDate(columns[0], format.dateFormat);
    const comentario = columns[1].replace(/['"]/g, '').trim();
    const { value, isNegative } = parseAmount(columns[4], format);
    
    if (value === 0) continue;
    
    // For AMEX: negative = expense, positive = credit/refund
    const isCredit = !isNegative;
    const classification = classifyTransaction(comentario, categories, isCredit, isCreditCard);
    
    let ingreso = 0;
    let gasto = 0;
    
    // AMEX es siempre tarjeta de crédito
    if (isCredit && classification.isReembolso) {
      gasto = value; // Reembolso como gasto positivo
    } else if (isCredit) {
      ingreso = value;
    } else {
      gasto = value;
    }
    
    transactions.push({
      fecha,
      comentario,
      ingreso,
      gasto,
      suggestedCategoryId: classification.categoryId,
      confidence: classification.confidence,
      isReembolso: classification.isReembolso
    });
  }
  
  return transactions;
}

export function parseING(lines: string[], format: BankFormat, categories: Category[], isCreditCard: boolean): ParsedTransaction[] {
  const transactions: ParsedTransaction[] = [];
  const startLine = format.hasHeader ? (format.headerRows || 1) : 0;
  
  for (let i = startLine; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line) continue;
    
    const columns = parseCSVLine(line, format.delimiter || ';');
    if (columns.length < 4) continue;
    
    // ING format: F. valor | Categoría | Subcategoría | Movimiento | Importe | Saldo
    const fecha = parseDate(columns[0], format.dateFormat);
    const comentario = columns[3].replace(/['"]/g, '').trim();
    const { value, isNegative } = parseAmount(columns[4], format);
    
    if (value === 0) continue;
    
    const isCredit = !isNegative;
    const classification = classifyTransaction(comentario, categories, isCredit, isCreditCard);
    
    let ingreso = 0;
    let gasto = 0;
    
    if (isCreditCard) {
      if (isCredit && classification.isReembolso) {
        gasto = value;
      } else if (isCredit) {
        ingreso = value;
      } else {
        gasto = value;
      }
    } else {
      ingreso = isCredit ? value : 0;
      gasto = isNegative ? value : 0;
    }
    
    transactions.push({
      fecha,
      comentario,
      ingreso,
      gasto,
      suggestedCategoryId: classification.categoryId,
      confidence: classification.confidence,
      isReembolso: classification.isReembolso
    });
  }
  
  return transactions;
}

export function parseMasterCard(lines: string[], format: BankFormat, categories: Category[], isCreditCard: boolean): ParsedTransaction[] {
  const transactions: ParsedTransaction[] = [];
  
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line) continue;
    
    const columns = parseCSVLine(line, format.delimiter || ',');
    if (columns.length < 4) continue;
    
    // MasterCard TC format: Fecha | Concepto | Ingreso | Gasto
    const fecha = parseDate(columns[0], format.dateFormat);
    const comentario = columns[1].replace(/['"]/g, '').trim();
    const { value: ingresoValue } = parseAmount(columns[2], format);
    const { value: gastoValue } = parseAmount(columns[3], format);
    
    if (ingresoValue === 0 && gastoValue === 0) continue;
    
    const isCredit = ingresoValue > 0;
    const classification = classifyTransaction(comentario, categories, isCredit, true);
    
    let ingreso = ingresoValue;
    let gasto = gastoValue;
    
    // Para tarjeta de crédito: si es ingreso y parece reembolso, convertir a gasto
    if (isCredit && classification.isReembolso) {
      gasto = ingresoValue;
      ingreso = 0;
    }
    
    transactions.push({
      fecha,
      comentario,
      ingreso,
      gasto,
      suggestedCategoryId: classification.categoryId,
      confidence: classification.confidence,
      isReembolso: classification.isReembolso
    });
  }
  
  return transactions;
}

export function parseGeneric(lines: string[], format: BankFormat, categories: Category[], isCreditCard: boolean): ParsedTransaction[] {
  const transactions: ParsedTransaction[] = [];
  const startLine = format.hasHeader ? (format.headerRows || 1) : 0;
  
  for (let i = startLine; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line) continue;
    
    const columns = parseCSVLine(line, format.delimiter || ',');
    if (columns.length < 4) continue;
    
    const fecha = parseDate(columns[0], format.dateFormat);
    const comentario = columns[1].replace(/['"]/g, '').trim();
    const { value: ingresoValue } = parseAmount(columns[2], format);
    const { value: gastoValue } = parseAmount(columns[3], format);
    
    if (ingresoValue === 0 && gastoValue === 0) continue;
    
    const isCredit = ingresoValue > 0;
    const classification = classifyTransaction(comentario, categories, isCredit, isCreditCard);
    
    let ingreso = ingresoValue;
    let gasto = gastoValue;
    
    if (isCreditCard && isCredit && classification.isReembolso) {
      gasto = ingresoValue;
      ingreso = 0;
    }
    
    transactions.push({
      fecha,
      comentario,
      ingreso,
      gasto,
      suggestedCategoryId: classification.categoryId,
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
  isCreditCard: boolean
): ParsedTransaction[] {
  const format = BANK_FORMATS.find(f => f.id === bankFormatId);
  if (!format) {
    throw new Error(`Formato de banco no reconocido: ${bankFormatId}`);
  }
  
  const lines = content.split('\n').filter(line => line.trim());
  
  switch (bankFormatId) {
    case 'hsbc':
      return parseHSBC(lines, format, categories, isCreditCard);
    case 'amex':
      return parseAMEX(lines, format, categories, isCreditCard);
    case 'ing':
      return parseING(lines, format, categories, isCreditCard);
    case 'mastercard_tc':
      return parseMasterCard(lines, format, categories, isCreditCard);
    case 'generic':
    default:
      return parseGeneric(lines, format, categories, isCreditCard);
  }
}
