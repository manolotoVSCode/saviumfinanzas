import { describe, expect, it } from 'vitest';
import { Transaction } from '@/types/finance';
import { buildHistoryIndex, normalizeDescription, partialKey, suggestCategory } from './importCategorizer';

const tx = (over: Partial<Transaction>): Transaction => ({
  id: 't', cuentaId: 'a1', fecha: new Date('2026-08-05'), comentario: 'UBER', ingreso: 0, gasto: 100,
  monto: -100, subcategoriaId: 'transporte', divisa: 'MXN', ...over,
});
const sinReglas = () => null;
const regla = (id: string) => () => ({ category_id: id, name: 'Netflix', keyword: 'netflix' });

describe('normalizeDescription / partialKey', () => {
  it('normaliza y calcula la clave parcial solo con ≥2 palabras y ≥8 caracteres', () => {
    expect(normalizeDescription('  UBER *EATS  Madrid! ')).toBe('uber eats madrid');
    expect(partialKey('uber eats madrid centro')).toBe('uber eats madrid');
    expect(partialKey('uber')).toBeNull();
    expect(partialKey('ab cd')).toBeNull();
  });
});

describe('buildHistoryIndex', () => {
  it('la categoría más frecuente gana a la última; desempate por la más reciente', () => {
    const h = buildHistoryIndex([
      tx({ id: '1', subcategoriaId: 'transporte', fecha: new Date('2026-01-01') }),
      tx({ id: '2', subcategoriaId: 'transporte', fecha: new Date('2026-02-01') }),
      tx({ id: '3', subcategoriaId: 'comida', fecha: new Date('2026-08-01') }),
    ]);
    expect(h.exact.get('uber')).toEqual({ categoriaId: 'transporte', count: 2 });
    const empate = buildHistoryIndex([
      tx({ id: '1', subcategoriaId: 'transporte', fecha: new Date('2026-01-01') }),
      tx({ id: '2', subcategoriaId: 'comida', fecha: new Date('2026-08-01') }),
    ]);
    expect(empate.exact.get('uber')?.categoriaId).toBe('comida');
  });

  it('no aprende de la categoría Sin Asignar', () => {
    const h = buildHistoryIndex([tx({ subcategoriaId: 'sin-asignar' })], 'sin-asignar');
    expect(h.exact.size).toBe(0);
  });
});

describe('suggestCategory', () => {
  it('"uber eats madrid" no coincide con el historial "uber" (sin includes bidireccional)', () => {
    const h = buildHistoryIndex([tx({})]);
    expect(suggestCategory('UBER EATS MADRID', 100, 'a1', h, sinReglas)).toBeNull();
  });

  it('historial exacto gana a la regla', () => {
    const h = buildHistoryIndex([tx({ comentario: 'NETFLIX.COM', subcategoriaId: 'ocio' }), tx({ id: '2', comentario: 'NETFLIX.COM', subcategoriaId: 'ocio' })]);
    expect(suggestCategory('NETFLIX.COM', 199, 'a1', h, regla('streaming'))).toEqual({
      categoriaId: 'ocio', source: 'historial', detail: 'Historial · 2 movimientos', confidence: 'alta',
    });
  });

  it('la regla gana al historial parcial', () => {
    const h = buildHistoryIndex([tx({ comentario: 'NETFLIX COM MX 001', subcategoriaId: 'ocio' })]);
    expect(suggestCategory('NETFLIX COM MX 002', 199, 'a1', h, regla('streaming'))).toEqual({
      categoriaId: 'streaming', source: 'regla', detail: 'Regla · Netflix', confidence: 'alta',
    });
  });

  it('sin historial exacto ni regla usa el parcial estricto con confianza media', () => {
    const h = buildHistoryIndex([tx({ comentario: 'OXXO GAS CENTRO 12', subcategoriaId: 'gasolina' })]);
    expect(suggestCategory('OXXO GAS CENTRO 99', 500, 'a1', h, sinReglas)).toEqual({
      categoriaId: 'gasolina', source: 'historial_parcial', detail: 'Parecido a · oxxo gas centro', confidence: 'media',
    });
  });
});
