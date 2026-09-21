import { useCallback, useMemo } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useUserProfile } from './useUserProfile';

export type CurrencyCode = 'MXN' | 'USD' | 'EUR';

interface AppConfig {
  currency: CurrencyCode;
}

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

/**
 * Divisa preferida y formateadores. Lee la misma query `perfil` que useUserProfile:
 * una sola petición a profiles por sesión aunque lo monten 18 componentes.
 */
export const useAppConfig = () => {
  const { user } = useAuth();
  const { profile, loading } = useUserProfile();

  const currency = (profile?.divisa_preferida as CurrencyCode | undefined) ?? 'MXN';
  const config: AppConfig = useMemo(() => ({ currency }), [currency]);

  // true cuando la query terminó (con fila o con error: un perfil ausente no
  // debe dejar el móvil en loader infinito); false sin sesión.
  const configLoaded = !!user && !loading;

  const formatCurrency = useCallback(
    (amount: number): string => formatNumber(amount, 2),
    []
  );

  return useMemo(() => ({
    config,
    configLoaded,
    formatCurrency,
    formatNumber,
    formatPercent,
  }), [config, configLoaded, formatCurrency]);
};
