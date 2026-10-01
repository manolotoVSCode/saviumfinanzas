import { describe, expect, it } from 'vitest';
import {
  conDecision, conNota, diasDesdeRevision, esTablaInexistente, estadoRevision, estadoVencimientoSeguro,
  infoFamiliaVacia, normalizarInfoFamilia, serializarInfoFamilia, sinHuerfana,
} from './familia';

const NOW = new Date(2026, 8, 30, 12); // 30 sep 2026, hora local

describe('normalizarInfoFamilia', () => {
  it('null, undefined y {} dan el documento vacío', () => {
    expect(normalizarInfoFamilia(null)).toEqual(infoFamiliaVacia());
    expect(normalizarInfoFamilia(undefined)).toEqual(infoFamiliaVacia());
    expect(normalizarInfoFamilia({})).toEqual(infoFamiliaVacia());
  });

  it('repara campos faltantes, convierte escalares a texto y asigna id', () => {
    const info = normalizarInfoFamilia({ carta: 'Paso 1', contactos: [{ nombre: 'Ana', telefono: 5512345678 }] });
    expect(info.carta).toBe('Paso 1');
    expect(info.contactos[0]).toMatchObject({ nombre: 'Ana', telefono: '5512345678', rol: '', email: '', nota: '' });
    expect(info.contactos[0].id).toMatch(/.+/);
  });

  it('repara seguros: suma numérica o null, divisa válida, vencimiento YYYY-MM-DD', () => {
    const [s] = normalizarInfoFamilia({ seguros: [{ id: 's1', sumaAsegurada: '1500000', divisa: 'GBP', vencimiento: '31/12/2026' }] }).seguros;
    expect(s).toMatchObject({ id: 's1', sumaAsegurada: 1500000, divisa: 'MXN', vencimiento: null, tipo: '', comoReclamar: '' });
    const [t] = normalizarInfoFamilia({ seguros: [{ sumaAsegurada: 'mucho', divisa: 'USD', vencimiento: '2027-01-15' }] }).seguros;
    expect(t).toMatchObject({ sumaAsegurada: null, divisa: 'USD', vencimiento: '2027-01-15' });
  });

  it('lo irreparable va a extra._irreparables y las claves desconocidas a extra', () => {
    const info = normalizarInfoFamilia({
      contactos: ['texto suelto', { nombre: 'Ana' }],
      documentos: 'no es lista',
      notasPatrimonio: { 'cuenta:a': 'ok', 'cuenta:b': { raro: 1 } },
      pagos: { 'sub:x': 'mantener' },
      futuro: 42,
    });
    expect(info.contactos).toHaveLength(1);
    expect(info.documentos).toEqual([]);
    expect(info.notasPatrimonio).toEqual({ 'cuenta:a': 'ok' });
    expect(info.pagos).toEqual({});
    expect(info.extra.futuro).toBe(42);
    expect(info.extra._irreparables).toEqual({
      contactos: ['texto suelto'],
      documentos: ['no es lista'],
      notasPatrimonio: [{ clave: 'cuenta:b', valor: { raro: 1 } }],
      pagos: [{ clave: 'sub:x', valor: 'mantener' }],
    });
  });

  it('una decisión desconocida queda en null conservando la nota', () => {
    expect(normalizarInfoFamilia({ pagos: { 'sub:x': { decision: 'vender', nota: 'ver' } } }).pagos['sub:x'])
      .toEqual({ decision: null, nota: 'ver' });
  });

  it('una raíz que no es objeto se conserva', () => {
    expect(normalizarInfoFamilia('texto').extra._irreparables).toEqual({ raiz: ['texto'] });
  });

  it('ida y vuelta es idempotente y no pierde nada', () => {
    const raw = { carta: 'Hola', contactos: [{ id: 'c1', nombre: 'Ana' }, 7], futuro: { a: 1 }, _irreparables: { seguros: ['viejo'] } };
    const una = normalizarInfoFamilia(raw);
    const dos = normalizarInfoFamilia(serializarInfoFamilia(una));
    expect(dos).toEqual(una);
    expect(una.extra._irreparables).toEqual({ seguros: ['viejo'], contactos: [7] });
    expect(serializarInfoFamilia(una).futuro).toEqual({ a: 1 });
  });
});

describe('edición', () => {
  it('conNota añade y, con texto vacío, borra la clave', () => {
    const d = conNota(infoFamiliaVacia(), 'cuenta:a', 'beneficiaria: Ana');
    expect(d.notasPatrimonio).toEqual({ 'cuenta:a': 'beneficiaria: Ana' });
    expect(conNota(d, 'cuenta:a', '').notasPatrimonio).toEqual({});
  });

  it('conDecision guarda y, sin decisión ni nota, borra la clave', () => {
    const d = conDecision(infoFamiliaVacia(), 'sub:x', { decision: 'cancelar', nota: '' });
    expect(d.pagos['sub:x']).toEqual({ decision: 'cancelar', nota: '' });
    expect(conDecision(d, 'sub:x', { decision: null, nota: '' }).pagos).toEqual({});
  });

  it('sinHuerfana borra de notas o de pagos según el origen', () => {
    let d = conNota(infoFamiliaVacia(), 'cuenta:a', 'x');
    d = conDecision(d, 'sub:x', { decision: 'mantener', nota: '' });
    expect(sinHuerfana(d, { origen: 'nota', clave: 'cuenta:a', texto: 'x' }).notasPatrimonio).toEqual({});
    expect(sinHuerfana(d, { origen: 'pago', clave: 'sub:x', texto: '' }).pagos).toEqual({});
  });
});

describe('revisión', () => {
  const hace = (dias: number) => new Date(2026, 8, 30 - dias, 23, 30).toISOString();

  it('sin fecha → sin_datos', () => {
    expect(estadoRevision(null, NOW)).toBe('sin_datos');
  });

  it('180 días → al_dia; 181 → vencida (días naturales locales)', () => {
    expect(diasDesdeRevision(hace(180), NOW)).toBe(180);
    expect(estadoRevision(hace(180), NOW)).toBe('al_dia');
    expect(estadoRevision(hace(181), NOW)).toBe('vencida');
    expect(estadoRevision(hace(0), NOW)).toBe('al_dia');
  });

  it('cruzar un cambio de horario no desplaza el conteo', () => {
    // 2 abr → 30 sep 2026: 181 días naturales
    expect(diasDesdeRevision(new Date(2026, 3, 2, 0, 30).toISOString(), NOW)).toBe(181);
  });
});

describe('estadoVencimientoSeguro', () => {
  it('distingue sin fecha, vigente, próxima (≤30 días) y vencida', () => {
    expect(estadoVencimientoSeguro(null, NOW)).toBe('sin_fecha');
    expect(estadoVencimientoSeguro('2026-10-31', NOW)).toBe('vigente');
    expect(estadoVencimientoSeguro('2026-10-30', NOW)).toBe('proxima');
    expect(estadoVencimientoSeguro('2026-09-30', NOW)).toBe('proxima');
    expect(estadoVencimientoSeguro('2026-09-29', NOW)).toBe('vencida');
  });
});

describe('esTablaInexistente', () => {
  it('reconoce los códigos de Postgres y PostgREST', () => {
    expect(esTablaInexistente({ code: '42P01' })).toBe(true);
    expect(esTablaInexistente({ code: 'PGRST205' })).toBe(true);
    expect(esTablaInexistente({ code: '23505' })).toBe(false);
    expect(esTablaInexistente(null)).toBe(false);
  });
});

describe('conservación de campos reparados (fix round 1)', () => {
  it('seguro con divisa inválida y vencimiento no-ISO stasha ambos', () => {
    const info = normalizarInfoFamilia({
      seguros: [{ id: 's1', sumaAsegurada: '1500000', divisa: 'GBP', vencimiento: '31/12/2026' }],
    });
    const [s] = info.seguros;
    expect(s).toMatchObject({ id: 's1', sumaAsegurada: 1500000, divisa: 'MXN', vencimiento: null });
    const irrep = info.extra._irreparables as Record<string, unknown[]> | undefined;
    expect(irrep?.seguros).toContainEqual({ id: 's1', campo: 'divisa', valor: 'GBP' });
    expect(irrep?.seguros).toContainEqual({ id: 's1', campo: 'vencimiento', valor: '31/12/2026' });
  });

  it('contacto con nombre inválido y clave desconocida stasha ambos', () => {
    const info = normalizarInfoFamilia({
      contactos: [{ id: 'c1', nombre: { a: 1 }, whatsapp: '55' }],
    });
    const [c] = info.contactos;
    expect(c).toMatchObject({ id: 'c1', nombre: '', rol: '', telefono: '', email: '', nota: '' });
    const irrep = info.extra._irreparables as Record<string, unknown[]> | undefined;
    expect(irrep?.contactos).toContainEqual({ id: 'c1', campo: 'nombre', valor: { a: 1 } });
    expect(irrep?.contactos).toContainEqual({ id: 'c1', campo: 'whatsapp', valor: '55' });
  });

  it('pagos entry con decision inválida y clave extra stasha ambas', () => {
    const info = normalizarInfoFamilia({
      pagos: { 'sub:x': { decision: 'vender', nota: 'x', extra: 1 } },
    });
    expect(info.pagos['sub:x']).toEqual({ decision: null, nota: 'x' });
    const irrep = info.extra._irreparables as Record<string, unknown[]> | undefined;
    expect(irrep?.pagos).toContainEqual({ clave: 'sub:x', campo: 'decision', valor: 'vender' });
    expect(irrep?.pagos).toContainEqual({ clave: 'sub:x', campo: 'extra', valor: 1 });
  });

  it('_irreparables no-objeto se conserva', () => {
    const info = normalizarInfoFamilia({ _irreparables: 'raro' });
    expect(info.extra._irreparables).toEqual({ _irreparables: ['raro'] });
  });

  it('ida y vuelta preserva todo incluyendo reparables y _irreparables no-objeto', () => {
    const raw = {
      seguros: [{ id: 's1', divisa: 'GBP', vencimiento: '31/12/2026', sumaAsegurada: 'ocho' }],
      contactos: [{ id: 'c1', nombre: { a: 1 }, whatsapp: '55' }],
      pagos: { 'sub:x': { decision: 'vender', nota: 'x', extra: 1 } },
      _irreparables: 'raro',
    };
    const una = normalizarInfoFamilia(raw);
    const dos = normalizarInfoFamilia(serializarInfoFamilia(una));
    expect(dos).toEqual(una);
  });
});

describe('diasDesdeRevision same-day is +0', () => {
  it('Object.is(diasDesdeRevision(same-day), 0) is true', () => {
    const fecha = new Date(2026, 8, 30, 23, 30).toISOString();
    const result = diasDesdeRevision(fecha, NOW);
    expect(Object.is(result, 0)).toBe(true);
    expect(result).toBe(0);
  });
});
