import { describe, expect, it } from 'vitest';
import { abaValido, errorCampo, formatearIban, ibanValido, limpiarCodigo, paisBancario, swiftValido } from './datosBancarios';

const US = paisBancario('US');
const ES = paisBancario('ES');
const OTRO = paisBancario('ZZ');

describe('Routing number ABA', () => {
  it('acepta uno con el control correcto', () => {
    expect(abaValido('011000015')).toBe(true); // Federal Reserve Bank of Boston
    expect(abaValido('021000021')).toBe(true); // JPMorgan Chase, Nueva York
  });
  it('rechaza el control erróneo o la longitud mala', () => {
    expect(abaValido('021000022')).toBe(false);
    expect(abaValido('02100002')).toBe(false);
    expect(errorCampo('routing', '021000022', US)).toMatch(/control/);
    expect(errorCampo('routing', '0210', US)).toMatch(/9 dígitos/);
  });
});

describe('IBAN', () => {
  it('acepta uno válido, también con espacios y minúsculas', () => {
    expect(ibanValido('ES9121000418450200051332')).toBe(true);
    expect(ibanValido('GB82WEST12345698765432')).toBe(true);
    expect(errorCampo('iban', 'es91 2100 0418 4502 0005 1332', ES)).toBeNull();
  });
  it('rechaza el control erróneo y el país que no corresponde', () => {
    expect(ibanValido('ES9121000418450200051333')).toBe(false);
    expect(errorCampo('iban', 'GB82WEST12345698765432', ES)).toMatch(/empieza por ES/);
    expect(errorCampo('iban', 'GB82WEST12345698765432', OTRO)).toBeNull();
  });
  it('se formatea de cuatro en cuatro', () => {
    expect(formatearIban('ES9121000418450200051332')).toBe('ES91 2100 0418 4502 0005 1332');
  });
});

describe('SWIFT/BIC', () => {
  it('acepta 8 u 11 caracteres', () => {
    expect(swiftValido('BOFAUS3N')).toBe(true);
    expect(swiftValido('BCMRMXMMPYM')).toBe(true);
    expect(swiftValido('BOFA US')).toBe(false);
    expect(swiftValido('BOFAUS3NX')).toBe(false);
  });
});

describe('paisBancario', () => {
  it('trata la cuenta sin país como mexicana', () => {
    expect(paisBancario(null).codigo).toBe('MX');
    expect(paisBancario('US').campos).toEqual(['numeroCuenta', 'routing', 'swift']);
  });
  it('limpia espacios y guiones y pasa a mayúsculas', () => {
    expect(limpiarCodigo(' bofa-us 3n ')).toBe('BOFAUS3N');
  });
  it('vacío no es error', () => {
    expect(errorCampo('swift', '', US)).toBeNull();
  });
});
