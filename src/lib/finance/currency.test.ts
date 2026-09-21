import { describe, expect, it } from 'vitest';
import { toCurrencyCode } from './currency';

describe('toCurrencyCode', () => {
  it('acepta MXN, USD y EUR', () => {
    expect(toCurrencyCode('MXN', 'USD')).toBe('MXN');
    expect(toCurrencyCode('USD', 'MXN')).toBe('USD');
    expect(toCurrencyCode('EUR', 'MXN')).toBe('EUR');
  });
  it('devuelve el fallback para códigos desconocidos, vacíos o nulos', () => {
    expect(toCurrencyCode('GBP', 'MXN')).toBe('MXN');
    expect(toCurrencyCode('', 'USD')).toBe('USD');
    expect(toCurrencyCode(null, 'EUR')).toBe('EUR');
    expect(toCurrencyCode(undefined, 'MXN')).toBe('MXN');
  });
});
