import { describe, expect, it } from 'vitest';
import { hashCodigoEmergencia, validarCodigoEmergencia, validarEmail } from './codigoEmergencia';

describe('código de emergencia', () => {
  it('el hash coincide con la app iOS y con Postgres (sha256 de savium-coaccion:<user_id>:<código>)', async () => {
    expect(await hashCodigoEmergencia('1234', '01AD1BCC-00E7-47A7-88B6-8B2FC8AFA52E'))
      .toBe('125b2ec384711627ec32fcd3d7e6be48ff9b0a8c8a255be961d140d3ae0fdebb');
    expect(await hashCodigoEmergencia(' 1234 ', '01ad1bcc-00e7-47a7-88b6-8b2fc8afa52e'))
      .toBe('125b2ec384711627ec32fcd3d7e6be48ff9b0a8c8a255be961d140d3ae0fdebb');
  });

  it('valida el código: al menos 4 caracteres, sin espacios por dentro, y la confirmación igual', () => {
    expect(validarCodigoEmergencia('123', '123')).toMatch(/4/);
    expect(validarCodigoEmergencia('12 34', '12 34')).toMatch(/espacios/);
    expect(validarCodigoEmergencia('1234', '1235')).toMatch(/coinciden/);
    expect(validarCodigoEmergencia('1234', '1234')).toBeNull();
  });

  it('valida correos', () => {
    expect(validarEmail('ana@hotmail.com')).toBe(true);
    expect(validarEmail(' ana@hotmail.com ')).toBe(true);
    expect(validarEmail('ana@hotmail')).toBe(false);
    expect(validarEmail('ana hotmail.com')).toBe(false);
  });
});
