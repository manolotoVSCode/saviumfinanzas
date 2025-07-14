import { useState, useMemo } from 'react';
import { Account, Category, Transaction, DashboardMetrics, AccountType, TransactionType } from '@/types/finance';

// Data inicial simple
const initialAccountTypes: AccountType[] = [
  'Efectivo', 'Banco', 'Tarjeta de Crédito', 'Ahorros', 'Inversiones', 'Hipoteca', 'Empresa Propia'
];

const initialAccounts: Account[] = [
  { id: '1', nombre: 'Efectivo', tipo: 'Efectivo', saldoInicial: 0, saldoActual: 0 },
  { id: '2', nombre: 'Cuenta de Cheques', tipo: 'Banco', saldoInicial: 0, saldoActual: 0 },
  { id: '3', nombre: 'Tarjeta de Crédito', tipo: 'Tarjeta de Crédito', saldoInicial: 0, saldoActual: 0 },
  { id: '4', nombre: 'Ahorros', tipo: 'Ahorros', saldoInicial: 0, saldoActual: 0 },
  { id: '5', nombre: 'QUANT', tipo: 'Inversiones', saldoInicial: 48000, saldoActual: 48000, valorMercado: 48000 },
  { id: '6', nombre: 'AMEX', tipo: 'Tarjeta de Crédito', saldoInicial: 0, saldoActual: 0 },
  { id: '7', nombre: 'Mastercard', tipo: 'Tarjeta de Crédito', saldoInicial: 0, saldoActual: 0 }
];

const initialCategories: Category[] = [
  { id: '1', subcategoria: 'Salario', categoria: 'Ingresos', tipo: 'Ingreso' },
  { id: '2', subcategoria: 'Comida', categoria: 'Alimentación', tipo: 'Gastos' },
  { id: '3', subcategoria: 'Transporte', categoria: 'Movilidad', tipo: 'Gastos' },
  { id: '4', subcategoria: 'Entretenimiento', categoria: 'Ocio', tipo: 'Gastos' },
  { id: '5', subcategoria: 'Bonos / Comisiones', categoria: 'Ingresos', tipo: 'Ingreso' },
  { id: '6', subcategoria: 'Aportaciones', categoria: 'Inversiones', tipo: 'Aportación' },
];

export const useFinanceData = () => {
  const [accounts, setAccounts] = useState<Account[]>(() => {
    try {
      const stored = localStorage.getItem('financeAccounts');
      return stored ? JSON.parse(stored) : initialAccounts;
    } catch {
      return initialAccounts;
    }
  });
  
  const [categories, setCategories] = useState<Category[]>(() => {
    try {
      const stored = localStorage.getItem('financeCategories');
      return stored ? JSON.parse(stored) : initialCategories;
    } catch {
      return initialCategories;
    }
  });
  
  const [transactions, setTransactions] = useState<Transaction[]>(() => {
    try {
      const stored = localStorage.getItem('financeTransactions');
      if (stored) {
        const parsed = JSON.parse(stored);
        return parsed.map((t: any) => ({
          ...t,
          fecha: new Date(t.fecha)
        }));
      }
    } catch {}
    return [];
  });

  const [accountTypes] = useState<AccountType[]>(initialAccountTypes);
  const [dateFilter, setDateFilter] = useState<{ start: Date; end: Date }>({
    start: new Date(2025, 0, 1),
    end: new Date(2025, 11, 31)
  });

  // Calcular saldos actuales
  const accountsWithBalances = useMemo(() => {
    return accounts.map(account => {
      const accountTransactions = transactions.filter(t => t.cuentaId === account.id);
      const totalTransactions = accountTransactions.reduce((sum, t) => sum + t.monto, 0);
      return {
        ...account,
        saldoActual: account.saldoInicial + totalTransactions
      };
    });
  }, [accounts, transactions]);

  // Transacciones enriquecidas
  const enrichedTransactions = useMemo(() => {
    return transactions.map(transaction => {
      const category = categories.find(c => c.id === transaction.subcategoriaId);
      return {
        ...transaction,
        categoria: category?.categoria,
        tipo: category?.tipo
      };
    });
  }, [transactions, categories]);

  // Dashboard metrics básico
  const dashboardMetrics = useMemo((): DashboardMetrics => {
    const totalBalance = accountsWithBalances.reduce((sum, account) => sum + account.saldoActual, 0);
    
    return {
      balanceTotal: totalBalance,
      activos: {
        efectivoBancos: accountsWithBalances.filter(a => ['Efectivo', 'Banco', 'Ahorros'].includes(a.tipo)).reduce((s, a) => s + a.saldoActual, 0),
        inversiones: accountsWithBalances.filter(a => a.tipo === 'Inversiones').reduce((s, a) => s + a.saldoActual, 0),
        empresasPrivadas: 0,
        total: totalBalance > 0 ? totalBalance : 0
      },
      pasivos: {
        tarjetasCredito: Math.abs(accountsWithBalances.filter(a => a.tipo === 'Tarjeta de Crédito').reduce((s, a) => s + Math.min(0, a.saldoActual), 0)),
        hipoteca: 0,
        total: 0
      },
      patrimonioNeto: totalBalance,
      patrimonioNetoAnterior: totalBalance,
      variacionPatrimonio: 0,
      ingresosMes: enrichedTransactions.filter(t => t.tipo === 'Ingreso').reduce((s, t) => s + t.ingreso, 0),
      gastosMes: enrichedTransactions.filter(t => t.tipo === 'Gastos').reduce((s, t) => s + t.gasto, 0),
      balanceMes: 0,
      ingresosAnio: 0,
      gastosAnio: 0,
      balanceAnio: 0,
      ingresosMesAnterior: 0,
      gastosMesAnterior: 0,
      balanceMesAnterior: 0,
      variacionIngresos: 0,
      variacionGastos: 0,
      ingresosAnioAnterior: 0,
      gastosAnioAnterior: 0,
      balanceAnioAnterior: 0,
      variacionIngresosAnual: 0,
      variacionGastosAnual: 0,
      variacionBalanceAnual: 0,
      saludFinanciera: {
        score: 8,
        nivel: 'Buena',
        descripcion: 'Situación financiera estable'
      },
      distribucionActivos: [],
      topCategorias: [],
      topCategoriasMesAnterior: [],
      topCategoriasAnual: [],
      cuentasResumen: accountsWithBalances.map(a => ({ cuenta: a.nombre, saldo: a.saldoActual, tipo: a.tipo })),
      tendenciaMensual: [],
      inversionesResumen: {
        totalInversiones: accountsWithBalances.filter(a => a.tipo === 'Inversiones').reduce((s, a) => s + a.saldoActual, 0),
        aportacionesMes: 0,
        aportacionesMesAnterior: 0,
        variacionAportaciones: 0,
        cuentasInversion: []
      }
    };
  }, [accountsWithBalances, enrichedTransactions]);

  // Funciones CRUD
  const addAccount = (account: Omit<Account, 'id'>) => {
    const newAccount: Account = { ...account, id: Date.now().toString(), saldoActual: account.saldoInicial };
    const updated = [...accounts, newAccount];
    setAccounts(updated);
    localStorage.setItem('financeAccounts', JSON.stringify(updated));
  };

  const updateAccount = (id: string, updates: Partial<Account>) => {
    const updated = accounts.map(acc => acc.id === id ? { ...acc, ...updates } : acc);
    setAccounts(updated);
    localStorage.setItem('financeAccounts', JSON.stringify(updated));
  };

  const deleteAccount = (id: string) => {
    const updated = accounts.filter(acc => acc.id !== id);
    setAccounts(updated);
    localStorage.setItem('financeAccounts', JSON.stringify(updated));
  };

  const addCategory = (category: Omit<Category, 'id'>) => {
    const newCategory: Category = { ...category, id: Date.now().toString() };
    const updated = [...categories, newCategory];
    setCategories(updated);
    localStorage.setItem('financeCategories', JSON.stringify(updated));
  };

  const updateCategory = (id: string, updates: Partial<Category>) => {
    const updated = categories.map(cat => cat.id === id ? { ...cat, ...updates } : cat);
    setCategories(updated);
    localStorage.setItem('financeCategories', JSON.stringify(updated));
  };

  const deleteCategory = (id: string) => {
    const updated = categories.filter(cat => cat.id !== id);
    setCategories(updated);
    localStorage.setItem('financeCategories', JSON.stringify(updated));
  };

  const addTransaction = (transaction: Omit<Transaction, 'id' | 'monto'>) => {
    const newTransaction: Transaction = {
      ...transaction,
      id: Date.now().toString(),
      monto: transaction.ingreso - transaction.gasto
    };
    const updated = [...transactions, newTransaction];
    setTransactions(updated);
    localStorage.setItem('financeTransactions', JSON.stringify(updated));
  };

  const addTransactionsBatch = (newTransactions: Omit<Transaction, 'id' | 'monto'>[]) => {
    const transactions: Transaction[] = newTransactions.map(transaction => {
      const id = (transaction as any).csvId || Date.now().toString() + Math.random().toString(36).substr(2, 9);
      return {
        ...transaction,
        id: id,
        monto: transaction.ingreso - transaction.gasto,
      };
    });
    const updated = [...transactions, ...transactions];
    setTransactions(updated);
    localStorage.setItem('financeTransactions', JSON.stringify(updated));
  };

  const updateTransaction = (id: string, updates: Partial<Transaction>) => {
    const updated = transactions.map(t => 
      t.id === id ? { 
        ...t, 
        ...updates,
        monto: (updates.ingreso ?? t.ingreso) - (updates.gasto ?? t.gasto)
      } : t
    );
    setTransactions(updated);
    localStorage.setItem('financeTransactions', JSON.stringify(updated));
  };

  const deleteTransaction = (id: string) => {
    const updated = transactions.filter(t => t.id !== id);
    setTransactions(updated);
    localStorage.setItem('financeTransactions', JSON.stringify(updated));
  };

  const clearAllTransactions = () => {
    setTransactions([]);
    localStorage.setItem('financeTransactions', JSON.stringify([]));
  };

  return {
    accounts: accountsWithBalances,
    categories,
    transactions: enrichedTransactions,
    accountTypes,
    dashboardMetrics,
    dateFilter,
    addAccount,
    updateAccount,
    deleteAccount,
    addCategory,
    updateCategory,
    deleteCategory,
    addTransaction,
    addTransactionsBatch,
    updateTransaction,
    deleteTransaction,
    clearAllTransactions,
    setDateFilter,
  };
};