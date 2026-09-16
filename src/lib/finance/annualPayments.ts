import { Category, Transaction } from '@/types/finance';

export interface AnnualPaymentGroup {
  /** `${categoryId}-${conceptoNormalizado}` — estable entre sesiones (se usa en localStorage). */
  id: string;
  categoryId: string;
  categoryName: string;
  subcategoryName: string;
  /** Comentario del último pago, para mostrar. */
  concept: string;
  lastAmount: number;
  lastDate: Date;
  /** Un año después del último pago. */
  nextPayment: Date;
  history: Array<{ date: Date; amount: number; comment: string }>;
  totalPaid: number;
}

/** Normaliza el comentario para agrupar pagos del mismo concepto en distintos años. */
export const normalizeAnnualConcept = (comment: string): string =>
  comment
    .toLowerCase()
    .replace(/\d{4}/g, '') // Remove years
    .replace(/\d{1,2}\/\d{1,2}/g, '') // Remove dates
    .replace(/[^\w\sáéíóúñ]/g, '') // Remove special chars
    .replace(/\s+/g, ' ')
    .trim()
    .substring(0, 30); // Take first 30 chars for grouping

export const isAnnualCategory = (c: Category): boolean =>
  c.tipo === 'Gastos' && c.frecuencia_seguimiento === 'anual';

/**
 * Agrupa los gastos de las categorías con seguimiento anual por concepto y
 * predice el siguiente pago sumando un año al último. Ordenado por próximo pago.
 */
export const groupAnnualPayments = (categories: Category[], transactions: Transaction[]): AnnualPaymentGroup[] => {
  const groups: AnnualPaymentGroup[] = [];

  categories.filter(isAnnualCategory).forEach(category => {
    const categoryTransactions = transactions
      .filter(t => t.subcategoriaId === category.id && t.gasto > 0)
      .sort((a, b) => new Date(b.fecha).getTime() - new Date(a.fecha).getTime());

    if (categoryTransactions.length === 0) return;

    const byConcept = new Map<string, typeof categoryTransactions>();
    categoryTransactions.forEach(t => {
      const key = normalizeAnnualConcept(t.comentario);
      if (!byConcept.has(key)) byConcept.set(key, []);
      byConcept.get(key)!.push(t);
    });

    byConcept.forEach((group, key) => {
      const last = group[0];
      const lastDate = new Date(last.fecha);
      const nextPayment = new Date(lastDate);
      nextPayment.setFullYear(nextPayment.getFullYear() + 1);

      groups.push({
        id: `${category.id}-${key}`,
        categoryId: category.id,
        categoryName: category.categoria,
        subcategoryName: category.subcategoria,
        concept: last.comentario,
        lastAmount: last.gasto,
        lastDate,
        nextPayment,
        history: group.map(t => ({ date: new Date(t.fecha), amount: t.gasto, comment: t.comentario })),
        totalPaid: group.reduce((sum, t) => sum + t.gasto, 0),
      });
    });
  });

  return groups.sort((a, b) => a.nextPayment.getTime() - b.nextPayment.getTime());
};
