import { describe, expect, it } from 'vitest';
import { parseFechaLocal } from '@/lib/finance/fechas';
import { posiblesDuplicados } from './posiblesDuplicados';

// Transaction.fecha y la fila del archivo llegan ambas en medianoche local.
const tx = (id: string, iso: string, monto: number, cuentaId = 'hsbc') => ({
  id, cuentaId, fecha: parseFechaLocal(iso), monto, comentario: id,
});
const fila = (id: string, y: number, m: number, d: number, monto: number, esGasto = true, descripcion = '') => ({
  id, fecha: new Date(y, m - 1, d), monto, esGasto, esReembolso: false, descripcion,
});

describe('posibles duplicados al importar', () => {
  it('detecta el mismo monto en la misma cuenta aunque la descripción no se parezca', () => {
    // El caso real: "Pago Mastercard" capturado a mano y "PAGO AUT TARJ CRED" en el estado HSBC.
    const r = posiblesDuplicados([fila('f1', 2026, 8, 31, 18839.78)], [tx('manual', '2026-08-31', -18839.78)], 'hsbc');
    expect(r.get('f1')?.id).toBe('manual');
  });

  it('acepta hasta 2 días de diferencia y no más', () => {
    const existentes = [tx('t', '2026-08-31', -100)];
    expect(posiblesDuplicados([fila('a', 2026, 9, 2, 100)], existentes, 'hsbc').has('a')).toBe(true);
    expect(posiblesDuplicados([fila('b', 2026, 9, 3, 100)], existentes, 'hsbc').has('b')).toBe(false);
  });

  it('ignora otras cuentas y el sentido contrario', () => {
    const existentes = [tx('otra', '2026-08-31', -100, 'amex'), tx('ingreso', '2026-08-31', 100)];
    expect(posiblesDuplicados([fila('f', 2026, 8, 31, 100)], existentes, 'hsbc').size).toBe(0);
  });

  it('un reembolso del archivo es una entrada', () => {
    const f = { ...fila('r', 2026, 8, 31, 50), esReembolso: true };
    expect(posiblesDuplicados([f], [tx('t', '2026-08-31', 50)], 'hsbc').get('r')?.id).toBe('t');
  });

  it('cada movimiento existente cubre a una sola fila: dos cargos iguales con uno ya capturado marcan uno', () => {
    const filas = [fila('a', 2026, 9, 7, 350), fila('b', 2026, 9, 7, 350)];
    const r = posiblesDuplicados(filas, [tx('t', '2026-09-07', -350)], 'hsbc');
    expect(r.size).toBe(1);
  });

  it('prefiere el existente de fecha más cercana', () => {
    const existentes = [tx('lejos', '2026-08-29', -100), tx('cerca', '2026-08-31', -100)];
    expect(posiblesDuplicados([fila('f', 2026, 8, 31, 100)], existentes, 'hsbc').get('f')?.id).toBe('cerca');
  });

  it('un cargo recurrente con el mismo texto del banco a 1-2 días no es duplicado (casetas de AMEX)', () => {
    const caseta = 'PASE D ISRA O -PALMAS P MIGUEL HIDALGO';
    const existentes = [tx(caseta, '2026-09-05', -20.97, 'amex')];
    const filas = [fila('6sep', 2026, 9, 6, 20.97, true, caseta), fila('7sep', 2026, 9, 7, 20.97, true, caseta)];
    expect(posiblesDuplicados(filas, existentes, 'amex').size).toBe(0);
  });

  it('la misma línea del banco el mismo día sí es duplicado (estados que se solapan)', () => {
    const caseta = 'PASE D ISRA O -PALMAS P MIGUEL HIDALGO';
    const r = posiblesDuplicados([fila('f', 2026, 9, 5, 20.97, true, '  pase d isra o -palmas p  miguel hidalgo ')], [tx(caseta, '2026-09-05', -20.97, 'amex')], 'amex');
    expect(r.get('f')?.id).toBe(caseta);
  });

  it('tolera redondeo de centavos', () => {
    expect(posiblesDuplicados([fila('f', 2026, 8, 31, 100.004)], [tx('t', '2026-08-31', -100)], 'hsbc').has('f')).toBe(true);
  });
});
