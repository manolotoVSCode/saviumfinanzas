import { describe, expect, it } from 'vitest';
import { esReembolso, gastoNeto, montoEnCategoriaDeGasto } from './reembolsos';

const cargo = { gasto: 5928.63, ingreso: 0 };
const reembolso = { gasto: 0, ingreso: 20000 };

describe('reembolsos en categorías de gasto', () => {
  it('reconoce un ingreso dentro de una categoría de gasto', () => {
    expect(esReembolso(reembolso)).toBe(true);
    expect(esReembolso(cargo)).toBe(false);
  });

  it('el cargo suma y el reembolso resta', () => {
    expect(montoEnCategoriaDeGasto(cargo)).toBe(5928.63);
    expect(montoEnCategoriaDeGasto(reembolso)).toBe(-20000);
  });

  it('el neto de la categoría descuenta los reembolsos', () => {
    // El caso real: tres cargos y un reembolso de 20.000 que antes contaba como 0.
    const neto = gastoNeto([
      { gasto: 5928.63, ingreso: 0 },
      { gasto: 56100.48, ingreso: 0 },
      { gasto: 40000, ingreso: 0 },
      reembolso,
    ]);
    expect(neto).toBeCloseTo(82029.11, 2);
  });

  it('una lista vacía da cero', () => {
    expect(gastoNeto([])).toBe(0);
  });
});
