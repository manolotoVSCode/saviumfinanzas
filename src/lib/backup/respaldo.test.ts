import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import {
  FORMATO_RESPALDO, TABLAS_EXCLUIDAS, TABLAS_RESPALDO, VERSION_RESPALDO,
  crearRespaldo, resumirRespaldo, restaurarRespaldo, validarRespaldo,
  type Fila, type LeerPagina, type Respaldo,
} from './respaldo';

const YO = 'u1';
const filas = (n: number): Fila[] => Array.from({ length: n }, (_, i) => ({ id: String(i), user_id: YO }));

const leerDe = (datos: Record<string, Fila[]>): LeerPagina => async (tabla, _clave, desde, hasta) =>
  (datos[tabla] ?? []).slice(desde, hasta + 1);

const base = (tablas: Record<string, unknown>): unknown =>
  ({ formato: FORMATO_RESPALDO, version: VERSION_RESPALDO, creado: 'x', userId: YO, tablas });

describe('crearRespaldo', () => {
  it('lee todas las páginas: no se corta en 1000 filas', async () => {
    const r = await crearRespaldo(leerDe({ transacciones: filas(2500) }), YO);
    expect(r.tablas.transacciones).toHaveLength(2500);
  });

  it('un múltiplo exacto de la página no pierde ni repite filas', async () => {
    const r = await crearRespaldo(leerDe({ transacciones: filas(2000) }), YO);
    expect(r.tablas.transacciones).toHaveLength(2000);
  });

  it('aborta si falla una tabla, sin devolver una copia parcial', async () => {
    const leer: LeerPagina = async tabla => {
      if (tabla === 'cuentas') throw new Error('sin red');
      return [];
    };
    await expect(crearRespaldo(leer, YO)).rejects.toThrow('No se pudo leer cuentas: sin red');
  });
});

describe('cobertura', () => {
  it('toda tabla con user_id está respaldada o excluida a propósito', () => {
    const tipos = readFileSync('src/integrations/supabase/types.ts', 'utf8');
    const bloque = tipos.slice(tipos.indexOf('    Tables: {'), tipos.indexOf('    Views: {'));
    const conUsuario = [...bloque.matchAll(/^ {6}(\w+): \{\n {8}Row: \{([\s\S]*?)\n {8}\}/gm)]
      .filter(m => /\buser_id:/.test(m[2]))
      .map(m => m[1]);
    const cubiertas = new Set<string>([...TABLAS_RESPALDO.map(t => t.nombre), ...TABLAS_EXCLUIDAS]);
    expect(conUsuario.length).toBeGreaterThan(15);
    expect(conUsuario.filter(t => !cubiertas.has(t))).toEqual([]);
  });

  it('los padres van antes que las hijas', () => {
    const pos = (n: string) => TABLAS_RESPALDO.findIndex(t => t.nombre === n);
    expect(pos('cuentas')).toBeLessThan(pos('transacciones'));
    expect(pos('categorias')).toBeLessThan(pos('transacciones'));
    expect(pos('transacciones')).toBeLessThan(pos('transaction_pendings'));
    expect(pos('inversiones')).toBeLessThan(pos('investment_valuations'));
    expect(pos('cuentas')).toBeLessThan(pos('classification_rules'));
  });
});

describe('validarRespaldo', () => {
  it('acepta una copia de la cuenta', () => {
    expect(validarRespaldo(base({ cuentas: filas(1) }), YO).ok).toBe(true);
  });

  it.each([
    ['otro formato', { formato: 'x', tablas: {} }, 'no es una copia'],
    ['otra versión', { formato: FORMATO_RESPALDO, version: 99, userId: YO, tablas: {} }, 'versión'],
    ['otra cuenta', { formato: FORMATO_RESPALDO, version: VERSION_RESPALDO, userId: 'u2', tablas: {} }, 'otra cuenta'],
  ])('rechaza %s', (_n, datos, texto) => {
    const v = validarRespaldo(datos, YO);
    expect(v.ok).toBe(false);
    if (v.ok === false) expect(v.motivo).toContain(texto);
  });

  it('rechaza tablas desconocidas y filas ajenas', () => {
    expect(validarRespaldo(base({ dispositivos: [] }), YO).ok).toBe(false);
    expect(validarRespaldo(base({ cuentas: [{ id: '1', user_id: 'u2' }] }), YO).ok).toBe(false);
    expect(validarRespaldo(base({ cuentas: 'x' }), YO).ok).toBe(false);
    expect(validarRespaldo(null, YO).ok).toBe(false);
  });
});

describe('restaurarRespaldo', () => {
  const respaldo = base({ transacciones: filas(1200), cuentas: filas(2) }) as Respaldo;

  it('escribe en orden de padres a hijas y por lotes', async () => {
    const lotes: [string, number][] = [];
    const hecho = await restaurarRespaldo(respaldo, async (t, _c, f) => { lotes.push([t, f.length]); });
    expect(lotes).toEqual([['cuentas', 2], ['transacciones', 500], ['transacciones', 500], ['transacciones', 200]]);
    expect(hecho).toEqual([{ tabla: 'cuentas', filas: 2 }, { tabla: 'transacciones', filas: 1200 }]);
  });

  it('usa la clave primaria de cada tabla', async () => {
    const claves: Record<string, string> = {};
    const r = base({ informacion_familia: [{ user_id: YO }], cuentas: filas(1) }) as Respaldo;
    await restaurarRespaldo(r, async (t, c) => { claves[t] = c; });
    expect(claves).toEqual({ cuentas: 'id', informacion_familia: 'user_id' });
  });

  it('se detiene en el primer error y dice dónde', async () => {
    const escritas: string[] = [];
    await expect(restaurarRespaldo(respaldo, async t => {
      escritas.push(t);
      if (t === 'transacciones') throw new Error('rls');
    })).rejects.toThrow('Restauración detenida en transacciones: rls');
    expect(escritas).toEqual(['cuentas', 'transacciones']);
  });
});

describe('resumirRespaldo', () => {
  it('lista solo tablas con filas', () => {
    expect(resumirRespaldo({ tablas: { cuentas: filas(3), categorias: [] } })).toEqual([{ tabla: 'cuentas', filas: 3 }]);
  });
});
