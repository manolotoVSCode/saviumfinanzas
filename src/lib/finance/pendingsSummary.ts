import { ConvertCurrency, CurrencyCode } from './dashboardMetrics';

export interface PendingForSummary {
  id: string;
  monto_esperado: number;
  monto_cobrado: number;
  divisa: string;
  fecha_esperada: string | null;
  estado: string;
}

export interface PendingRow<T extends PendingForSummary> {
  pending: T;
  /** monto_esperado − monto_cobrado, en la divisa del pendiente. */
  restante: number;
  vencido: boolean;
}

export interface PendingsSummary<T extends PendingForSummary> {
  /** Activos, vencidos primero y luego por fecha esperada (sin fecha al final). */
  rows: PendingRow<T>[];
  /** Suma de restantes convertidos a `currency`. */
  total: number;
  vencidos: number;
}

export const isPendingActive = (p: { estado: string }): boolean =>
  p.estado === 'pendiente' || p.estado === 'cobrado_parcial';

/** Misma regla que usePendings.overdueCount: fecha_esperada < hoy a las 00:00 local. */
export const isPendingOverdue = (p: { fecha_esperada: string | null }, now: Date): boolean => {
  const today = new Date(now);
  today.setHours(0, 0, 0, 0);
  return !!p.fecha_esperada && new Date(p.fecha_esperada) < today;
};

export const computePendingsSummary = <T extends PendingForSummary>(
  pendings: T[],
  convertCurrency: ConvertCurrency,
  currency: CurrencyCode,
  now: Date = new Date(),
): PendingsSummary<T> => {
  const rows: PendingRow<T>[] = pendings
    .filter(isPendingActive)
    .map((p) => ({
      pending: p,
      restante: p.monto_esperado - (p.monto_cobrado ?? 0),
      vencido: isPendingOverdue(p, now),
    }))
    .sort((a, b) => {
      if (a.vencido !== b.vencido) return a.vencido ? -1 : 1;
      const fa = a.pending.fecha_esperada;
      const fb = b.pending.fecha_esperada;
      if (!fa && !fb) return 0;
      if (!fa) return 1;
      if (!fb) return -1;
      return fa.localeCompare(fb);
    });

  const total = rows.reduce(
    (sum, r) => sum + convertCurrency(r.restante, r.pending.divisa as CurrencyCode, currency),
    0,
  );

  return { rows, total, vencidos: rows.filter((r) => r.vencido).length };
};
