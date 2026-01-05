/**
 * Utilidades de formateo de números
 * Formato estándar: coma (,) para miles, punto (.) para decimales
 * Ejemplo: 1,234.56
 */

/**
 * Formatea un número con separador de miles (coma) y decimales (punto)
 * @param amount - El número a formatear
 * @param decimals - Número de decimales (por defecto 2)
 * @returns String formateado
 */
export const formatNumber = (amount: number, decimals: number = 2): string => {
  return new Intl.NumberFormat('en-US', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  }).format(amount);
};

/**
 * Formatea un número como moneda (sin símbolo, solo el número formateado)
 * @param amount - El número a formatear
 * @returns String formateado con 2 decimales
 */
export const formatCurrency = (amount: number): string => {
  return formatNumber(amount, 2);
};

/**
 * Formatea un número con símbolo de moneda
 * @param amount - El número a formatear
 * @param currency - Código de moneda (MXN, USD, EUR)
 * @returns String formateado con símbolo
 */
export const formatCurrencyWithSymbol = (amount: number, currency: 'MXN' | 'USD' | 'EUR' = 'MXN'): string => {
  const symbols = { MXN: '$', USD: '$', EUR: '€' };
  return `${symbols[currency]}${formatNumber(amount, 2)}`;
};

/**
 * Formatea un número con el código de moneda al final
 * @param amount - El número a formatear
 * @param currency - Código de moneda
 * @returns String formateado con código de moneda
 */
export const formatCurrencyWithCode = (amount: number, currency: string): string => {
  return `${formatNumber(amount, 2)} ${currency}`;
};

/**
 * Formatea un porcentaje
 * @param value - El valor del porcentaje
 * @param decimals - Número de decimales (por defecto 2)
 * @returns String formateado con símbolo %
 */
export const formatPercent = (value: number, decimals: number = 2): string => {
  return `${formatNumber(value, decimals)}%`;
};

/**
 * Formatea un número para criptomonedas (más decimales para valores pequeños)
 * @param amount - El número a formatear
 * @returns String formateado
 */
export const formatCryptoAmount = (amount: number): string => {
  if (amount === 0) return '0.00';
  if (Math.abs(amount) < 0.01) {
    return new Intl.NumberFormat('en-US', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 8,
    }).format(amount);
  }
  return formatNumber(amount, 2);
};
