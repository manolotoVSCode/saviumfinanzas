import { useMemo } from 'react';

export type CurrencyCode = 'MXN' | 'USD' | 'EUR';

interface AppConfig {
  currency: CurrencyCode;
}

const defaultConfig: AppConfig = {
  currency: 'MXN'
};

/**
 * Formatea un número con separador de miles (coma) y decimales (punto)
 * Siempre muestra 2 decimales: 1,234.56
 */
export const formatNumber = (amount: number, decimals: number = 2): string => {
  return new Intl.NumberFormat('en-US', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  }).format(amount);
};

/**
 * Formatea un porcentaje con el formato estándar
 * Ejemplo: 12.34%
 */
export const formatPercent = (value: number, decimals: number = 2): string => {
  return `${formatNumber(value, decimals)}%`;
};

// Stable singleton - returned object never changes
const stableResult = {
  config: defaultConfig,
  formatCurrency: (amount: number): string => formatNumber(amount, 2),
  formatNumber,
  formatPercent,
};

export const useAppConfig = () => {
  return stableResult;
};
