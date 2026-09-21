import { CurrencyCode } from './dashboardMetrics';

const CODES: readonly CurrencyCode[] = ['MXN', 'USD', 'EUR'];

/** Normaliza un código de divisa libre (BD) a uno soportado; si no lo es, devuelve `fallback`. */
export const toCurrencyCode = (value: string | null | undefined, fallback: CurrencyCode): CurrencyCode =>
  (CODES as readonly string[]).includes(value ?? '') ? (value as CurrencyCode) : fallback;
