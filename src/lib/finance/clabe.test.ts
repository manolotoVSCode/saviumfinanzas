import { describe, expect, it } from 'vitest';
import { digitoControlClabe, errorClabe, formatearClabe, limpiarClabe } from './clabe';

// Ejemplo: banco 032, plaza 180, cuenta 00011835971 → control 9.
const VALIDA = '032180000118359719';

describe('CLABE', () => {
  it('calcula el dígito de control', () => {
    expect(digitoControlClabe(VALIDA.slice(0, 17))).toBe(9);
  });
  it('acepta la válida, también con espacios o guiones, y la vacía', () => {
    expect(errorClabe(VALIDA)).toBeNull();
    expect(errorClabe('032 180 00011835971-9')).toBeNull();
    expect(errorClabe('')).toBeNull();
  });
  it('rechaza longitud incorrecta y dígito de control equivocado', () => {
    expect(errorClabe('03218000011835971')).toMatch(/18 dígitos; esta tiene 17/);
    expect(errorClabe('032180000118359718')).toMatch(/dígito de control/);
  });
  it('limpia y formatea', () => {
    expect(limpiarClabe('032-180 000118359719')).toBe(VALIDA);
    expect(formatearClabe(VALIDA)).toBe('032 180 00011835971 9');
  });
});
