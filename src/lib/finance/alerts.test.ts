import { describe, expect, it } from 'vitest';
import { Category, Transaction } from '@/types/finance';
import { annualPaymentAlerts, categorySpikeAlerts, subscriptionIncreaseAlerts } from './alerts';

const NOW = new Date(2026, 8, 15); // 15 sep 2026

const cat = (over: Partial<Category>): Category => ({ id: 'c1', categoria: 'Casa', subcategoria: 'Luz', tipo: 'Gastos', ...over });
const tx = (over: Partial<Transaction>): Transaction => ({
  id: 't', cuentaId: 'a1', fecha: new Date(2026, 8, 5), comentario: '', ingreso: 0, gasto: 0,
  monto: 0, subcategoriaId: 'c1', divisa: 'MXN', ...over,
});

describe('annualPaymentAlerts', () => {
  const seguro = cat({ id: 'seg', categoria: 'Seguros', subcategoria: 'Seguro coche', frecuencia_seguimiento: 'anual' });

  it('avisa cuando el próximo pago (último + 1 año) cae en ≤15 días', () => {
    const [a] = annualPaymentAlerts([seguro], [tx({ subcategoriaId: 'seg', gasto: 12000, comentario: 'SEGURO AUTO 2025', fecha: new Date(2025, 8, 25) })], new Set(), NOW);
    expect(a).toBeDefined();
    expect(a.detail).toContain('vence en 10 días');
    expect(a.amount).toBe(12000);
    expect(a.severity).toBe('media');
  });

  it('marca como alta un pago ya vencido y calla si venció hace más de 30 días', () => {
    const vencido = annualPaymentAlerts([seguro], [tx({ subcategoriaId: 'seg', gasto: 1, comentario: 'X', fecha: new Date(2025, 8, 10) })], new Set(), NOW);
    expect(vencido[0].severity).toBe('alta');
    expect(vencido[0].detail).toContain('venció hace 5 días');
    const viejo = annualPaymentAlerts([seguro], [tx({ subcategoriaId: 'seg', gasto: 1, comentario: 'X', fecha: new Date(2025, 6, 1) })], new Set(), NOW);
    expect(viejo).toHaveLength(0);
  });

  it('no avisa si falta más de 15 días ni si el pago está marcado inactivo', () => {
    const lejos = annualPaymentAlerts([seguro], [tx({ subcategoriaId: 'seg', gasto: 1, comentario: 'X', fecha: new Date(2025, 10, 1) })], new Set(), NOW);
    expect(lejos).toHaveLength(0);
    const txs = [tx({ subcategoriaId: 'seg', gasto: 1, comentario: 'X', fecha: new Date(2025, 8, 20) })];
    const [a] = annualPaymentAlerts([seguro], txs, new Set(), NOW);
    expect(annualPaymentAlerts([seguro], txs, new Set([a.key.split(':')[1]]), NOW)).toHaveLength(0);
  });
});

describe('subscriptionIncreaseAlerts', () => {
  const netflix = { id: 's1', serviceName: 'Netflix', active: true, originalComments: ['NETFLIX.COM'] };

  it('avisa cuando el último cobro supera al anterior', () => {
    const [a] = subscriptionIncreaseAlerts([netflix], [
      tx({ id: 'p1', comentario: 'NETFLIX.COM', gasto: 219, fecha: new Date(2026, 7, 3) }),
      tx({ id: 'p2', comentario: 'NETFLIX.COM', gasto: 249, fecha: new Date(2026, 8, 3) }),
    ]);
    expect(a.title).toBe('Netflix');
    expect(a.detail).toContain('219.00 a 249.00');
    expect(a.key).toBe('suscripcion_sube:s1:p2');
  });

  it('calla si el precio no sube, si la suscripción está inactiva o si cambia la divisa', () => {
    const igual = subscriptionIncreaseAlerts([netflix], [
      tx({ id: 'p1', comentario: 'NETFLIX.COM', gasto: 249, fecha: new Date(2026, 7, 3) }),
      tx({ id: 'p2', comentario: 'NETFLIX.COM', gasto: 249, fecha: new Date(2026, 8, 3) }),
    ]);
    expect(igual).toHaveLength(0);
    const inactiva = subscriptionIncreaseAlerts([{ ...netflix, active: false }], [
      tx({ id: 'p1', comentario: 'NETFLIX.COM', gasto: 1, fecha: new Date(2026, 7, 3) }),
      tx({ id: 'p2', comentario: 'NETFLIX.COM', gasto: 9, fecha: new Date(2026, 8, 3) }),
    ]);
    expect(inactiva).toHaveLength(0);
    const divisa = subscriptionIncreaseAlerts([netflix], [
      tx({ id: 'p1', comentario: 'NETFLIX.COM', gasto: 10, divisa: 'USD', fecha: new Date(2026, 7, 3) }),
      tx({ id: 'p2', comentario: 'NETFLIX.COM', gasto: 249, divisa: 'MXN', fecha: new Date(2026, 8, 3) }),
    ]);
    expect(divisa).toHaveLength(0);
  });
});

describe('categorySpikeAlerts', () => {
  const luz = cat({ id: 'c1', categoria: 'Casa', subcategoria: 'Luz' });
  const agua = cat({ id: 'c2', categoria: 'Casa', subcategoria: 'Agua' });
  const history = (amount: number, months = 6) =>
    Array.from({ length: months }, (_, i) => tx({ id: `h${i}`, gasto: amount, fecha: new Date(2026, 7 - i, 10) }));

  it('avisa cuando el mes en curso supera el 140% de la media de los meses anteriores', () => {
    const [a] = categorySpikeAlerts([luz], [...history(1000), tx({ id: 'now', gasto: 1500 })], NOW);
    expect(a).toBeDefined();
    expect(a.title).toBe('Casa');
    expect(a.detail).toContain('+50%');
    expect(a.key).toBe('categoria_disparada:Casa:2026-09');
  });

  it('agrupa subcategorías en su categoría y neta los reembolsos', () => {
    const txs = [...history(1000), tx({ id: 'a', gasto: 900 }), tx({ id: 'b', subcategoriaId: 'c2', gasto: 900 }), tx({ id: 'r', ingreso: 500 })];
    // 900 + 900 − 500 = 1300 < 1400 → no alerta
    expect(categorySpikeAlerts([luz, agua], txs, NOW)).toHaveLength(0);
    // sin reembolso: 1800 ≥ 1400 → alerta
    expect(categorySpikeAlerts([luz, agua], txs.filter(t => t.id !== 'r'), NOW)).toHaveLength(1);
  });

  it('ignora categorías con poca historia, media pequeña, anuales e inmuebles', () => {
    expect(categorySpikeAlerts([luz], [...history(1000, 2), tx({ gasto: 5000 })], NOW)).toHaveLength(0);
    expect(categorySpikeAlerts([luz], [...history(100), tx({ gasto: 400 })], NOW)).toHaveLength(0);
    const anual = cat({ id: 'c1', frecuencia_seguimiento: 'anual' });
    expect(categorySpikeAlerts([anual], [...history(1000), tx({ gasto: 5000 })], NOW)).toHaveLength(0);
    const inmueble = cat({ id: 'c1', categoria: 'Compra Venta Inmuebles' });
    expect(categorySpikeAlerts([inmueble], [...history(1000), tx({ gasto: 5000 })], NOW)).toHaveLength(0);
  });
});
