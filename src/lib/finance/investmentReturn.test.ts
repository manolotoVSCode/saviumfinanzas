import { describe, expect, it } from 'vitest';
import { Investment, InvestmentValuation } from '@/types/investments';
import { investmentReturn } from './investmentReturn';

const inv = (over: Partial<Investment>): Investment => ({
  id: 'i1', user_id: 'u', nombre: 'Cetes', tipo: 'Renta fija', tipo_id: null,
  monto_invertido: 0, valor_actual: 0, rendimiento_bruto: null, rendimiento_neto: null,
  tasa_anual: null, modalidad: 'Reinversión', modalidad_pago: null, moneda: 'MXN',
  fecha_inicio: '2026-01-01', fecha_vencimiento: null, ultimo_pago: null, cuenta_id: null,
  beneficio_estimado: null, notas: null, activa: true, saldo_cuenta: null,
  ...over,
});

const val = (over: Partial<InvestmentValuation>): InvestmentValuation => ({
  id: 'v', user_id: 'u', inversion_id: 'i1', fecha: '2026-01-01', valor: 0, aportacion: 0, retiro: 0, notas: null,
  ...over,
} as InvestmentValuation);

describe('investmentReturn', () => {
  it('con una sola valuación la base es monto_invertido y ultima es esa valuación', () => {
    const r = investmentReturn(
      inv({ monto_invertido: 1000, valor_actual: 1200 }),
      [val({ id: 'v1', fecha: '2026-03-01', valor: 1200 })],
    );
    expect(r.invertido).toBe(1000);
    expect(r.valor).toBe(1200);
    expect(r.delta).toBe(200);
    expect(r.pct).toBe(20);
    expect(r.ultima?.id).toBe('v1');
  });

  it('con varias valuaciones la base es la primera por fecha y ultima la más reciente', () => {
    const r = investmentReturn(
      inv({ monto_invertido: 1000, valor_actual: 1300 }),
      [
        val({ id: 'v2', fecha: '2026-06-01', valor: 1300 }),
        val({ id: 'v1', fecha: '2026-01-01', valor: 1100 }),
        val({ id: 'otra', inversion_id: 'i2', fecha: '2025-01-01', valor: 5 }),
      ],
    );
    expect(r.invertido).toBe(1000);
    expect(r.valor).toBe(1300);
    expect(r.delta).toBe(200);
    expect(r.pct).toBeCloseTo(18.1818, 3);
    expect(r.ultima?.id).toBe('v2');
  });

  it('sin monto_invertido usa la primera valuación como invertido', () => {
    const r = investmentReturn(
      inv({ monto_invertido: 0, valor_actual: 500 }),
      [val({ fecha: '2026-02-01', valor: 500 })],
    );
    expect(r.invertido).toBe(500);
    expect(r.valor).toBe(500);
    expect(r.delta).toBe(0);
    expect(r.pct).toBe(0);
  });

  it('sin monto_invertido ni valuaciones usa saldo_cuenta', () => {
    const r = investmentReturn(inv({ monto_invertido: 0, valor_actual: 800, saldo_cuenta: 800 }), []);
    expect(r.invertido).toBe(800);
    expect(r.delta).toBe(0);
    expect(r.ultima).toBeUndefined();
  });

  it('con base cero el porcentaje es 0 y no NaN', () => {
    const r = investmentReturn(inv({ monto_invertido: 0, valor_actual: 0 }), []);
    expect(r.pct).toBe(0);
    expect(r.valor).toBe(0);
  });
});
