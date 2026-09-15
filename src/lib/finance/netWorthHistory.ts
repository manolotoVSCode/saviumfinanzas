import { Account, Transaction } from '@/types/finance';
import { ConvertCurrency, CurrencyCode } from './dashboardMetrics';

export interface NetWorthPoint {
  year: number;
  month: number; // 0-11
  /** 'Sep 2026' */
  label: string;
  activos: number;
  pasivos: number;
  patrimonio: number;
}

const MONTH_SHORT = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'];

// Misma clasificación que computeDashboardMetrics: activos por tipo (sin vendidas),
// pasivos = parte negativa del saldo de tarjetas e hipotecas.
const ASSET_TYPES = new Set(['Efectivo', 'Banco', 'Ahorros', 'Inversiones', 'Empresa Propia', 'Bien Raíz']);
const LIABILITY_TYPES = new Set(['Tarjeta de Crédito', 'Hipoteca']);

/**
 * Patrimonio neto al cierre de cada mes, reconstruido desde las transacciones:
 * saldo(cuenta, fin de mes) = saldoInicial + Σ movimientos con fecha ≤ fin de mes.
 * Los saldos se convierten a `currency` con las tasas actuales (no hay histórico
 * de tipos de cambio). Devuelve un punto por mes desde el primer movimiento
 * hasta el mes de `now`, ambos incluidos; con `months` se recorta a los últimos N.
 */
export const computeNetWorthHistory = (
  accounts: Account[],
  transactions: Transaction[],
  convertCurrency: ConvertCurrency,
  currency: CurrencyCode,
  now: Date = new Date(),
  months?: number
): NetWorthPoint[] => {
  const relevant = accounts.filter(a => (ASSET_TYPES.has(a.tipo) && !a.vendida) || LIABILITY_TYPES.has(a.tipo));
  if (relevant.length === 0) return [];
  const accountById = new Map(relevant.map(a => [a.id, a]));

  const sorted = transactions
    .filter(t => accountById.has(t.cuentaId))
    .slice()
    .sort((a, b) => a.fecha.getTime() - b.fecha.getTime());

  // Primer mes: el del movimiento más antiguo (o el actual si no hay movimientos)
  const first = sorted[0]?.fecha ?? now;
  let year = first.getFullYear();
  let month = first.getMonth();
  const endYear = now.getFullYear();
  const endMonth = now.getMonth();

  const balances = new Map<string, number>(relevant.map(a => [a.id, a.saldoInicial]));
  const points: NetWorthPoint[] = [];
  let i = 0;

  while (year < endYear || (year === endYear && month <= endMonth)) {
    const monthEnd = new Date(year, month + 1, 0, 23, 59, 59, 999);
    while (i < sorted.length && sorted[i].fecha <= monthEnd) {
      const t = sorted[i];
      balances.set(t.cuentaId, (balances.get(t.cuentaId) ?? 0) + t.monto);
      i++;
    }

    let activos = 0;
    let pasivos = 0;
    for (const a of relevant) {
      const saldo = convertCurrency(balances.get(a.id) ?? 0, a.divisa || 'MXN', currency);
      if (ASSET_TYPES.has(a.tipo)) activos += saldo;
      else pasivos += Math.abs(Math.min(0, saldo));
    }

    points.push({ year, month, label: `${MONTH_SHORT[month]} ${year}`, activos, pasivos, patrimonio: activos - pasivos });

    month++;
    if (month === 12) { month = 0; year++; }
  }

  return months && months > 0 ? points.slice(-months) : points;
};
