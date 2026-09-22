import { describe, expect, it } from 'vitest';
import * as XLSX from 'xlsx';
import { decodeBytes, detectDateAmbiguity, parseAmount, parseBankStatement, parseCsvText, parseDate, parseRows } from './bankStatementParser';

const utf8 = (s: string): ArrayBuffer => new TextEncoder().encode(s).buffer as ArrayBuffer;
const local = (y: number, m: number, d: number) => new Date(y, m - 1, d);

describe('parseAmount', () => {
  it('europeo, americano, símbolos y signo', () => {
    expect(parseAmount('1.234,56')).toBe(1234.56);
    expect(parseAmount('1,234.56')).toBe(1234.56);
    expect(parseAmount('-$1,234.56')).toBe(-1234.56);
    expect(parseAmount('129,00 EUR')).toBe(129);
    expect(parseAmount('N/A')).toBe(0);
    expect(parseAmount('')).toBe(0);
  });
});

describe('parseDate', () => {
  it('DD/MM/YYYY por defecto, MM/DD con pista, ISO y "DD Mon YYYY", siempre en local', () => {
    expect(parseDate('05/08/2026')).toEqual(local(2026, 8, 5));
    expect(parseDate('05/08/2026', 'MDY')).toEqual(local(2026, 5, 8));
    expect(parseDate('25/08/2026', 'MDY')).toEqual(local(2026, 8, 25)); // 25 no puede ser mes
    expect(parseDate('2026-08-05')).toEqual(local(2026, 8, 5));
    expect(parseDate('5 ago 2026')).toEqual(local(2026, 8, 5));
    expect(parseDate('sin fecha')).toBeNull();
  });
});

describe('detectDateAmbiguity', () => {
  it('es ambiguo cuando día y mes son ≤ 12', () => {
    expect(detectDateAmbiguity([['01/02/2026']], 0)).toBe(true);
    expect(detectDateAmbiguity([['25/02/2026']], 0)).toBe(false);
  });
});

describe('decodeBytes', () => {
  it('UTF-8 (quitando BOM) y Latin-1 cuando los bytes no son UTF-8 válidos', () => {
    const conBom = new Uint8Array([0xef, 0xbb, 0xbf, ...new TextEncoder().encode('Fecha')]);
    expect(decodeBytes(conBom)).toEqual({ text: 'Fecha', encoding: 'utf-8' });
    const latin1 = new Uint8Array([0x43, 0x41, 0x46, 0xc9]); // "CAFÉ" en Windows-1252
    expect(decodeBytes(latin1)).toEqual({ text: 'CAFÉ', encoding: 'windows-1252' });
  });
});

describe('parseCsvText', () => {
  it('autodetecta el separador ; y decimales europeos', () => {
    const r = parseCsvText('Fecha;Concepto;Importe\n05/08/2026;NETFLIX;-1.234,56\n');
    expect(r.delimiter).toBe(';');
    expect(r.movements).toHaveLength(1);
    expect(r.movements[0]).toMatchObject({ sourceRow: 0, descripcion: 'NETFLIX', montoOriginal: -1234.56 });
    expect(r.movements[0].fecha).toEqual(local(2026, 8, 5));
  });

  it('columnas Cargo/Abono: importe absoluto y cargoAbono', () => {
    const r = parseCsvText('Fecha,Descripción,Cargo,Abono\n01/08/2026,PAGO LUZ,500,\n02/08/2026,NOMINA,,"10,000.00"\n');
    expect(r.movements[0]).toMatchObject({ montoOriginal: 500, cargoAbono: 'cargo' });
    expect(r.movements[1]).toMatchObject({ montoOriginal: 10000, cargoAbono: 'abono' });
  });

  it('preámbulo BBVA y campo multilínea AMEX', () => {
    const r = parseCsvText('Cuenta: 123\nDETALLE DE MOVIMIENTOS\n\nFecha,Descripción,Cargo,Abono,Saldo\n01/08/2026,"AMEX\nMADRID",100,,900\n');
    expect(r.movements).toHaveLength(1);
    expect(r.movements[0].descripcion).toBe('AMEX\nMADRID');
    expect(r.movements[0].montoOriginal).toBe(100);
  });

  it('descarta con motivo: sin fecha, monto cero, monto inválido', () => {
    const r = parseCsvText('Fecha,Concepto,Importe\nTotal,,\n05/08/2026,CERO,0\n06/08/2026,RARO,N/A\n07/08/2026,OK,10\n');
    expect(r.movements).toHaveLength(1);
    expect(r.skipped.map(s => s.reason)).toEqual(['sin_fecha', 'monto_cero', 'monto_invalido']);
    expect(r.skipped[0].cells).toEqual(['Total', '', '']);
    expect(r.skipped[1].sourceRow).toBe(1);
  });

  it('detecta la columna Tarjetahabiente y la ambigüedad de fechas', () => {
    const r = parseCsvText('Fecha,Descripción,Importe,Titular\n01/02/2026,UBER,120,MANUEL\n');
    expect(r.movements[0].tarjetahabiente).toBe('MANUEL');
    expect(r.movements[0].descripcion).toBe('UBER');
    expect(r.ambiguousDate).toBe(true);
  });
});

describe('parseRows', () => {
  it('sin cabecera, la única columna numérica que no es fecha se toma como importe', () => {
    const r = parseRows([['05/08/2026', 'CONCEPTO SIN CABECERA', 'x', '250']]);
    expect(r.movements[0].montoOriginal).toBe(250);
  });
});

describe('parseBankStatement', () => {
  it('CSV en Latin-1 → descripción legible y encoding en meta', async () => {
    const bytes = new Uint8Array([
      ...new TextEncoder().encode('Fecha,Concepto,Importe\n05/08/2026,CAF'), 0xc9, ...new TextEncoder().encode(' OL'), 0xc9,
      ...new TextEncoder().encode(',-50\n'),
    ]);
    const r = await parseBankStatement(bytes.buffer as ArrayBuffer, 'banco.csv');
    expect(r.meta).toEqual({ delimiter: ',', encoding: 'windows-1252', ambiguousDate: true });
    expect(r.movements[0].descripcion).toBe('CAFÉ OLÉ');
  });

  it('XLSX: la columna Importe detectada por cabecera gana a Saldo', async () => {
    const ws = XLSX.utils.aoa_to_sheet([
      ['Fecha', 'Concepto', 'Importe', 'Saldo'],
      ['05/08/2026', 'SPOTIFY', '-129.00', '10000.00'],
      ['06/08/2026', 'NOMINA', '25000.00', '35000.00'],
    ]);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Hoja1');
    const buf = XLSX.write(wb, { type: 'array', bookType: 'xlsx' }) as ArrayBuffer;
    const r = await parseBankStatement(buf, 'estado.xlsx');
    expect(r.meta.encoding).toBe('utf-8');
    expect(r.movements.map(m => m.montoOriginal)).toEqual([-129, 25000]);
    expect(r.movements[0].descripcion).toBe('SPOTIFY');
    expect(r.movements[0].fecha).toEqual(local(2026, 8, 5));
  });

  it('CSV UTF-8 con BOM: la cabecera Fecha se reconoce igual', async () => {
    const r = await parseBankStatement(utf8('﻿Fecha,Concepto,Importe\n25/08/2026,OK,10\n'), 'x.csv');
    expect(r.meta.encoding).toBe('utf-8');
    expect(r.movements).toHaveLength(1);
    expect(r.skipped).toHaveLength(0);
  });
});
