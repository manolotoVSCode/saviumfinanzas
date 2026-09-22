import { beforeEach, describe, expect, it } from 'vitest';
import { cuentasRecientes, ordenarPorRecientes, registrarCuentaReciente } from './cuentasRecientes';

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
