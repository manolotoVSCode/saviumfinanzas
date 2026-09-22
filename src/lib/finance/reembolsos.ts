import { Transaction } from '@/types/finance';

type TxMonto = Pick<Transaction, 'ingreso' | 'gasto'>;

/**
 * Reembolso: un ingreso registrado en una categoría de gasto (devolución de una
 * compra, un gasto que te reintegran). No tiene columna propia; se reconoce por
 * la forma. El llamador ya ha filtrado por categorías de tipo 'Gastos'.
 */
export const esReembolso = (t: TxMonto): boolean => Number(t.ingreso || 0) > 0;

/**
 * Lo que una transacción aporta al gasto de su categoría: el cargo suma y el
 * reembolso resta. Es la misma regla con la que el dashboard calcula el gasto
 * del mes (gastos − reembolsos), así que el detalle cuadra con la tarjeta.
 */
export const montoEnCategoriaDeGasto = (t: TxMonto): number =>
  Number(t.gasto || 0) - Number(t.ingreso || 0);

/** Gasto neto de una lista de transacciones de categorías de gasto. */
export const gastoNeto = (transactions: TxMonto[]): number =>
  transactions.reduce((sum, t) => sum + montoEnCategoriaDeGasto(t), 0);
