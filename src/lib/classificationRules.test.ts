import { describe, expect, it } from 'vitest';
import { ClassificationRuleLike, conPalabraCompleta, findMatchingRuleDetailed, matchesClassificationKeyword, parseClassificationKeywords, splitClassificationKeywords } from './classificationRules';

const rule = (over: Partial<ClassificationRuleLike>): ClassificationRuleLike => ({
  name: 'Netflix', keyword: 'netflix', match_type: 'contains', category_id: 'cat-netflix',
  cuenta_id: null, active: true, amount_min: null, amount_max: null, ...over,
});

describe('findMatchingRuleDetailed', () => {
  it('devuelve la primera regla activa que coincide (las reglas llegan ordenadas por prioridad) con la keyword que acertó', () => {
    const rules = [
      rule({ name: 'Inactiva', active: false }),
      rule({ name: 'Streaming', keyword: 'spotify, netflix', category_id: 'cat-stream' }),
      rule({ name: 'Netflix' }),
    ];
    expect(findMatchingRuleDetailed(rules, 'NETFLIX.COM MX')).toEqual({ category_id: 'cat-stream', name: 'Streaming', keyword: 'netflix' });
    expect(findMatchingRuleDetailed(rules, 'UBER EATS')).toBeNull();
  });

  it('filtra por cuenta: una regla con cuenta_id solo aplica a esa cuenta y exige accountId', () => {
    const rules = [rule({ cuenta_id: 'a1' })];
    expect(findMatchingRuleDetailed(rules, 'NETFLIX', undefined, 'a1')?.category_id).toBe('cat-netflix');
    expect(findMatchingRuleDetailed(rules, 'NETFLIX', undefined, 'a2')).toBeNull();
    expect(findMatchingRuleDetailed(rules, 'NETFLIX')).toBeNull();
  });

  it('filtra por importe: min/max son condiciones AND y exigen amount', () => {
    const rules = [rule({ amount_min: 100, amount_max: 300 })];
    expect(findMatchingRuleDetailed(rules, 'NETFLIX', 199)?.category_id).toBe('cat-netflix');
    expect(findMatchingRuleDetailed(rules, 'NETFLIX', 50)).toBeNull();
    expect(findMatchingRuleDetailed(rules, 'NETFLIX', 500)).toBeNull();
    expect(findMatchingRuleDetailed(rules, 'NETFLIX')).toBeNull();
  });

  it('respeta match_type exact y starts_with', () => {
    expect(findMatchingRuleDetailed([rule({ match_type: 'exact' })], 'netflix')?.keyword).toBe('netflix');
    expect(findMatchingRuleDetailed([rule({ match_type: 'exact' })], 'netflix mx')).toBeNull();
    expect(findMatchingRuleDetailed([rule({ match_type: 'starts_with' })], 'NETFLIX MX')?.keyword).toBe('netflix');
    expect(findMatchingRuleDetailed([rule({ match_type: 'starts_with' })], 'PAGO NETFLIX')).toBeNull();
  });
});

describe('palabras clave entrecomilladas (palabra completa)', () => {
  it('SPA por principio caza SPAIN; "SPA" entrecomillada, no', () => {
    expect(matchesClassificationKeyword('FIVE GUYS SPAIN MADRID', 'SPA', 'contains')).toBe(true);
    expect(matchesClassificationKeyword('FIVE GUYS SPAIN MADRID', '"SPA"', 'contains')).toBe(false);
    expect(matchesClassificationKeyword('SPA URBANO POLANCO', '"SPA"', 'contains')).toBe(true);
    expect(matchesClassificationKeyword('MASAJES Y SPA', '"SPA"', 'contains')).toBe(true);
  });

  it('la marca no cambia el resto de palabras clave de la misma regla', () => {
    const rules = [rule({ name: 'Higiene', keyword: '"SPA", PELUQUERIA', category_id: 'cat-higiene' })];
    expect(findMatchingRuleDetailed(rules, 'FIVE GUYS SPAIN')).toBeNull();
    expect(findMatchingRuleDetailed(rules, 'PELUQUERIAS UNIDAS')).toMatchObject({ category_id: 'cat-higiene', keyword: 'peluqueria' });
    expect(findMatchingRuleDetailed(rules, 'SPA URBANO')).toMatchObject({ keyword: 'spa' });
  });

  it('entrecomillada con "empieza con" exige palabra entera al principio', () => {
    expect(matchesClassificationKeyword('PASE URBANO', '"PASE"', 'starts_with')).toBe(true);
    expect(matchesClassificationKeyword('PASEO DE LA REFORMA', '"PASE"', 'starts_with')).toBe(false);
    expect(matchesClassificationKeyword('PASEO DE LA REFORMA', 'PASE', 'starts_with')).toBe(true);
  });

  it('una frase entrecomillada exige límite a ambos lados', () => {
    expect(matchesClassificationKeyword('PAGO UBER EATS MX', '"UBER EATS"', 'contains')).toBe(true);
    expect(matchesClassificationKeyword('UBER EATSXX', '"UBER EATS"', 'contains')).toBe(false);
  });

  it('las comillas no se ven al mostrar ni al contar keywords', () => {
    expect(splitClassificationKeywords('"SPA", PELUQUERIA')).toEqual(['spa', 'peluqueria']);
    expect(parseClassificationKeywords('"SPA", PELUQUERIA')).toEqual([
      { texto: 'spa', palabraCompleta: true },
      { texto: 'peluqueria', palabraCompleta: false },
    ]);
  });

  it('conPalabraCompleta pone y quita la marca sin duplicar comillas', () => {
    expect(conPalabraCompleta('SPA', true)).toBe('"SPA"');
    expect(conPalabraCompleta('"SPA"', true)).toBe('"SPA"');
    expect(conPalabraCompleta('"SPA"', false)).toBe('SPA');
  });
});
