import { describe, expect, it } from 'vitest';
import { matchTransactionToPattern, SUBSCRIPTION_PATTERNS } from './subscriptionPatterns';

const byId = (id: string) => SUBSCRIPTION_PATTERNS.find(p => p.id === id)!;

describe('matchTransactionToPattern', () => {
  it('exige todas las keywords y respeta las exclusiones', () => {
    const amazon = byId('amazon-prime');
    expect(matchTransactionToPattern('AMAZON RETAIL MX', 99, amazon)).toBe(true);
    expect(matchTransactionToPattern('AMAZON MX', 99, amazon)).toBe(false); // falta "retail"
    expect(matchTransactionToPattern('AMAZON RETAIL MARKETPLACE', 99, amazon)).toBe(false);
  });

  it('con expectedAmount acepta ±15%', () => {
    const amazon = byId('amazon-prime');
    expect(matchTransactionToPattern('AMAZON RETAIL', 110, amazon)).toBe(true);   // 99 + 11%
    expect(matchTransactionToPattern('AMAZON RETAIL', 150, amazon)).toBe(false);
  });

  it('Microsoft coincide con cualquiera de sus entradas (msbill, xbox…)', () => {
    const microsoft = SUBSCRIPTION_PATTERNS.filter(p => p.id === 'microsoft');
    expect(microsoft).toHaveLength(7);
    expect(microsoft.some(p => matchTransactionToPattern('MSBILL.INFO', 149, p))).toBe(true);
    expect(microsoft.some(p => matchTransactionToPattern('XBOX GAME PASS', 229, p))).toBe(true);
  });
});
