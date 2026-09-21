import { describe, expect, it } from 'vitest';
import { computeSubscriptionsSummary, estimadoMensualDe } from './subscriptionsSummary';

describe('estimadoMensualDe', () => {
  it('prorratea cada frecuencia a un mes', () => {
    expect(estimadoMensualDe('Semanal', 120)).toBeCloseTo(520, 5);   // 120 × 52 / 12
    expect(estimadoMensualDe('Mensual', 200)).toBe(200);
    expect(estimadoMensualDe('Bimestral', 300)).toBe(150);
    expect(estimadoMensualDe('Trimestral', 300)).toBe(100);
    expect(estimadoMensualDe('Semestral', 600)).toBe(100);
    expect(estimadoMensualDe('Anual', 1200)).toBe(100);
  });
  it('Irregular y frecuencias desconocidas no se estiman', () => {
    expect(estimadoMensualDe('Irregular', 50)).toBeNull();
    expect(estimadoMensualDe('Quincenal', 50)).toBeNull();
  });
});

describe('computeSubscriptionsSummary', () => {
  it('suma el prorrateo y cuenta aparte las que no se pueden estimar', () => {
    const r = computeSubscriptionsSummary([
      { frecuencia: 'Semanal', ultimo_pago_monto: 100 },     // 433.33
      { frecuencia: 'Mensual', ultimo_pago_monto: 200 },     // 200
      { frecuencia: 'Bimestral', ultimo_pago_monto: 300 },   // 150
      { frecuencia: 'Trimestral', ultimo_pago_monto: 300 },  // 100
      { frecuencia: 'Semestral', ultimo_pago_monto: 600 },   // 100
      { frecuencia: 'Anual', ultimo_pago_monto: 1200 },      // 100
      { frecuencia: 'Irregular', ultimo_pago_monto: 999 },   // fuera
    ]);
    expect(r.estimadoMensual).toBeCloseTo(1083.33, 2);
    expect(r.estimadas).toBe(6);
    expect(r.sinEstimar).toBe(1);
  });
  it('con lista vacía devuelve ceros', () => {
    expect(computeSubscriptionsSummary([])).toEqual({ estimadoMensual: 0, estimadas: 0, sinEstimar: 0 });
  });
});
