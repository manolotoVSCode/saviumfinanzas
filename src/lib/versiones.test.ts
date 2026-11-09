import { describe, expect, it } from 'vitest';
import { compararVersiones, versionMasAlta } from './versiones';

describe('versiones', () => {
  it('compara por partes numéricas, no como texto', () => {
    expect(compararVersiones('4.10', '4.9')).toBeGreaterThan(0);
    expect(compararVersiones('4.4', '4.4.0')).toBe(0);
    expect(compararVersiones('4.4', '4.4.2')).toBeLessThan(0);
    expect(compararVersiones('2.0', '10.0')).toBeLessThan(0);
  });
  it('elige la más alta e ignora las que no tienen forma de versión', () => {
    expect(versionMasAlta(['4.3', '4.4.2', '4.4', 'beta'])).toBe('4.4.2');
    expect(versionMasAlta([])).toBeNull();
  });
});
