import { describe, expect, it } from 'vitest';
import { mapTransactions } from './queries';

const fila = (fecha: string) => ({
  id: 't1', fecha, comentario: '', ingreso: '0', gasto: '5000', subcategoria_id: 'c1',
  cuenta_id: 'a1', divisa: 'MXN', csv_id: null, created_at: '2026-09-02T10:00:00Z',
});

describe('mapTransactions · fecha', () => {
  it('un movimiento del 1 de septiembre queda en septiembre (medianoche local, no UTC)', () => {
    const [t] = mapTransactions([fila('2026-09-01')]);
    expect(t.fecha).toEqual(new Date(2026, 8, 1));
    expect(t.fecha.getMonth()).toBe(8);
    expect(t.fecha.getDate()).toBe(1);
  });

  it('el 31 de diciembre sigue en ese año', () => {
    const [t] = mapTransactions([fila('2025-12-31')]);
    expect(t.fecha.getFullYear()).toBe(2025);
    expect(t.fecha.getMonth()).toBe(11);
  });
});
