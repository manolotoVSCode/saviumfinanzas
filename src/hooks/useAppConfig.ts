import { useState, useEffect, useCallback, useMemo } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

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

export const useAppConfig = () => {
  const { user } = useAuth();
  const [currency, setCurrency] = useState<CurrencyCode>('MXN');
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    if (!user) {
      setCurrency('MXN');
      setLoaded(false);
      return;
    }

    const fetchCurrency = async () => {
      const { data, error } = await supabase
        .from('profiles')
        .select('divisa_preferida')
        .eq('user_id', user.id)
        .single();

      if (!error && data) {
        setCurrency(data.divisa_preferida as CurrencyCode);
      }
      setLoaded(true);
    };

    fetchCurrency();
  }, [user]);

  const config: AppConfig = useMemo(() => ({ currency }), [currency]);

  const formatCurrency = useCallback(
    (amount: number): string => formatNumber(amount, 2),
    []
  );

  return useMemo(() => ({
    config,
    configLoaded: loaded,
    formatCurrency,
    formatNumber,
    formatPercent,
  }), [config, loaded, formatCurrency]);
};
