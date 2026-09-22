import { describe, expect, it } from 'vitest';
import { Account, Category, Transaction } from '@/types/finance';
import { computeCxP, CxPSubscription } from './cxp';

// "Hoy" fijo: 15 de septiembre de 2026
const NOW = new Date(2026, 8, 15);

const account = (over: Partial<Account>): Account => ({
  id: 'a1', nombre: 'Banco', tipo: 'Banco', saldoInicial: 0, saldoActual: 0, divisa: 'MXN', ...over,
});

const cat = (over: Partial<Category>): Category => ({
  id: 'c1', categoria: 'Casa', subcategoria: 'Luz', tipo: 'Gastos', ...over,
});

const tx = (over: Partial<Transaction>): Transaction => ({
  id: 't', cuentaId: 'a1', fecha: new Date(2026, 8, 5), comentario: '', ingreso: 0, gasto: 0,
  monto: 0, subcategoriaId: 'c1', divisa: 'MXN', ...over,
});

const sub = (over: Partial<CxPSubscription>): CxPSubscription => ({
  id: 's1', service_name: 'Netflix', active: true, frecuencia: 'Mensual', proximo_pago: '2026-09-20', ultimo_pago_monto: 199,
  ...over,
});

const base = { transactions: [] as Transaction[], categories: [] as Category[], accounts: [] as Account[], subscriptions: [] as CxPSubscription[], horizonte: 30, baseCurrency: 'MXN' as const, now: NOW };

describe('computeCxP · suscripciones', () => {
  it('incluye las activas con próximo pago dentro del horizonte, en baseCurrency', () => {
    const rows = computeCxP({ ...base, subscriptions: [
      sub({}),
      sub({ id: 's2', active: false }),
      sub({ id: 's3', proximo_pago: '2026-09-10' }),   // ya pasó
      sub({ id: 's4', proximo_pago: '2026-11-01' }),   // fuera de 30 días
    ] });
    expect(rows).toHaveLength(1);
    expect(rows[0]).toMatchObject({ id: 'sub-s1', concepto: 'Netflix', tipo: 'Suscripción', monto: 199, divisa: 'MXN', detalle: 'Mensual' });
    expect(rows[0].fechaEstimada).toEqual(new Date(2026, 8, 20)); // medianoche local, no UTC
  });

  it('una suscripción cuyo próximo pago es hoy entra en el horizonte', () => {
    // aunque `now` lleve hora: se compara contra el inicio del día
    const rows = computeCxP({ ...base, now: new Date(2026, 8, 15, 14, 30), subscriptions: [sub({ proximo_pago: '2026-09-15' })] });
    expect(rows).toHaveLength(1);
  });

  it('una fila sin divisa propia (suscripción) cae en baseCurrency', () => {
    const rows = computeCxP({ ...base, baseCurrency: 'USD', subscriptions: [sub({})] });
    expect(rows[0].divisa).toBe('USD');
  });
});

describe('computeCxP · pagos anuales', () => {
  const seguro = cat({ id: 'seg', categoria: 'Seguros', subcategoria: 'Coche', frecuencia_seguimiento: 'anual' });

  it('proyecta el último pago + 1 año con su divisa', () => {
    const rows = computeCxP({ ...base, categories: [seguro], transactions: [
      tx({ subcategoriaId: 'seg', gasto: 12000, divisa: 'USD', fecha: new Date(2025, 8, 25) }),
    ] });
    expect(rows).toHaveLength(1);
    expect(rows[0]).toMatchObject({ id: 'anual-seg', concepto: 'Seguros · Coche', tipo: 'Pago anual', monto: 12000, divisa: 'USD' });
    expect(rows[0].fechaEstimada).toEqual(new Date(2026, 8, 25));
  });

  it('rueda hacia adelante en años si la proyección ya pasó', () => {
    const rows = computeCxP({ ...base, categories: [seguro], transactions: [
      tx({ subcategoriaId: 'seg', gasto: 100, fecha: new Date(2024, 8, 20) }),
    ] });
    expect(rows[0].fechaEstimada).toEqual(new Date(2026, 8, 20));
  });

  it('respeta el horizonte: 30 días lo excluye, 60 lo incluye', () => {
    const txs = [tx({ subcategoriaId: 'seg', gasto: 100, fecha: new Date(2025, 10, 1) })]; // → 1 nov 2026
    expect(computeCxP({ ...base, categories: [seguro], transactions: txs, horizonte: 30 })).toHaveLength(0);
    expect(computeCxP({ ...base, categories: [seguro], transactions: txs, horizonte: 60 })).toHaveLength(1);
  });
});

describe('computeCxP · recurrentes', () => {
  const luz = cat({ id: 'luz', categoria: 'Hogar', subcategoria: 'Luz' });

  it('agrupa por subcategoría, detecta mensual y promedia los últimos 2 pagos', () => {
    const rows = computeCxP({ ...base, categories: [luz], transactions: [
      tx({ id: 't1', subcategoriaId: 'luz', gasto: 500, fecha: new Date(2026, 7, 10) }),
      tx({ id: 't2', subcategoriaId: 'luz', gasto: 700, fecha: new Date(2026, 6, 10) }),
    ] });
    expect(rows).toHaveLength(1);
    expect(rows[0]).toMatchObject({ id: 'rec-luz-MXN', concepto: 'Hogar · Luz', tipo: 'Recurrente mensual', monto: 600, divisa: 'MXN', detalle: 'mensual · prom. últimos 2' });
    expect(rows[0].fechaEstimada).toEqual(new Date(2026, 9, 10));
  });

  it('con un solo pago no hay recurrente', () => {
    const rows = computeCxP({ ...base, categories: [luz], transactions: [
      tx({ subcategoriaId: 'luz', gasto: 500, fecha: new Date(2026, 7, 10) }),
    ] });
    expect(rows).toHaveLength(0);
  });

  it('gaps de ~60 días se clasifican como bimensual y proyectan a +2 meses', () => {
    const rows = computeCxP({ ...base, categories: [luz], transactions: [
      tx({ id: 'a', subcategoriaId: 'luz', gasto: 400, fecha: new Date(2026, 7, 10) }), // 10 ago
      tx({ id: 'b', subcategoriaId: 'luz', gasto: 600, fecha: new Date(2026, 5, 10) }), // 10 jun
      tx({ id: 'c', subcategoriaId: 'luz', gasto: 900, fecha: new Date(2026, 3, 10) }), // 10 abr
    ] });
    expect(rows).toHaveLength(1);
    expect(rows[0]).toMatchObject({ monto: 500, detalle: 'bimensual · prom. últimos 2' });
    expect(rows[0].fechaEstimada).toEqual(new Date(2026, 9, 10));
  });

  it('gaps de ~90 días se clasifican como trimestral; solo entra con horizonte suficiente', () => {
    const txs = [
      tx({ id: 'a', subcategoriaId: 'luz', gasto: 300, fecha: new Date(2026, 8, 1) }), // 1 sep
      tx({ id: 'b', subcategoriaId: 'luz', gasto: 300, fecha: new Date(2026, 5, 1) }), // 1 jun
      tx({ id: 'c', subcategoriaId: 'luz', gasto: 300, fecha: new Date(2026, 2, 1) }), // 1 mar
    ];
    expect(computeCxP({ ...base, categories: [luz], transactions: txs, horizonte: 30 })).toHaveLength(0); // 1 dic > 15 oct
    const rows = computeCxP({ ...base, categories: [luz], transactions: txs, horizonte: 90 });
    expect(rows).toHaveLength(1);
    expect(rows[0]).toMatchObject({ monto: 300, detalle: 'trimestral · prom. últimos 2' });
    expect(rows[0].fechaEstimada).toEqual(new Date(2026, 11, 1));
  });

  it('la tolerancia se mide desde el corte de datos (fin del mes anterior), no desde hoy', () => {
    // 26 sep: el último pago (10 ago) tiene 47 días desde hoy pero solo 21 desde el corte (31 ago)
    const rows = computeCxP({ ...base, now: new Date(2026, 8, 26), categories: [luz], transactions: [
      tx({ id: 'a', subcategoriaId: 'luz', gasto: 500, fecha: new Date(2026, 7, 10) }),
      tx({ id: 'b', subcategoriaId: 'luz', gasto: 500, fecha: new Date(2026, 6, 10) }),
    ] });
    expect(rows).toHaveLength(1);
    expect(rows[0].fechaEstimada).toEqual(new Date(2026, 9, 10));
  });

  it('un recurrente mensual sin pagos en más de 45 días desde el corte se considera inactivo', () => {
    const rows = computeCxP({ ...base, categories: [luz], transactions: [
      tx({ id: 'a', subcategoriaId: 'luz', gasto: 500, fecha: new Date(2026, 6, 10) }), // 10 jul → 52 días desde el corte (31 ago)
      tx({ id: 'b', subcategoriaId: 'luz', gasto: 500, fecha: new Date(2026, 5, 10) }),
    ] });
    expect(rows).toHaveLength(0);
  });
});

describe('computeCxP · tarjetas', () => {
  it('tarjeta con saldo negativo: monto absoluto, su divisa y fecha = now + 15 días', () => {
    const rows = computeCxP({ ...base, accounts: [
      account({ id: 'tc', nombre: 'Visa', tipo: 'Tarjeta de Crédito', saldoActual: -3500, divisa: 'USD' }),
      account({ id: 'tc2', nombre: 'Amex', tipo: 'Tarjeta de Crédito', saldoActual: 100 }),
      account({ id: 'tc3', nombre: 'Vieja', tipo: 'Tarjeta de Crédito', saldoActual: -50, vendida: true }),
    ] });
    expect(rows).toHaveLength(1);
    expect(rows[0]).toMatchObject({ id: 'card-tc', concepto: 'Visa', tipo: 'Tarjeta de crédito', monto: 3500, divisa: 'USD', detalle: 'Saldo pendiente actual' });
    expect(rows[0].fechaEstimada).toEqual(new Date(2026, 8, 30));
  });

  it('una tarjeta con un saldo de céntimos de arrastre se considera saldada', () => {
    const rows = computeCxP({ ...base, accounts: [
      account({ id: 'mc', nombre: 'Mastercard', tipo: 'Tarjeta de Crédito', saldoActual: -0.004 }),
    ] });
    expect(rows).toHaveLength(0);
  });

  it('un céntimo real sí se debe', () => {
    const rows = computeCxP({ ...base, accounts: [
      account({ id: 'mc', nombre: 'Mastercard', tipo: 'Tarjeta de Crédito', saldoActual: -0.01 }),
    ] });
    expect(rows).toHaveLength(1);
  });
});

describe('computeCxP · préstamos', () => {
  const prestamo = cat({ id: 'loan', categoria: 'Finanzas', subcategoria: 'Préstamo coche' });

  it('cuota = último pago, siguiente mes, solo si el último pago tiene ≤ 45 días', () => {
    const rows = computeCxP({ ...base, categories: [prestamo], transactions: [
      tx({ subcategoriaId: 'loan', gasto: 4000, fecha: new Date(2026, 7, 20) }),
    ] });
    expect(rows).toHaveLength(1);
    expect(rows[0]).toMatchObject({ id: 'loan-loan', concepto: 'Finanzas · Préstamo coche', tipo: 'Préstamo', monto: 4000, divisa: 'MXN', detalle: 'Cuota estimada' });
    expect(rows[0].fechaEstimada).toEqual(new Date(2026, 8, 20));
  });

  it('préstamo pagado el mes anterior sigue vigente aunque hoy hayan pasado más de 45 días', () => {
    const rows = computeCxP({ ...base, now: new Date(2026, 8, 28), categories: [prestamo], transactions: [
      tx({ subcategoriaId: 'loan', gasto: 4000, fecha: new Date(2026, 7, 5) }), // 5 ago: 54 días desde hoy, 26 desde el corte
    ] });
    expect(rows).toHaveLength(1);
    expect(rows[0].fechaEstimada).toEqual(new Date(2026, 9, 5));
  });

  it('préstamo sin pagos en 45 días desde el corte se considera saldado', () => {
    const rows = computeCxP({ ...base, categories: [prestamo], transactions: [
      tx({ subcategoriaId: 'loan', gasto: 4000, fecha: new Date(2026, 5, 1) }),
    ] });
    expect(rows).toHaveLength(0);
  });
});

describe('computeCxP · orden', () => {
  it('devuelve todas las fuentes ordenadas por fecha estimada', () => {
    const rows = computeCxP({
      ...base,
      categories: [cat({ id: 'loan', categoria: 'Finanzas', subcategoria: 'Préstamo coche' })],
      transactions: [tx({ subcategoriaId: 'loan', gasto: 4000, fecha: new Date(2026, 7, 20) })], // 20 sep
      accounts: [account({ id: 'tc', tipo: 'Tarjeta de Crédito', saldoActual: -10 })],            // 30 sep
      subscriptions: [sub({ proximo_pago: '2026-10-05' })],                                        // 5 oct
    });
    expect(rows.map((r) => r.tipo)).toEqual(['Préstamo', 'Tarjeta de crédito', 'Suscripción']);
  });
});
