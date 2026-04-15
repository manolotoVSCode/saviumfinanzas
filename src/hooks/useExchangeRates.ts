import { useState, useEffect, useCallback, useRef } from 'react';

export interface ExchangeRates {
  USD: number;
  EUR: number;
  MXN: number;
}

// Singleton cache to avoid multiple API calls across components
let cachedRates: ExchangeRates | null = null;
let cacheTimestamp = 0;
let fetchPromise: Promise<ExchangeRates> | null = null;
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes

const DEFAULT_RATES: ExchangeRates = { USD: 20, EUR: 22, MXN: 1 };

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

async function getOrFetchRates(): Promise<ExchangeRates> {
  const now = Date.now();
  if (cachedRates && now - cacheTimestamp < CACHE_TTL) {
    return cachedRates;
  }
  // Deduplicate concurrent calls
  if (!fetchPromise) {
    fetchPromise = fetchRatesFromAPI().then(rates => {
      cachedRates = rates;
      cacheTimestamp = Date.now();
      fetchPromise = null;
      return rates;
    });
  }
  return fetchPromise;
}

export const useExchangeRates = () => {
  const [rates, setRates] = useState<ExchangeRates>(cachedRates || DEFAULT_RATES);
  const [loading, setLoading] = useState(!cachedRates);
  const [error, setError] = useState<string | null>(null);
  const intervalRef = useRef<ReturnType<typeof setInterval>>();

  useEffect(() => {
    let mounted = true;

    const load = async () => {
      try {
        const newRates = await getOrFetchRates();
        if (mounted) {
          setRates(newRates);
          setError(null);
          setLoading(false);
        }
      } catch (err) {
        if (mounted) {
          setError(err instanceof Error ? err.message : 'Error desconocido');
          setLoading(false);
        }
      }
    };

    load();

    // Refresh every 5 minutes
    intervalRef.current = setInterval(load, CACHE_TTL);
    return () => {
      mounted = false;
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, []);

  // Stable convertCurrency function
  const convertCurrency = useCallback(
    (amount: number, fromCurrency: 'MXN' | 'USD' | 'EUR', toCurrency: 'MXN' | 'USD' | 'EUR'): number => {
      if (fromCurrency === toCurrency) return amount;
      let amountInMXN = fromCurrency !== 'MXN' ? amount * rates[fromCurrency] : amount;
      return toCurrency === 'MXN' ? amountInMXN : amountInMXN / rates[toCurrency];
    },
    [rates]
  );

  const refreshRates = useCallback(async () => {
    cachedRates = null; // Force refresh
    const newRates = await getOrFetchRates();
    setRates(newRates);
  }, []);

  return { rates, loading, error, convertCurrency, refreshRates };
};
