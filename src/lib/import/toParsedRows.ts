import { AccountType, Category, TransactionType } from '@/types/finance';
import { RawMovement } from './bankStatementParser';
import { CategorySuggestion } from './importCategorizer';

export interface ParsedRow {
  id: string;
  sourceRow: number;
  fecha: Date;
  descripcion: string;
  monto: number;
  esGasto: boolean;
  esReembolso: boolean;
  categoriaId: string;
  incluir: boolean;
  /** Signo ya ajustado al tipo de cuenta (convención de siempre; lo usa el toggle de reembolso). */
  montoOriginal: number;
  tipo: TransactionType;
  tarjetahabiente?: string;
  /** Por qué se sugirió la categoría; undefined si no hubo sugerencia. */
  suggestion?: CategorySuggestion;
  /** true cuando el usuario la cambió a mano en el preview. */
  categoriaManual: boolean;
}

/**
 * Importe con signo: negativo lo que sale, positivo lo que entra. Los reembolsos
 * cuentan como entrada aunque su categoría sea de gasto (misma regla que el +/-
 * de la tabla y que los totales del pie).
 */
export const montoConSigno = (row: Pick<ParsedRow, 'monto' | 'esGasto' | 'esReembolso'>): number =>
  row.esGasto && !row.esReembolso ? -row.monto : row.monto;

/** true para ingresos y reembolsos: lo que entra a la cuenta. */
export const esEntrada = (row: Pick<ParsedRow, 'esGasto' | 'esReembolso'>): boolean =>
  !row.esGasto || row.esReembolso;

export type Categorizer = (descripcion: string, monto: number) => CategorySuggestion | null;

/**
 * Signo → gasto/ingreso según el tipo de cuenta (tarjeta: positivo = gasto;
 * banco: negativo = gasto) + sugerencia de categoría. El tipo de la categoría
 * sugerida solo se adopta si es compatible con el signo.
 */
export const toParsedRows = (
  movements: RawMovement[],
  tipoCuenta: AccountType,
  categorizer: Categorizer,
  categories: Category[],
  sinAsignarId: string | undefined,
): ParsedRow[] => {
  const isCreditCard = tipoCuenta === 'Tarjeta de Crédito';
  const byId = new Map(categories.map((c) => [c.id, c]));
  const stamp = Date.now();

  return movements.map((m, i) => {
    let montoOriginal: number;
    if (m.cargoAbono === 'cargo') montoOriginal = isCreditCard ? Math.abs(m.montoOriginal) : -Math.abs(m.montoOriginal);
    else if (m.cargoAbono === 'abono') montoOriginal = isCreditCard ? -Math.abs(m.montoOriginal) : Math.abs(m.montoOriginal);
    else montoOriginal = m.montoOriginal;

    const monto = Math.abs(montoOriginal);
    const suggestion = categorizer(m.descripcion, monto) ?? undefined;
    const matched = suggestion ? byId.get(suggestion.categoriaId) : undefined;
    const isExpenseLike = isCreditCard ? montoOriginal > 0 : montoOriginal < 0;

    let tipo: TransactionType;
    if (matched?.tipo) {
      const ct = matched.tipo;
      if (isExpenseLike && (ct === 'Gastos' || ct === 'Retiro')) tipo = ct;
      else if (!isExpenseLike && (ct === 'Ingreso' || ct === 'Aportación')) tipo = ct;
      else tipo = isExpenseLike ? 'Gastos' : 'Ingreso';
    } else {
      tipo = isExpenseLike ? 'Gastos' : 'Ingreso';
    }

    // Un abono cuya categoría sugerida es de gasto es un reembolso: dinero que
    // vuelve de un gasto anterior (devolución de una compra, gasto médico que
    // te reintegran). Se marca solo; la casilla del preview sigue mandando.
    const esReembolso = !isExpenseLike && (matched?.tipo === 'Gastos' || matched?.tipo === 'Reembolso');

    return {
      id: `import-${i}-${stamp}`,
      sourceRow: m.sourceRow,
      fecha: m.fecha,
      descripcion: m.descripcion,
      monto,
      esGasto: tipo === 'Gastos' || tipo === 'Retiro',
      esReembolso,
      categoriaId: suggestion?.categoriaId || sinAsignarId || '',
      incluir: true,
      montoOriginal,
      tipo,
      tarjetahabiente: m.tarjetahabiente,
      suggestion,
      categoriaManual: false,
    };
  });
};
