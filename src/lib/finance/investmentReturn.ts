import { Investment, InvestmentValuation } from '@/types/investments';
import type { ConvertCurrency, CurrencyCode } from './dashboardMetrics';
import { toCurrencyCode } from './currency';

export interface InvestmentReturn {
  /** Capital de referencia: monto_invertido, si no la primera valuación, si no el saldo de la cuenta vinculada. */
  invertido: number;
  /** Valor actual (valor_actual ya viene sobreescrito por useInvestments). */
  valor: number;
  /** valor − base, donde base es la primera valuación si hay más de una, si no `invertido`. */
  delta: number;
  /** delta / base × 100; 0 si base es 0. */
  pct: number;
  /** Última valuación por fecha, si existe. */
  ultima?: InvestmentValuation;
}

/**
 * Misma fórmula que usaba Inversiones.tsx en línea: rendimiento de una inversión
 * a partir de sus valuaciones. No muta `valuations`.
 */
export const investmentReturn = (inv: Investment, valuations: InvestmentValuation[]): InvestmentReturn => {
  const valsInv = valuations
    .filter((v) => v.inversion_id === inv.id)
    .sort((a, b) => a.fecha.localeCompare(b.fecha));
  const primera = valsInv[0];
  const ultima = valsInv[valsInv.length - 1];
  const invertido = inv.monto_invertido || (primera ? primera.valor : inv.saldo_cuenta ?? 0);
  const valor = inv.valor_actual || invertido || 0;
  const base = primera && valsInv.length > 1 ? primera.valor : invertido;
  const delta = valor - base;
  const pct = base ? (delta / base) * 100 : 0;
  return { invertido, valor, delta, pct, ultima };
};

/** Valor actual: última valuación; si no hay, saldo de la cuenta vinculada; si no, valor_actual o monto_invertido. */
export const valorActualInversion = (
  inv: { id: string; valor_actual: number; monto_invertido: number },
  valuations: { inversion_id: string; fecha: string; valor: number }[],
  saldoCuenta: number | undefined,
): number => {
  const ultima = valuations
    .filter((v) => v.inversion_id === inv.id)
    .sort((a, b) => a.fecha.localeCompare(b.fecha))
    .slice(-1)[0];
  return ultima?.valor ?? (saldoCuenta !== undefined ? saldoCuenta : inv.valor_actual || inv.monto_invertido || 0);
};

/** Invertido y valor de las inversiones activas, convertidos a `currency` (como InversionesMovil). */
export const totalesInversiones = (
  invs: { activa?: boolean; moneda: string; monto_invertido: number; valor_actual: number }[],
  convertCurrency: ConvertCurrency,
  currency: CurrencyCode,
): { invertido: number; valor: number } =>
  invs
    .filter((i) => i.activa !== false)
    .reduce(
      (acc, i) => {
        const de = toCurrencyCode(i.moneda, currency);
        acc.invertido += de === currency ? i.monto_invertido || 0 : convertCurrency(i.monto_invertido || 0, de, currency);
        const valor = i.valor_actual || i.monto_invertido || 0;
        acc.valor += de === currency ? valor : convertCurrency(valor, de, currency);
        return acc;
      },
      { invertido: 0, valor: 0 },
    );
