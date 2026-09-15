import { Account, Category, Transaction } from '@/types/finance';

/** saldoActual = saldoInicial + suma de transacciones, para TODAS las cuentas. */
export const computeAccountBalances = (accounts: Account[], transactions: Transaction[]): Account[] => {
  return accounts.map(account => {
    const accountTransactions = transactions.filter(t => t.cuentaId === account.id);
    const totalTransactions = accountTransactions.reduce((sum, t) => sum + t.monto, 0);
    return { ...account, saldoActual: account.saldoInicial + totalTransactions };
  });
};

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
