import { describe, expect, it } from 'vitest';
import { Investment, InvestmentValuation } from '@/types/investments';
import { aportesCuenta, cobradoInversionesAnio, investmentReturn, totalesInversiones, valorActualInversion } from './investmentReturn';

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

  it('sin monto_invertido ni valuaciones el invertido es lo aportado por la cuenta', () => {
    const r = investmentReturn(inv({ monto_invertido: 0, valor_actual: 800, saldo_cuenta: 800, aportes_cuenta: 800 }), []);
    expect(r.invertido).toBe(800);
    expect(r.delta).toBe(0);
    expect(r.ultima).toBeUndefined();
  });

  it('las aportaciones por la cuenta suben el invertido, no el rendimiento', () => {
    // Como QUANT: 7.5M iniciales, +9M aportados, saldo 16.5M.
    const r = investmentReturn(inv({ monto_invertido: 7_500_000, valor_actual: 16_500_000, aportes_cuenta: 9_000_000 }), []);
    expect(r.invertido).toBe(16_500_000);
    expect(r.delta).toBe(0);
  });

  it('con aportes por la cuenta la base es invertido aunque haya varias valuaciones', () => {
    const r = investmentReturn(
      inv({ monto_invertido: 1000, valor_actual: 1600, aportes_cuenta: 500 }),
      [val({ id: 'v1', fecha: '2026-01-01', valor: 1000 }), val({ id: 'v2', fecha: '2026-06-01', valor: 1600 })],
    );
    expect(r.invertido).toBe(1500);
    expect(r.delta).toBe(100);
  });

  it('con base cero el porcentaje es 0 y no NaN', () => {
    const r = investmentReturn(inv({ monto_invertido: 0, valor_actual: 0 }), []);
    expect(r.pct).toBe(0);
    expect(r.valor).toBe(0);
  });
});

describe('valorActualInversion', () => {
  const inv = { id: 'i1', valor_actual: 50, monto_invertido: 40 };
  it('usa la última valuación por fecha', () => {
    const vals = [
      { inversion_id: 'i1', fecha: '2026-06-01', valor: 1200 },
      { inversion_id: 'i1', fecha: '2026-01-01', valor: 1000 },
      { inversion_id: 'otra', fecha: '2026-09-01', valor: 9 },
    ];
    expect(valorActualInversion(inv, vals, 777)).toBe(1200);
  });
  it('sin valuaciones usa el saldo de la cuenta vinculada', () => {
    expect(valorActualInversion(inv, [], 600)).toBe(600);
  });
  it('sin valuaciones ni cuenta usa valor_actual y luego monto_invertido', () => {
    expect(valorActualInversion(inv, [], undefined)).toBe(50);
    expect(valorActualInversion({ ...inv, valor_actual: 0 }, [], undefined)).toBe(40);
  });
});

describe('totalesInversiones', () => {
  const RATES = { MXN: 1, USD: 20, EUR: 22 };
  const convert = (a: number, f: 'MXN' | 'USD' | 'EUR', t: 'MXN' | 'USD' | 'EUR') => (f === t ? a : (a * RATES[f]) / RATES[t]);
  it('suma solo las activas, convertidas', () => {
    const r = totalesInversiones([
      { activa: true, moneda: 'MXN', monto_invertido: 1000, valor_actual: 1200 },
      { moneda: 'USD', monto_invertido: 500, valor_actual: 600 },
      { activa: false, moneda: 'EUR', monto_invertido: 100, valor_actual: 150 },
    ], convert, 'MXN');
    expect(r).toEqual({ invertido: 11000, valor: 13200 });
  });

  it('suma los aportes por la cuenta al invertido', () => {
    const r = totalesInversiones([
      { moneda: 'USD', monto_invertido: 500, valor_actual: 700, aportes_cuenta: 100 },
    ], convert, 'MXN');
    expect(r).toEqual({ invertido: 12000, valor: 14000 });
  });
});

describe('aportesCuenta', () => {
  it('sin cuenta vinculada es 0', () => {
    expect(aportesCuenta(1000, undefined)).toBe(0);
  });
  it('con monto_invertido solo cuenta aportaciones − retiros', () => {
    expect(aportesCuenta(1000, { saldoInicial: 1000, capitalNeto: -200 })).toBe(-200);
  });
  it('sin monto_invertido suma también el saldo inicial', () => {
    expect(aportesCuenta(0, { saldoInicial: 300, capitalNeto: 100 })).toBe(400);
  });
});

describe('cobradoInversionesAnio', () => {
  const RATES = { MXN: 1, USD: 20, EUR: 22 };
  const convert = (a: number, f: 'MXN' | 'USD' | 'EUR', t: 'MXN' | 'USD' | 'EUR') => (f === t ? a : (a * RATES[f]) / RATES[t]);
  const t = (fecha: string, ingreso: number, over: Partial<{ divisa: string; categoria: string; tipo: string; gasto: number }> = {}) => ({
    fecha: new Date(`${fecha}T00:00:00`), ingreso, gasto: 0, divisa: 'MXN', categoria: 'Inversiones', tipo: 'Ingreso', ...over,
  });
  it('suma los ingresos de Inversiones del año, convertidos', () => {
    const r = cobradoInversionesAnio([
      t('2026-01-01', 1000),
      t('2026-03-31', 50, { divisa: 'USD' }),
      t('2025-12-31', 999),                                  // otro año
      t('2026-02-01', 500, { tipo: 'Aportación' }),         // capital, no rendimiento
      t('2026-02-01', 700, { categoria: 'Sueldo' }),        // otro ingreso
    ], 2026, convert, 'MXN');
    expect(r).toBe(2000);
  });
});
