import { useCallback } from 'react';
import { useQuery } from '@tanstack/react-query';
import { EXCHANGE_RATES_KEY, STALE_TIME } from '@/lib/finance/queryKeys';

export interface ExchangeRates {
  USD: number;
  EUR: number;
  MXN: number;
}

const DEFAULT_RATES: ExchangeRates = { USD: 20, EUR: 22, MXN: 1 };

/** Devuelve DEFAULT_RATES si la API falla: la app nunca se queda sin tasas. */
async function fetchRatesFromAPI(): Promise<ExchangeRates> {
  try {
    const response = await fetch('https://api.exchangerate-api.com/v4/latest/MXN');
    if (!response.ok) throw new Error('Error al obtener las tasas de cambio');
    const data = await response.json();
    return {
      MXN: 1,
      USD: 1 / data.rates.USD,
      EUR: 1 / data.rates.EUR,
    };
  } catch {
    return DEFAULT_RATES;
  }

}

/**
 * Tasas MXN↔USD/EUR en la caché de TanStack Query (clave sin usuario): una sola
 * petición para toda la app. Se consideran frescos 5 min; al volver a la pestaña
 * pasado ese tiempo se refrescan (sin refetchInterval: cada observador crearía
 * su propio intervalo). Sustituye al singleton cachedRates/fetchPromise.
 */
export const useExchangeRates = () => {
  const query = useQuery({
    queryKey: EXCHANGE_RATES_KEY,
    queryFn: fetchRatesFromAPI,
    staleTime: STALE_TIME,
    // Sin refetchInterval: cada observador (11 archivos + useFinanceDataSupabase) crearía su propio
    // intervalo. staleTime + refetchOnWindowFocus (por defecto) ya refresca al volver a la pestaña.
    retry: false,
  });
  const rates = query.data ?? DEFAULT_RATES;

  const convertCurrency = useCallback(
    (amount: number, fromCurrency: 'MXN' | 'USD' | 'EUR', toCurrency: 'MXN' | 'USD' | 'EUR'): number => {
      if (fromCurrency === toCurrency) return amount;
      const amountInMXN = fromCurrency !== 'MXN' ? amount * rates[fromCurrency] : amount;
      return toCurrency === 'MXN' ? amountInMXN : amountInMXN / rates[toCurrency];
    },
    [rates]
  );

  const refreshRates = useCallback(async () => {
    await query.refetch();
  }, [query.refetch]);

  return {
    rates,
    loading: query.isPending,
    error: query.error ? (query.error instanceof Error ? query.error.message : 'Error desconocido') : null,
    convertCurrency,
    refreshRates,
  };
};
