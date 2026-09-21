import { createContext, useCallback, useContext, useMemo, useState } from 'react';
import { useAppConfig } from '@/hooks/useAppConfig';
import type { CurrencyCode } from '@/lib/finance/dashboardMetrics';

export const MOBILE_CURRENCY_KEY = 'savium.movil.divisa';
export const MOBILE_CURRENCIES: CurrencyCode[] = ['MXN', 'USD', 'EUR'];

interface MobileCurrencyContextValue {
  /** Divisa a usar. Mientras `ready` es false vale 'MXN' provisional: no calcular nada con ella. */
  currency: CurrencyCode;
  /** true cuando hay elección guardada o ya llegó la divisa del perfil. */
  ready: boolean;
  setCurrency: (c: CurrencyCode) => void;
}

const MobileCurrencyContext = createContext<MobileCurrencyContextValue | undefined>(undefined);

const readStored = (): CurrencyCode | null => {
  try {
    const v = localStorage.getItem(MOBILE_CURRENCY_KEY);
    return v === 'MXN' || v === 'USD' || v === 'EUR' ? v : null;
  } catch {
    return null;
  }
};

/**
 * Divisa elegida para la versión móvil. Prioridad: localStorage si el usuario
 * eligió alguna vez; si no, la del perfil (config.currency) una vez configLoaded.
 * Solo se escribe en localStorage al tocar un chip, nunca al inicializar.
 * useAppConfig arranca en 'MXN' provisional hasta que carga el perfil; por eso
 * `ready` es false hasta entonces y MobileLayout muestra un loader.
 */
export const MobileCurrencyProvider = ({ children }: { children: React.ReactNode }) => {
  const { config, configLoaded } = useAppConfig();
  const [chosen, setChosen] = useState<CurrencyCode | null>(readStored);

  const setCurrency = useCallback((c: CurrencyCode) => {
    setChosen(c);
    try {
      localStorage.setItem(MOBILE_CURRENCY_KEY, c);
    } catch {
      // sin almacenamiento disponible: la elección dura la sesión
    }
  }, []);

  const value = useMemo<MobileCurrencyContextValue>(() => {
    if (chosen) return { currency: chosen, ready: true, setCurrency };
    if (configLoaded) return { currency: config.currency, ready: true, setCurrency };
    return { currency: 'MXN', ready: false, setCurrency };
  }, [chosen, configLoaded, config.currency, setCurrency]);

  return <MobileCurrencyContext.Provider value={value}>{children}</MobileCurrencyContext.Provider>;
};

export const useMobileCurrency = () => {
  const ctx = useContext(MobileCurrencyContext);
  if (!ctx) throw new Error('useMobileCurrency debe usarse dentro de MobileCurrencyProvider');
  return ctx;
};
