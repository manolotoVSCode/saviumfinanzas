import { describe, expect, it } from 'vitest';
import { diasHasta, parseFechaLocal } from './fechas';

const NOW = new Date(2026, 8, 15, 14, 30); // 15 sep 2026, con hora para comprobar el truncado

describe('parseFechaLocal', () => {
  it('convierte YYYY-MM-DD a medianoche local', () => {
    expect(parseFechaLocal('2026-09-20')).toEqual(new Date(2026, 8, 20));
  });
  it('acepta timestamps ISO completos', () => {
    expect(parseFechaLocal('2026-09-20T10:00:00.000Z').getTime()).toBe(new Date('2026-09-20T10:00:00.000Z').getTime());
  });
});

describe('diasHasta', () => {
  it('cuenta días enteros desde hoy', () => {
    expect(diasHasta('2026-09-20', NOW)).toBe(5);
    expect(diasHasta('2026-09-15', NOW)).toBe(0);
    expect(diasHasta('2026-09-10', NOW)).toBe(-5);
  });
});
