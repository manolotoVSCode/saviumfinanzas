import { CurrencyCode } from './dashboardMetrics';

const CODES: readonly CurrencyCode[] = ['MXN', 'USD', 'EUR'];

/** Normaliza un código de divisa libre (BD) a uno soportado; si no lo es, devuelve `fallback`. */
export const toCurrencyCode = (value: string | null | undefined, fallback: CurrencyCode): CurrencyCode =>
  (CODES as readonly string[]).includes(value ?? '') ? (value as CurrencyCode) : fallback;

/** Tasas en MXN por unidad de cada divisa (MXN = 1). */
export type Tasas = Record<CurrencyCode, number>;

/** Conversión entre divisas pasando siempre por MXN. Misma regla en la app iOS (shared/fixtures/divisas.json). */
export const convertWithRates = (amount: number, from: CurrencyCode, to: CurrencyCode, tasas: Tasas): number => {
  if (from === to) return amount;
  const enMXN = from !== 'MXN' ? amount * tasas[from] : amount;
  return to === 'MXN' ? enMXN : enMXN / tasas[to];
};
