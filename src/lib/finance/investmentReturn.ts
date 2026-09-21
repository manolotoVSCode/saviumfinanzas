import { Investment, InvestmentValuation } from '@/types/investments';

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
