/** Patrón de suscripción conocida. Todas las keywords deben aparecer en el comentario. */
export interface SubscriptionPattern {
  id: string;
  serviceName: string;
  tipoServicio: string;
  /** Palabras clave que DEBE contener el comentario (todas deben coincidir) */
  keywords: string[];
  /** Palabras que NO debe contener el comentario (excluir falsos positivos) */
  excludeKeywords?: string[];
  /** Monto esperado — si se define, solo acepta transacciones a ±15% de este valor */
  expectedAmount?: number;
  frecuenciaDefault?: 'Mensual' | 'Anual' | 'Irregular';
}

export const SUBSCRIPTION_PATTERNS: SubscriptionPattern[] = [
  { id: 'amazon-prime', serviceName: 'Amazon Prime', tipoServicio: 'Streaming y envíos', keywords: ['amazon', 'retail'], excludeKeywords: ['marketplace'], expectedAmount: 99 },
  { id: 'spotify', serviceName: 'Spotify', tipoServicio: 'Streaming de música', keywords: ['spotify'] },
  { id: 'rotoplas', serviceName: 'Rotoplas', tipoServicio: 'Servicio de agua', keywords: ['rotoplas'], expectedAmount: 399 },
  { id: 'netflix', serviceName: 'Netflix', tipoServicio: 'Streaming de video', keywords: ['netflix'] },
  { id: 'chatgpt', serviceName: 'ChatGPT', tipoServicio: 'Inteligencia Artificial', keywords: ['openai', 'chatgpt'] },
  { id: 'apple', serviceName: 'Apple', tipoServicio: 'Servicios Apple', keywords: ['apple', 'com/bill'] },
  { id: 'google-nest', serviceName: 'Google Nest', tipoServicio: 'Dispositivos inteligentes', keywords: ['google', 'nest'] },
  { id: 'google-one', serviceName: 'Google One', tipoServicio: 'Almacenamiento en la nube', keywords: ['google', 'one'] },
  { id: 'youtube-premium', serviceName: 'YouTube Premium', tipoServicio: 'Streaming de video', keywords: ['google', 'youtube'] },
  { id: 'lovable', serviceName: 'Lovable', tipoServicio: 'Desarrollo de software', keywords: ['lovable'] },
  { id: 'opus-clip', serviceName: 'Opus Clip', tipoServicio: 'Edición de video', keywords: ['opus'] },
  { id: 'github', serviceName: 'GitHub', tipoServicio: 'Desarrollo de software', keywords: ['github'] },
  { id: 'microsoft', serviceName: 'Microsoft', tipoServicio: 'Software y servicios', keywords: ['msbill'] },
  { id: 'microsoft', serviceName: 'Microsoft', tipoServicio: 'Software y servicios', keywords: ['microsoft'] },
  { id: 'microsoft', serviceName: 'Microsoft', tipoServicio: 'Software y servicios', keywords: ['msft'] },
  { id: 'microsoft', serviceName: 'Microsoft', tipoServicio: 'Software y servicios', keywords: ['xbox'] },
  { id: 'microsoft', serviceName: 'Microsoft', tipoServicio: 'Software y servicios', keywords: ['office365'] },
  { id: 'microsoft', serviceName: 'Microsoft', tipoServicio: 'Software y servicios', keywords: ['office 365'] },
  { id: 'microsoft', serviceName: 'Microsoft', tipoServicio: 'Software y servicios', keywords: ['onedrive'] },
];

/** Todas las keywords presentes, ninguna exclusión y, si hay expectedAmount, monto a ±15%. */
export const matchTransactionToPattern = (comentario: string, monto: number, pattern: SubscriptionPattern): boolean => {
  const lower = comentario.toLowerCase();

  const allKeywordsMatch = pattern.keywords.every(kw => lower.includes(kw.toLowerCase()));
  if (!allKeywordsMatch) return false;

  if (pattern.excludeKeywords) {
    const anyExcluded = pattern.excludeKeywords.some(kw => lower.includes(kw.toLowerCase()));
    if (anyExcluded) return false;
  }

  if (pattern.expectedAmount) {
    const tolerance = pattern.expectedAmount * 0.15;
    if (Math.abs(monto - pattern.expectedAmount) > tolerance) return false;
  }

  return true;
};
