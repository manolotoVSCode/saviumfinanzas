import { describe, expect, it } from 'vitest';
import { ClassificationRuleLike, findMatchingRuleDetailed } from './classificationRules';

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
