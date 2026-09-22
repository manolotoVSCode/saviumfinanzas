import { describe, expect, it } from 'vitest';
import { Category, Transaction } from '@/types/finance';
import { annualPaymentAlerts, categorySpikeAlerts, subscriptionIncreaseAlerts } from './alerts';

// "Hoy" fijo: 20 de septiembre de 2026 → corte de datos 31 de agosto
const NOW = new Date(2026, 8, 20);
// Transaction.fecha real es medianoche UTC
const utc = (y: number, m: number, d: number) => new Date(Date.UTC(y, m, d));

const cat = (over: Partial<Category>): Category => ({ id: 'c1', categoria: 'Casa', subcategoria: 'Luz', tipo: 'Gastos', ...over });
const tx = (over: Partial<Transaction>): Transaction => ({
  id: 't', cuentaId: 'a1', fecha: utc(2026, 7, 5), comentario: '', ingreso: 0, gasto: 0,
  monto: 0, subcategoriaId: 'c1', divisa: 'MXN', ...over,
});

describe('annualPaymentAlerts', () => {
  const seguro = cat({ id: 'seg', categoria: 'Seguros', subcategoria: 'Seguro coche', frecuencia_seguimiento: 'anual' });
  const pago = (fecha: Date) => [tx({ subcategoriaId: 'seg', gasto: 12000, comentario: 'SEGURO AUTO', fecha })];

  it('avisa cuando el próximo pago (último + 1 año) cae en ≤15 días desde hoy', () => {
    const [a] = annualPaymentAlerts([seguro], pago(new Date(2025, 8, 25)), new Set(), NOW);
    expect(a).toBeDefined();
    expect(a.detail).toContain('vence en 5 días');
    expect(a.amount).toBe(12000);
    expect(a.severity).toBe('media');
    expect(a.key).toBe('pago_anual:seg-seguro auto:2026-09-25');
  });

  it('un vencimiento pasado dentro del mes en curso no alerta (pendiente de importar)', () => {
    expect(annualPaymentAlerts([seguro], pago(new Date(2025, 8, 5)), new Set(), NOW)).toHaveLength(0);
  });

  it('un vencimiento en un mes cerrado alerta (alta) si dista ≤30 días del corte', () => {
    const [a] = annualPaymentAlerts([seguro], pago(new Date(2025, 7, 5)), new Set(), NOW);
    expect(a).toBeDefined();
    expect(a.severity).toBe('alta');
    expect(a.detail).toContain('venció hace 46 días');
  });

  it('calla si el vencimiento dista más de 30 días del corte', () => {
    expect(annualPaymentAlerts([seguro], pago(new Date(2025, 6, 20)), new Set(), NOW)).toHaveLength(0);
  });

  it('no avisa si falta más de 15 días ni si el pago está marcado inactivo', () => {
    expect(annualPaymentAlerts([seguro], pago(new Date(2025, 10, 1)), new Set(), NOW)).toHaveLength(0);
    const txs = pago(new Date(2025, 8, 30));
    const [a] = annualPaymentAlerts([seguro], txs, new Set(), NOW);
    expect(annualPaymentAlerts([seguro], txs, new Set([a.key.split(':')[1]]), NOW)).toHaveLength(0);
  });

  it('un vencimiento exactamente en el corte (31 de agosto) alerta', () => {
    const [a] = annualPaymentAlerts([seguro], pago(new Date(2025, 7, 31)), new Set(), NOW);
    expect(a).toBeDefined();
  });

  it('un vencimiento a 30 días antes del corte alerta', () => {
    const [a] = annualPaymentAlerts([seguro], pago(new Date(2025, 7, 1)), new Set(), NOW);
    expect(a).toBeDefined();
  });

  it('un vencimiento a 31 días antes del corte no alerta', () => {
    expect(annualPaymentAlerts([seguro], pago(new Date(2025, 6, 31)), new Set(), NOW)).toHaveLength(0);
  });
});

describe('subscriptionIncreaseAlerts', () => {
  const netflix = { id: 's1', service_name: 'Netflix', active: true, original_comments: ['NETFLIX.COM'] };

  it('avisa cuando el último cobro supera al anterior', () => {
    const [a] = subscriptionIncreaseAlerts([netflix], [
      tx({ id: 'p1', comentario: 'NETFLIX.COM', gasto: 219, fecha: utc(2026, 6, 3) }),
      tx({ id: 'p2', comentario: 'NETFLIX.COM', gasto: 249, fecha: utc(2026, 7, 3) }),
    ]);
    expect(a.title).toBe('Netflix');
    expect(a.detail).toContain('219.00 a 249.00');
    expect(a.key).toBe('suscripcion_sube:s1:p2');
  });

  it('calla si el precio no sube, si la suscripción está inactiva o si cambia la divisa', () => {
    const igual = subscriptionIncreaseAlerts([netflix], [
      tx({ id: 'p1', comentario: 'NETFLIX.COM', gasto: 249, fecha: utc(2026, 6, 3) }),
      tx({ id: 'p2', comentario: 'NETFLIX.COM', gasto: 249, fecha: utc(2026, 7, 3) }),
    ]);
    expect(igual).toHaveLength(0);
    const inactiva = subscriptionIncreaseAlerts([{ ...netflix, active: false }], [
      tx({ id: 'p1', comentario: 'NETFLIX.COM', gasto: 1, fecha: utc(2026, 6, 3) }),
      tx({ id: 'p2', comentario: 'NETFLIX.COM', gasto: 9, fecha: utc(2026, 7, 3) }),
    ]);
    expect(inactiva).toHaveLength(0);
    const divisa = subscriptionIncreaseAlerts([netflix], [
      tx({ id: 'p1', comentario: 'NETFLIX.COM', gasto: 10, divisa: 'USD', fecha: utc(2026, 6, 3) }),
      tx({ id: 'p2', comentario: 'NETFLIX.COM', gasto: 249, divisa: 'MXN', fecha: utc(2026, 7, 3) }),
    ]);
    expect(divisa).toHaveLength(0);
  });

  it('compara el último ciclo con el ciclo anterior, no los dos últimos cobros sueltos', () => {
    const [a] = subscriptionIncreaseAlerts([netflix], [
      tx({ id: 'p1', comentario: 'NETFLIX.COM', gasto: 20, fecha: new Date('2026-07-01') }),
      tx({ id: 'p2', comentario: 'NETFLIX.COM', gasto: 100, fecha: new Date('2026-07-30') }),
      tx({ id: 'p3', comentario: 'NETFLIX.COM', gasto: 100, fecha: new Date('2026-08-08') }),
    ]);
    expect(a).toBeDefined();
    expect(a.detail).toContain('20.00 a 100.00');
  });

  it('calla si solo hay un ciclo de pagos con el mismo importe', () => {
    const unSoloCiclo = subscriptionIncreaseAlerts([netflix], [
      tx({ id: 'p2', comentario: 'NETFLIX.COM', gasto: 100, fecha: new Date('2026-07-30') }),
      tx({ id: 'p3', comentario: 'NETFLIX.COM', gasto: 100, fecha: new Date('2026-08-08') }),
    ]);
    expect(unSoloCiclo).toHaveLength(0);
  });

  it('un cambio de plan a mitad de un único ciclo también avisa (primero vs. último cargo del ciclo)', () => {
    const [a] = subscriptionIncreaseAlerts([netflix], [
      tx({ id: 'p2', comentario: 'NETFLIX.COM', gasto: 20, fecha: new Date('2026-07-30') }),
      tx({ id: 'p3', comentario: 'NETFLIX.COM', gasto: 100, fecha: new Date('2026-08-08') }),
    ]);
    expect(a).toBeDefined();
    expect(a.detail).toContain('20.00 a 100.00');
    expect(a.key).toBe('suscripcion_sube:s1:p3');
  });
});

describe('categorySpikeAlerts', () => {
  const luz = cat({ id: 'c1', categoria: 'Casa', subcategoria: 'Luz' });
  const agua = cat({ id: 'c2', categoria: 'Casa', subcategoria: 'Agua' });
  // 6 meses anteriores al mes cerrado (agosto): julio … febrero
  const history = (amount: number, months = 6) =>
    Array.from({ length: months }, (_, i) => tx({ id: `h${i}`, gasto: amount, fecha: utc(2026, 6 - i, 10) }));

  it('evalúa el último mes cerrado (agosto) contra los 12 anteriores', () => {
    const [a] = categorySpikeAlerts([luz], [...history(1000), tx({ id: 'ago', gasto: 1500 })], NOW);
    expect(a).toBeDefined();
    expect(a.title).toBe('Casa');
    expect(a.detail).toContain('agosto');
    expect(a.detail).toContain('+50%');
    expect(a.key).toBe('categoria_disparada:Casa:2026-08');
    expect(a.date).toEqual(new Date(2026, 7, 1));
    expect(a.href).toContain('monthNum=7&yearNum=2026');
  });

  it('el gasto del mes en curso (septiembre) no se evalúa', () => {
    const txs = [...history(1000), tx({ id: 'ago', gasto: 1000 }), tx({ id: 'sep', gasto: 9000, fecha: utc(2026, 8, 5) })];
    expect(categorySpikeAlerts([luz], txs, NOW)).toHaveLength(0);
  });

  it('un cargo del 1 de septiembre a medianoche UTC cuenta en septiembre, no en agosto', () => {
    const base = [...history(1000), tx({ id: 'ago', gasto: 1000 })];
    expect(categorySpikeAlerts([luz], [...base, tx({ id: 's1', gasto: 5000, fecha: new Date('2026-09-01') })], NOW)).toHaveLength(0);
    expect(categorySpikeAlerts([luz], [...history(1000), tx({ id: 'a1', gasto: 5000, fecha: new Date('2026-08-01') })], NOW)).toHaveLength(1);
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
