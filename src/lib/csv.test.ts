import { describe, expect, it } from 'vitest';
import { valorCSV } from './csv';

describe('valorCSV', () => {
  it('vacío para null/undefined y tal cual para valores simples', () => {
    expect(valorCSV(null)).toBe('');
    expect(valorCSV(undefined)).toBe('');
    expect(valorCSV(12.5)).toBe('12.5');
    expect(valorCSV(true)).toBe('true');
    expect(valorCSV('hola')).toBe('hola');
  });

  it('entrecomilla comas, comillas y saltos de línea, duplicando las comillas', () => {
    expect(valorCSV('a,b')).toBe('"a,b"');
    expect(valorCSV('dijo "sí"')).toBe('"dijo ""sí"""');
    expect(valorCSV('línea 1\nlínea 2')).toBe('"línea 1\nlínea 2"');
    expect(valorCSV('a\r\nb')).toBe('"a\r\nb"');
  });

  it('serializa objetos y arrays como JSON escapado', () => {
    expect(valorCSV({ carta: 'Hola' })).toBe('"{""carta"":""Hola""}"');
    expect(valorCSV(['x'])).toBe('"[""x""]"');
  });
});
