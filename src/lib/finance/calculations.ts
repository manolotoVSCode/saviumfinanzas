import { Category, Transaction } from '@/types/finance';

/** Añade categoría, subcategoría y tipo a cada transacción (Map para acceso O(1)). */
export const enrichTransactions = (transactions: Transaction[], categories: Category[]): Transaction[] => {
  const categoryMap = new Map<string, Category>();
  categories.forEach(c => categoryMap.set(c.id, c));
  return transactions.map(transaction => {
    const category = categoryMap.get(transaction.subcategoriaId);
    return {
      ...transaction,
      categoria: category?.categoria || 'SIN ASIGNAR',
      subcategoria: category?.subcategoria || 'SIN ASIGNAR',
      tipo: category?.tipo || undefined
    };
  });
};
