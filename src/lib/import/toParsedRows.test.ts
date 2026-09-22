import { describe, expect, it } from 'vitest';
import { Category } from '@/types/finance';
import { RawMovement } from './bankStatementParser';
import { esEntrada, montoConSigno, toParsedRows } from './toParsedRows';

const mov = (over: Partial<RawMovement>): RawMovement => ({ sourceRow: 0, fecha: new Date(2026, 7, 5), descripcion: 'X', montoOriginal: -100, ...over });
const cats: Category[] = [
  { id: 'gasto', categoria: 'Casa', subcategoria: 'Luz', tipo: 'Gastos' },
  { id: 'retiro', categoria: 'Inversión', subcategoria: 'Retiro', tipo: 'Retiro' },
  { id: 'ingreso', categoria: 'Sueldo', subcategoria: 'Nómina', tipo: 'Ingreso' },
];
const sug = (categoriaId: string) => () => ({ categoriaId, source: 'regla' as const, detail: 'Regla · x', confidence: 'alta' as const });

describe('toParsedRows', () => {
  it('banco: negativo = gasto, positivo = ingreso; tarjeta: al revés', () => {
    const [g, i] = toParsedRows([mov({ montoOriginal: -100 }), mov({ montoOriginal: 100 })], 'Banco', () => null, cats, 'sin');
    expect(g).toMatchObject({ esGasto: true, tipo: 'Gastos', monto: 100, montoOriginal: -100, categoriaId: 'sin', categoriaManual: false });
    expect(i).toMatchObject({ esGasto: false, tipo: 'Ingreso', monto: 100 });
    const [tg] = toParsedRows([mov({ montoOriginal: 100 })], 'Tarjeta de Crédito', () => null, cats, 'sin');
    expect(tg).toMatchObject({ esGasto: true, montoOriginal: 100 });
  });

  it('cargo/abono: montoOriginal firmado según el tipo de cuenta', () => {
    const [c, a] = toParsedRows([mov({ montoOriginal: 500, cargoAbono: 'cargo' }), mov({ montoOriginal: 900, cargoAbono: 'abono' })], 'Banco', () => null, cats, 'sin');
    expect(c).toMatchObject({ montoOriginal: -500, esGasto: true });
    expect(a).toMatchObject({ montoOriginal: 900, esGasto: false });
    const [tc] = toParsedRows([mov({ montoOriginal: 500, cargoAbono: 'cargo' })], 'Tarjeta de Crédito', () => null, cats, 'sin');
    expect(tc).toMatchObject({ montoOriginal: 500, esGasto: true });
  });

  it('usa el tipo de la categoría sugerida solo si es compatible con el signo', () => {
    const [r] = toParsedRows([mov({ montoOriginal: -100 })], 'Banco', sug('retiro'), cats, 'sin');
    expect(r).toMatchObject({ tipo: 'Retiro', esGasto: true, categoriaId: 'retiro' });
    expect(r.suggestion?.source).toBe('regla');
    const [x] = toParsedRows([mov({ montoOriginal: -100 })], 'Banco', sug('ingreso'), cats, 'sin');
    expect(x).toMatchObject({ tipo: 'Gastos', esGasto: true, categoriaId: 'ingreso' });
  });

  it('conserva sourceRow y tarjetahabiente', () => {
    const [r] = toParsedRows([mov({ sourceRow: 7, tarjetahabiente: 'MANUEL' })], 'Banco', () => null, cats, 'sin');
    expect(r).toMatchObject({ sourceRow: 7, tarjetahabiente: 'MANUEL', incluir: true, esReembolso: false });
  });
});

describe('montoConSigno y esEntrada', () => {
  const fila = (over: { monto: number; esGasto: boolean; esReembolso: boolean }) => over;

  it('el gasto va en negativo y el ingreso en positivo: no empatan al ordenar', () => {
    const gasto = fila({ monto: 500, esGasto: true, esReembolso: false });
    const ingreso = fila({ monto: 500, esGasto: false, esReembolso: false });
    expect(montoConSigno(gasto)).toBe(-500);
    expect(montoConSigno(ingreso)).toBe(500);
    expect([gasto, ingreso].sort((a, b) => montoConSigno(a) - montoConSigno(b))).toEqual([gasto, ingreso]);
  });

  it('un reembolso cuenta como entrada aunque su categoría sea de gasto', () => {
    const reembolso = fila({ monto: 300, esGasto: true, esReembolso: true });
    expect(montoConSigno(reembolso)).toBe(300);
    expect(esEntrada(reembolso)).toBe(true);
    expect(esEntrada(fila({ monto: 300, esGasto: true, esReembolso: false }))).toBe(false);
    expect(esEntrada(fila({ monto: 300, esGasto: false, esReembolso: false }))).toBe(true);
  });
});
