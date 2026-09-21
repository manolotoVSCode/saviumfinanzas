import { describe, expect, it } from 'vitest';
import { Category, Transaction } from '@/types/finance';
import { toFechaISO } from './fechas';
import {
  calculateNextPayment, detectFrequency, detectSubscriptions, mergeWithStored,
  previousPaymentAmount, resolveServiceName, SubscriptionRow,
} from './subscriptions';

// "Hoy" fijo: 20 de septiembre de 2026
const NOW = new Date(2026, 8, 20);

// Transaction.fecha real: new Date('YYYY-MM-DD') = medianoche UTC
const utc = (iso: string) => new Date(iso);
const local = (y: number, m: number, d: number) => new Date(y, m - 1, d);

const cat = (over: Partial<Category>): Category => ({ id: 'sub', categoria: 'Servicios', subcategoria: 'Suscripciones', tipo: 'Gastos', ...over });
const tx = (over: Partial<Transaction>): Transaction => ({
  id: 't', cuentaId: 'a1', fecha: utc('2026-08-08'), comentario: 'NETFLIX.COM', ingreso: 0, gasto: 199,
  monto: -199, subcategoriaId: 'sub', divisa: 'MXN', ...over,
});
const row = (over: Partial<SubscriptionRow>): SubscriptionRow => ({
  id: 'r1', user_id: 'u', service_name: 'Netflix', tipo_servicio: 'Streaming de video', ultimo_pago_monto: 199,
  ultimo_pago_fecha: '2026-07-08', frecuencia: 'Mensual', proximo_pago: '2026-08-08', numero_pagos: 3,
  original_comments: ['NETFLIX.COM'], active: true, canon_key: 'netflix', aliases: [], frecuencia_manual: false,
  created_at: '2026-01-01T00:00:00Z', updated_at: '2026-01-01T00:00:00Z', ...over,
});

const CATS = [cat({})];

describe('resolveServiceName', () => {
  it('un alias del usuario gana a un patrón', () => {
    const r = resolveServiceName('SPOTIFY AB', 129, [{ canonKey: 'musica', serviceName: 'Música', tipoServicio: 'Audio', aliases: ['spotify'] }]);
    expect(r).toEqual({ serviceName: 'Música', tipoServicio: 'Audio', canonKey: 'musica' });
  });
  it('aplica el patrón con expectedAmount a ±15%', () => {
    expect(resolveServiceName('AMAZON RETAIL', 105, []).canonKey).toBe('amazon-prime');
    expect(resolveServiceName('AMAZON RETAIL', 500, []).canonKey).toMatch(/^custom-/);
  });
  it('Microsoft coincide con msbill', () => {
    expect(resolveServiceName('MSBILL.INFO 149', 149, [])).toMatchObject({ serviceName: 'Microsoft', canonKey: 'microsoft' });
  });
  it('sin patrón genera custom-<sin acentos ni símbolos> y un nombre de hasta 3 palabras', () => {
    const r = resolveServiceName('CAFÉ *ÚNICO 12 SUSCRIPCIÓN MENSUAL', 50, []);
    expect(r.canonKey).toBe('custom-cafnico12suscripcinm'); // los dígitos se conservan (misma clave que hoy)
    expect(r.serviceName).toBe('CAFÉ ÚNICO SUSCRIPCIÓN');
    expect(r.tipoServicio).toBe('Suscripción');
  });
});

describe('detectFrequency', () => {
  const fechas = (...isos: string[]) => isos.map(utc);

  it('mensual limpio', () => {
    expect(detectFrequency(fechas('2026-05-08', '2026-06-08', '2026-07-08', '2026-08-08')).frecuencia).toBe('Mensual');
  });
  it('un cargo a ≤15 días del anterior es del mismo ciclo (cambio de plan) y no rompe la mediana', () => {
    const r = detectFrequency(fechas('2026-05-08', '2026-06-08', '2026-07-08', '2026-07-30', '2026-08-08'));
    expect(r.frecuencia).toBe('Mensual');
    expect(r.ciclos).toHaveLength(4);
    expect(r.ciclos[3]).toHaveLength(2); // 30/7 y 8/8 juntos
  });
  it('bimestral, trimestral y anual', () => {
    expect(detectFrequency(fechas('2026-01-10', '2026-03-10', '2026-05-10', '2026-07-10')).frecuencia).toBe('Bimestral');
    expect(detectFrequency(fechas('2025-10-01', '2026-01-01', '2026-04-01', '2026-07-01')).frecuencia).toBe('Trimestral');
    expect(detectFrequency(fechas('2024-08-15', '2025-08-15', '2026-08-15')).frecuencia).toBe('Anual');
  });
  it('un solo pago (o un solo ciclo) es Irregular', () => {
    expect(detectFrequency(fechas('2026-08-08')).frecuencia).toBe('Irregular');
    expect(detectFrequency(fechas('2026-08-01', '2026-08-08', '2026-08-15')).frecuencia).toBe('Irregular');
  });
});

describe('calculateNextPayment', () => {
  const base = local(2026, 8, 8);
  it('suma según la frecuencia; Irregular = +1 mes', () => {
    expect(calculateNextPayment(base, 'Semanal')).toEqual(local(2026, 8, 15));
    expect(calculateNextPayment(base, 'Mensual')).toEqual(local(2026, 9, 8));
    expect(calculateNextPayment(base, 'Bimestral')).toEqual(local(2026, 10, 8));
    expect(calculateNextPayment(base, 'Trimestral')).toEqual(local(2026, 11, 8));
    expect(calculateNextPayment(base, 'Semestral')).toEqual(local(2027, 2, 8));
    expect(calculateNextPayment(base, 'Anual')).toEqual(local(2027, 8, 8));
    expect(calculateNextPayment(base, 'Irregular')).toEqual(local(2026, 9, 8));
  });
  it('fin de mes: 31 ene + 1 mes desborda a marzo (comportamiento de siempre) y no muta la entrada', () => {
    const ene = local(2026, 1, 31);
    expect(calculateNextPayment(ene, 'Mensual')).toEqual(local(2026, 3, 3));
    expect(ene).toEqual(local(2026, 1, 31));
  });
});

describe('previousPaymentAmount', () => {
  it('devuelve el último cargo del ciclo anterior, no el segundo más reciente', () => {
    const txs = [
      tx({ id: '1', comentario: 'ANTHROPIC', fecha: utc('2026-06-08'), gasto: 20 }),
      tx({ id: '2', comentario: 'ANTHROPIC', fecha: utc('2026-07-08'), gasto: 20 }),
      tx({ id: '3', comentario: 'ANTHROPIC', fecha: utc('2026-07-30'), gasto: 100 }),
      tx({ id: '4', comentario: 'ANTHROPIC', fecha: utc('2026-08-08'), gasto: 100 }),
      tx({ id: 'x', comentario: 'OTRO', fecha: utc('2026-08-01'), gasto: 5 }),
    ];
    expect(previousPaymentAmount(['ANTHROPIC'], txs)).toBe(20);
    expect(previousPaymentAmount(['ANTHROPIC'], txs.slice(3))).toBeNull();
  });
});

describe('detectSubscriptions', () => {
  it('agrupa por canon_key con mediana de gaps; fechas: ultimoPago en UTC, proximoPago local', () => {
    const txs = ['2026-05-08', '2026-06-08', '2026-07-08', '2026-07-30', '2026-08-08'].map((f, i) =>
      tx({ id: `a${i}`, comentario: 'ANTHROPIC', fecha: utc(f), gasto: i >= 3 ? 100 : 20 }));
    const [d] = detectSubscriptions(txs, CATS, [], NOW);
    expect(d.canonKey).toBe('custom-anthropic');
    expect(d.frecuencia).toBe('Mensual');
    expect(d.numeroPagos).toBe(5);
    expect(d.ultimoPago).toEqual({ monto: 100, fecha: utc('2026-08-08') });
    expect(toFechaISO(d.proximoPago)).toBe('2026-09-08');
    expect(d.originalComments).toHaveLength(5);
  });
  it('ignora lo que no es gasto, no es Suscripciones o tiene más de 24 meses', () => {
    const txs = [
      tx({ id: '1' }), tx({ id: '2', fecha: utc('2026-07-08') }),
      tx({ id: 'ing', ingreso: 199, gasto: 0 }),
      tx({ id: 'otra', subcategoriaId: 'luz' }),
      tx({ id: 'vieja', fecha: utc('2024-01-01') }),
    ];
    const r = detectSubscriptions(txs, CATS, [], NOW);
    expect(r).toHaveLength(1);
    expect(r[0].numeroPagos).toBe(2);
  });
  it('sin subcategoría Suscripciones no detecta nada', () => {
    expect(detectSubscriptions([tx({})], [cat({ subcategoria: 'Luz' })], [], NOW)).toEqual([]);
  });
});

describe('mergeWithStored', () => {
  const detectada = detectSubscriptions([tx({ id: '1', fecha: utc('2026-07-08') }), tx({ id: '2' })], CATS, [], NOW);

  it('actualiza la fila existente conservando nombre, activo y alias; escribe fechas UTC/local', () => {
    const { updates, inserts, orphanIds } = mergeWithStored(detectada, [row({ service_name: 'Mi Netflix', active: false, aliases: ['nflx'] })]);
    expect(inserts).toEqual([]);
    expect(orphanIds).toEqual([]);
    expect(updates).toHaveLength(1);
    expect(updates[0].id).toBe('r1');
    expect(updates[0].data).toEqual({
      tipo_servicio: 'Streaming de video', ultimo_pago_monto: 199, ultimo_pago_fecha: '2026-08-08',
      frecuencia: 'Mensual', proximo_pago: '2026-09-08', numero_pagos: 2, original_comments: ['NETFLIX.COM', 'NETFLIX.COM'],
    });
    expect(updates[0].data).not.toHaveProperty('service_name');
    expect(updates[0].data).not.toHaveProperty('active');
    expect(updates[0].data).not.toHaveProperty('aliases');
  });

  it('preserva la frecuencia solo si frecuencia_manual, recalculando proximo_pago con ella', () => {
    const { updates } = mergeWithStored(detectada, [row({ frecuencia: 'Anual', frecuencia_manual: true })]);
    expect(updates[0].data.frecuencia).toBe('Anual');
    expect(updates[0].data.proximo_pago).toBe('2027-08-08');
    const auto = mergeWithStored(detectada, [row({ frecuencia: 'Irregular', frecuencia_manual: false })]);
    expect(auto.updates[0].data.frecuencia).toBe('Mensual');
  });

  it('no emite update si nada cambió', () => {
    const igual = row({ ultimo_pago_fecha: '2026-08-08', proximo_pago: '2026-09-08', numero_pagos: 2, original_comments: ['NETFLIX.COM', 'NETFLIX.COM'] });
    expect(mergeWithStored(detectada, [igual]).updates).toEqual([]);
  });

  it('marca huérfanas y no las cuenta como nombre ocupado (se borran en el mismo sync)', () => {
    const { inserts, orphanIds } = mergeWithStored(detectada, [
      row({ id: 'viejo', canon_key: 'spotify', service_name: 'Netflix' }),
      row({ id: 'sin-clave', canon_key: null, service_name: 'Manual' }),
    ]);
    expect(inserts).toHaveLength(1);
    expect(inserts[0]).toMatchObject({ service_name: 'Netflix', canon_key: 'netflix', active: true, frecuencia_manual: false, frecuencia: 'Mensual' });
    expect(orphanIds).toEqual(['viejo', 'sin-clave']);
  });

  it('inserta con sufijo si el nombre ya lo usa una fila que sigue viva', () => {
    const otra = { ...detectada[0], canonKey: 'spotify', serviceName: 'Netflix' };
    const { inserts } = mergeWithStored([...detectada, otra], [
      row({ id: 'viva', canon_key: 'spotify', service_name: 'Netflix' }),
    ]);
    expect(inserts).toHaveLength(1);
    expect(inserts[0]).toMatchObject({ service_name: 'Netflix (2)', canon_key: 'netflix' });
  });

  it('dos inserts con el mismo nombre: el primero libre, el segundo con (2); la huérfana k0 no ocupa', () => {
    const dos = [
      { ...detectada[0], canonKey: 'k1' },
      { ...detectada[0], canonKey: 'k2' },
    ];
    const { inserts } = mergeWithStored(dos, [row({ canon_key: 'k0' })]);
    expect(inserts.map(i => i.service_name)).toEqual(['Netflix', 'Netflix (2)']);
  });
});
