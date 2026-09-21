import { describe, expect, it } from 'vitest';
import { ConvertCurrency } from './dashboardMetrics';
import { computePendingsSummary, isPendingOverdue, PendingForSummary } from './pendingsSummary';

// Tasas fijas para el test: 1 USD = 20 MXN, 1 EUR = 22 MXN
const RATES = { MXN: 1, USD: 20, EUR: 22 };
const convert: ConvertCurrency = (amount, from, to) => {
  if (from === to) return amount;
  return (amount * RATES[from]) / RATES[to];
};

const NOW = new Date(2026, 8, 15);

const pending = (over: Partial<PendingForSummary>): PendingForSummary => ({
  id: 'p', monto_esperado: 100, monto_cobrado: 0, divisa: 'MXN', fecha_esperada: '2026-09-20', estado: 'pendiente', ...over,
});

describe('isPendingOverdue', () => {
  it('vencido si fecha_esperada < hoy a las 00:00 (misma regla que usePendings)', () => {
    expect(isPendingOverdue(pending({ fecha_esperada: '2026-09-10' }), NOW)).toBe(true);
    expect(isPendingOverdue(pending({ fecha_esperada: '2026-09-20' }), NOW)).toBe(false);
    expect(isPendingOverdue(pending({ fecha_esperada: null }), NOW)).toBe(false);
  });
});

describe('computePendingsSummary', () => {
  it('solo cuenta pendientes y cobrados parciales, con el restante por cobrar', () => {
    const r = computePendingsSummary([
      pending({ id: 'a', monto_esperado: 100 }),
      pending({ id: 'b', monto_esperado: 300, monto_cobrado: 120, estado: 'cobrado_parcial' }),
      pending({ id: 'c', estado: 'cobrado' }),
      pending({ id: 'd', estado: 'cancelado' }),
    ], convert, 'MXN', NOW);
    expect(r.rows.map((x) => x.pending.id)).toEqual(['a', 'b']);
    expect(r.rows[1].restante).toBe(180);
    expect(r.total).toBe(280);
  });

  it('convierte fila a fila a la divisa elegida', () => {
    const list = [
      pending({ id: 'usd', monto_esperado: 100, divisa: 'USD' }),
      pending({ id: 'mxn', monto_esperado: 500, divisa: 'MXN' }),
    ];
    expect(computePendingsSummary(list, convert, 'MXN', NOW).total).toBe(2500);
    expect(computePendingsSummary(list, convert, 'USD', NOW).total).toBe(125);
  });

  it('ordena vencidos primero, luego por fecha, y sin fecha al final', () => {
    const r = computePendingsSummary([
      pending({ id: 'sin-fecha', fecha_esperada: null }),
      pending({ id: 'futuro-lejos', fecha_esperada: '2026-10-01' }),
      pending({ id: 'vencido', fecha_esperada: '2026-09-01' }),
      pending({ id: 'futuro-cerca', fecha_esperada: '2026-09-20' }),
      pending({ id: 'muy-vencido', fecha_esperada: '2026-08-01' }),
    ], convert, 'MXN', NOW);
    expect(r.rows.map((x) => x.pending.id)).toEqual(['muy-vencido', 'vencido', 'futuro-cerca', 'futuro-lejos', 'sin-fecha']);
    expect(r.vencidos).toBe(2);
    expect(r.rows[0].vencido).toBe(true);
    expect(r.rows[2].vencido).toBe(false);
  });

  it('un pendiente con divisa desconocida se suma como si estuviera en la divisa elegida', () => {
    const r = computePendingsSummary([pending({ id: 'x', monto_esperado: 100, divisa: 'GBP' })], convert, 'MXN', NOW);
    expect(r.total).toBe(100);
  });
});
