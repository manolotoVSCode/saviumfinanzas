import { useState, useEffect } from 'react';

export interface ExchangeRates {
  USD: number;
  EUR: number;
  MXN: number;
}

export const useExchangeRates = () => {
  const [rates, setRates] = useState<ExchangeRates>({ USD: 0, EUR: 0, MXN: 1 });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchRates = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const response = await fetch('https://api.exchangerate-api.com/v4/latest/MXN');
      
      if (!response.ok) {
        throw new Error('Error al obtener las tasas de cambio');
      }
      
      const data = await response.json();
      
      // Las tasas vienen en formato: 1 MXN = X USD/EUR
      // Necesitamos convertir a: 1 USD/EUR = X MXN
      setRates({
        MXN: 1,
        USD: 1 / data.rates.USD, // Cuántos pesos por 1 dólar
        EUR: 1 / data.rates.EUR  // Cuántos pesos por 1 euro
      });
      
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error desconocido');
      console.error('Error fetching exchange rates:', err);
      
      // Usar tasas por defecto en caso de error
      setRates({ USD: 20, EUR: 22, MXN: 1 });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRates();
    
    // Actualizar cada 5 minutos
    const interval = setInterval(fetchRates, 5 * 60 * 1000);
    
    return () => clearInterval(interval);
  }, []);

  // Función para convertir de una moneda a otra
  const convertCurrency = (amount: number, fromCurrency: 'MXN' | 'USD' | 'EUR', toCurrency: 'MXN' | 'USD' | 'EUR'): number => {
    if (fromCurrency === toCurrency) return amount;
    
    // Convertir todo a MXN primero
    let amountInMXN = amount;
    if (fromCurrency !== 'MXN') {
      amountInMXN = amount * rates[fromCurrency];
    }
    
    // Luego convertir de MXN a la moneda destino
    if (toCurrency === 'MXN') {
      return amountInMXN;
    } else {
      return amountInMXN / rates[toCurrency];
    }
  };

  return {
    rates,
    loading,
    error,
    convertCurrency,
    refreshRates: fetchRates
  };
};