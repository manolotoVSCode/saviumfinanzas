import { describe, expect, it } from 'vitest';
import { convertWithRates, toCurrencyCode } from './currency';

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

describe('convertWithRates', () => {
  const tasas = { MXN: 1, USD: 20, EUR: 22 };
  it('convierte siempre pasando por MXN', () => {
    expect(convertWithRates(100, 'USD', 'MXN', tasas)).toBe(2000);
    expect(convertWithRates(2200, 'MXN', 'EUR', tasas)).toBe(100);
    expect(convertWithRates(100, 'USD', 'EUR', tasas)).toBeCloseTo(90.9090909, 6);
  });
  it('misma divisa devuelve el importe tal cual', () => {
    expect(convertWithRates(5, 'EUR', 'EUR', tasas)).toBe(5);
  });
});
