import { beforeEach, describe, expect, it } from 'vitest';
import { cuentasPorActividad, cuentasRecientes, ordenarPorRecientes, registrarCuentaReciente } from './cuentasRecientes';

const store: Record<string, string> = {};
// jsdom no está disponible (los tests corren en node): localStorage mínimo.
(globalThis as any).localStorage = {
  getItem: (k: string) => store[k] ?? null,
  setItem: (k: string, v: string) => { store[k] = v; },
  removeItem: (k: string) => { delete store[k]; },
};

describe('cuentas recientes al importar', () => {
  beforeEach(() => { Object.keys(store).forEach(k => delete store[k]); });

  it('guarda la última usada primero y no repite', () => {
    registrarCuentaReciente('amex');
    registrarCuentaReciente('hsbc');
    registrarCuentaReciente('amex');
    expect(cuentasRecientes(['amex', 'hsbc'])).toEqual(['amex', 'hsbc']);
  });

  it('se queda con las tres últimas', () => {
    ['a', 'b', 'c', 'd'].forEach(registrarCuentaReciente);
    expect(cuentasRecientes(['a', 'b', 'c', 'd'])).toEqual(['d', 'c', 'b']);
  });

  it('descarta cuentas que ya no existen', () => {
    registrarCuentaReciente('borrada');
    registrarCuentaReciente('amex');
    expect(cuentasRecientes(['amex'])).toEqual(['amex']);
  });

  it('sin historial no hay recientes y el resto conserva su orden', () => {
    const cuentas = [{ id: 'a' }, { id: 'b' }, { id: 'c' }];
    expect(cuentasRecientes(['a'])).toEqual([]);
    expect(ordenarPorRecientes(cuentas, [])).toEqual({ recientes: [], resto: cuentas });
  });

  it('separa recientes del resto respetando ambos órdenes', () => {
    const cuentas = [{ id: 'a' }, { id: 'b' }, { id: 'c' }];
    expect(ordenarPorRecientes(cuentas, ['c', 'a'])).toEqual({
      recientes: [{ id: 'c' }, { id: 'a' }],
      resto: [{ id: 'b' }],
    });
  });
});

describe('cuentasPorActividad (arranque sin historial)', () => {
  const cuentas = [{ id: 'amex' }, { id: 'hsbc' }, { id: 'vieja' }, { id: 'sin-uso' }];
  const tx = (cuentaId: string, fecha: string) => ({ cuentaId, fecha: new Date(fecha) });

  it('ordena por número de movimientos y deja fuera las cuentas sin transacciones', () => {
    const r = cuentasPorActividad(cuentas, [
      tx('amex', '2026-01-10'), tx('amex', '2026-02-10'), tx('amex', '2026-03-10'),
      tx('hsbc', '2026-04-10'), tx('hsbc', '2026-05-10'),
      tx('vieja', '2024-01-10'),
    ]);
    expect(r).toEqual(['amex', 'hsbc', 'vieja']);
  });

  it('un apunte suelto de ayer no adelanta a la cuenta del banco', () => {
    // El caso real: Efectivo tenía 48 apuntes a mano y uno reciente; AMEX, 1.507.
    const r = cuentasPorActividad([{ id: 'efectivo' }, { id: 'amex' }], [
      tx('efectivo', '2026-09-20'),
      ...Array.from({ length: 5 }, (_, i) => tx('amex', `2026-0${i + 1}-10`)),
    ]);
    expect(r[0]).toBe('amex');
  });

  it('a igual número de movimientos gana la del más reciente', () => {
    const r = cuentasPorActividad(cuentas, [
      tx('hsbc', '2026-08-01'),
      tx('amex', '2026-08-31'),
    ]);
    expect(r.slice(0, 2)).toEqual(['amex', 'hsbc']);
  });

  it('se queda con tres como mucho y aguanta fechas inválidas o sin cuenta', () => {
    const r = cuentasPorActividad(cuentas, [
      tx('amex', '2026-08-31'), tx('amex', '2026-08-01'), tx('amex', '2026-07-01'),
      tx('hsbc', '2026-08-30'), tx('hsbc', '2026-08-02'),
      tx('vieja', '2026-08-29'),
      { cuentaId: 'sin-uso', fecha: new Date('no es fecha') },
      { cuentaId: null, fecha: new Date('2026-08-31') },
    ]);
    expect(r).toEqual(['amex', 'hsbc', 'vieja']);
  });

  it('sin transacciones no sugiere nada', () => {
    expect(cuentasPorActividad(cuentas, [])).toEqual([]);
  });
});
