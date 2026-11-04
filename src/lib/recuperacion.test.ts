import { describe, expect, it } from 'vitest';
import { detectarRecuperacion, validarNuevaContrasena } from './recuperacion';

describe('detectarRecuperacion', () => {
  it('reconoce el enlace válido', () => {
    expect(detectarRecuperacion('#access_token=abc&expires_in=3600&type=recovery')).toBe('nueva');
  });

  it('reconoce el enlace caducado', () => {
    expect(detectarRecuperacion('#error=access_denied&error_code=otp_expired&error_description=x')).toBe('caducado');
  });

  it('ignora rutas y otros retornos', () => {
    expect(detectarRecuperacion('')).toBeNull();
    expect(detectarRecuperacion('#/dashboard')).toBeNull();
    expect(detectarRecuperacion('#/transacciones?type=recovery&access_token=x')).toBeNull();
    expect(detectarRecuperacion('#access_token=abc&type=signup')).toBeNull();
    expect(detectarRecuperacion('#type=recovery')).toBeNull();
  });
});

describe('validarNuevaContrasena', () => {
  it('exige longitud y coincidencia', () => {
    expect(validarNuevaContrasena('corta', 'corta')).toContain('8');
    expect(validarNuevaContrasena('contraseña1', 'contraseña2')).toContain('coinciden');
    expect(validarNuevaContrasena('contraseña1', 'contraseña1')).toBeNull();
  });
});
