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

  // Dashboard metrics mejorado y completo
  const dashboardMetrics = useMemo((): DashboardMetrics => {
    const now = new Date();
    
    // Filtrar transacciones por períodos
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0);
    const startOfLastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const endOfLastMonth = new Date(now.getFullYear(), now.getMonth(), 0);
    const startOfYear = new Date(now.getFullYear(), 0, 1);
    const endOfYear = new Date(now.getFullYear(), 11, 31);
    const startOfLastYear = new Date(now.getFullYear() - 1, 0, 1);
    const endOfLastYear = new Date(now.getFullYear() - 1, 11, 31);
    
    const transactionsThisMonth = enrichedTransactions.filter(t => t.fecha >= startOfMonth && t.fecha <= endOfMonth);
    const transactionsLastMonth = enrichedTransactions.filter(t => t.fecha >= startOfLastMonth && t.fecha <= endOfLastMonth);
    const transactionsThisYear = enrichedTransactions.filter(t => t.fecha >= startOfYear && t.fecha <= endOfYear);
    const transactionsLastYear = enrichedTransactions.filter(t => t.fecha >= startOfLastYear && t.fecha <= endOfLastYear);
    
    // INGRESOS Y GASTOS MENSUALES
    const ingresosMes = transactionsThisMonth.filter(t => t.tipo === 'Ingreso').reduce((sum, t) => sum + t.ingreso, 0);
    const gastosMes = transactionsThisMonth.filter(t => t.tipo === 'Gastos').reduce((sum, t) => sum + t.gasto, 0);
    const balanceMes = ingresosMes - gastosMes;
    
    // MES ANTERIOR
    const ingresosMesAnterior = transactionsLastMonth.filter(t => t.tipo === 'Ingreso').reduce((sum, t) => sum + t.ingreso, 0);
    const gastosMesAnterior = transactionsLastMonth.filter(t => t.tipo === 'Gastos').reduce((sum, t) => sum + t.gasto, 0);
    const balanceMesAnterior = ingresosMesAnterior - gastosMesAnterior;
    
    // ANUALES
    const ingresosAnio = transactionsThisYear.filter(t => t.tipo === 'Ingreso').reduce((sum, t) => sum + t.ingreso, 0);
    const gastosAnio = transactionsThisYear.filter(t => t.tipo === 'Gastos').reduce((sum, t) => sum + t.gasto, 0);
    const balanceAnio = ingresosAnio - gastosAnio;
    
    // AÑO ANTERIOR
    const ingresosAnioAnterior = transactionsLastYear.filter(t => t.tipo === 'Ingreso').reduce((sum, t) => sum + t.ingreso, 0);
    const gastosAnioAnterior = transactionsLastYear.filter(t => t.tipo === 'Gastos').reduce((sum, t) => sum + t.gasto, 0);
    const balanceAnioAnterior = ingresosAnioAnterior - gastosAnioAnterior;
    
    // VARIACIONES PORCENTUALES
    const variacionIngresos = ingresosMesAnterior > 0 ? ((ingresosMes - ingresosMesAnterior) / ingresosMesAnterior) * 100 : 0;
    const variacionGastos = gastosMesAnterior > 0 ? ((gastosMes - gastosMesAnterior) / gastosMesAnterior) * 100 : 0;
    const variacionIngresosAnual = ingresosAnioAnterior > 0 ? ((ingresosAnio - ingresosAnioAnterior) / ingresosAnioAnterior) * 100 : 0;
    const variacionGastosAnual = gastosAnioAnterior > 0 ? ((gastosAnio - gastosAnioAnterior) / gastosAnioAnterior) * 100 : 0;
    const variacionBalanceAnual = balanceAnioAnterior !== 0 ? ((balanceAnio - balanceAnioAnterior) / Math.abs(balanceAnioAnterior)) * 100 : 0;
    
    // ACTIVOS DETALLADOS
    const activos = {
      efectivoBancos: accountsWithBalances.filter(a => ['Efectivo', 'Banco', 'Ahorros'].includes(a.tipo)).reduce((s, a) => s + a.saldoActual, 0),
      inversiones: accountsWithBalances.filter(a => a.tipo === 'Inversiones').reduce((s, a) => s + (a.valorMercado || a.saldoActual), 0),
      empresasPrivadas: accountsWithBalances.filter(a => a.tipo === 'Empresa Propia').reduce((s, a) => s + a.saldoActual, 0),
      total: 0
    };
    activos.total = activos.efectivoBancos + activos.inversiones + activos.empresasPrivadas;
    
    // PASIVOS DETALLADOS (incluir transacciones de tarjetas de crédito)
    const pasivos = {
      tarjetasCredito: Math.abs(accountsWithBalances.filter(a => a.tipo === 'Tarjeta de Crédito').reduce((s, a) => s + Math.min(0, a.saldoActual), 0)),
      hipoteca: Math.abs(accountsWithBalances.filter(a => a.tipo === 'Hipoteca').reduce((s, a) => s + Math.min(0, a.saldoActual), 0)),
      total: 0
    };
    pasivos.total = pasivos.tarjetasCredito + pasivos.hipoteca;
    
    const patrimonioNeto = activos.total - pasivos.total;
    const patrimonioNetoAnterior = patrimonioNeto - balanceMes;
    const variacionPatrimonio = patrimonioNetoAnterior > 0 ? ((patrimonioNeto - patrimonioNetoAnterior) / patrimonioNetoAnterior) * 100 : 0;
    
    // DISTRIBUCIÓN DE ACTIVOS
    const distribucionActivos = [
      { categoria: 'Efectivo/Bancos', monto: activos.efectivoBancos, porcentaje: activos.total > 0 ? (activos.efectivoBancos / activos.total) * 100 : 0 },
      { categoria: 'Inversiones', monto: activos.inversiones, porcentaje: activos.total > 0 ? (activos.inversiones / activos.total) * 100 : 0 },
      { categoria: 'Empresas', monto: activos.empresasPrivadas, porcentaje: activos.total > 0 ? (activos.empresasPrivadas / activos.total) * 100 : 0 }
    ].filter(item => item.monto > 0);
    
    // DISTRIBUCIÓN DE PASIVOS
    const distribucionPasivos = [
      { categoria: 'Tarjetas de Crédito', monto: pasivos.tarjetasCredito, porcentaje: pasivos.total > 0 ? (pasivos.tarjetasCredito / pasivos.total) * 100 : 0 },
      { categoria: 'Hipoteca', monto: pasivos.hipoteca, porcentaje: pasivos.total > 0 ? (pasivos.hipoteca / pasivos.total) * 100 : 0 }
    ].filter(item => item.monto > 0);
    
    // TOP CATEGORÍAS
    const getCategoryTotals = (transactions: typeof enrichedTransactions) => {
      const categoryTotals = new Map<string, number>();
      transactions.forEach(t => {
        if (t.categoria && t.tipo === 'Gastos') {
          const current = categoryTotals.get(t.categoria) || 0;
          categoryTotals.set(t.categoria, current + t.gasto);
        }
      });
      return Array.from(categoryTotals.entries())
        .map(([categoria, monto]) => ({ categoria, monto, tipo: 'Gastos' as TransactionType }))
        .sort((a, b) => b.monto - a.monto)
        .slice(0, 5);
    };
    
    const topCategorias = getCategoryTotals(transactionsThisMonth);
    const topCategoriasMesAnterior = getCategoryTotals(transactionsLastMonth);
    const topCategoriasAnual = getCategoryTotals(transactionsThisYear);
    
    // TENDENCIA MENSUAL (últimos 6 meses)
    const tendenciaMensual = [];
    for (let i = 5; i >= 0; i--) {
      const date = new Date();
      date.setMonth(date.getMonth() - i);
      const monthStart = new Date(date.getFullYear(), date.getMonth(), 1);
      const monthEnd = new Date(date.getFullYear(), date.getMonth() + 1, 0);
      
      const monthTransactions = enrichedTransactions.filter(t => t.fecha >= monthStart && t.fecha <= monthEnd);
      const ingresos = monthTransactions.filter(t => t.tipo === 'Ingreso').reduce((sum, t) => sum + t.ingreso, 0);
      const gastos = monthTransactions.filter(t => t.tipo === 'Gastos').reduce((sum, t) => sum + t.gasto, 0);
      
      tendenciaMensual.push({
        mes: date.toLocaleDateString('es-MX', { month: 'short', year: '2-digit' }),
        ingresos,
        gastos
      });
    }
    
    // INVERSIONES DETALLADAS (considerando saldo inicial)
    const totalInversiones = accountsWithBalances.filter(a => a.tipo === 'Inversiones').reduce((s, a) => s + (a.valorMercado || a.saldoActual), 0);
    const aportacionesMes = transactionsThisMonth.filter(t => t.tipo === 'Aportación').reduce((s, t) => s + t.ingreso, 0);
    const aportacionesMesAnterior = transactionsLastMonth.filter(t => t.tipo === 'Aportación').reduce((s, t) => s + t.ingreso, 0);
    const variacionAportaciones = aportacionesMesAnterior > 0 ? ((aportacionesMes - aportacionesMesAnterior) / aportacionesMesAnterior) * 100 : 0;
    
    const cuentasInversion = accountsWithBalances
      .filter(a => a.tipo === 'Inversiones')
      .map(a => {
        const aportaciones = enrichedTransactions.filter(t => t.cuentaId === a.id && t.tipo === 'Aportación').reduce((sum, t) => sum + t.ingreso, 0);
        const retiros = enrichedTransactions.filter(t => t.cuentaId === a.id && t.tipo === 'Retiro').reduce((sum, t) => sum + Math.abs(t.gasto), 0);
        const valorActual = a.valorMercado || a.saldoActual;
        const rendimiento = valorActual - a.saldoInicial - aportaciones + retiros;
        
        return {
          cuenta: a.nombre,
          saldo: valorActual,
          saldoInicial: a.saldoInicial,
          rendimiento
        };
      });

    return {
      balanceTotal: activos.total,
      activos,
      pasivos,
      patrimonioNeto,
      patrimonioNetoAnterior,
      variacionPatrimonio,
      ingresosMes,
      gastosMes,
      balanceMes,
      ingresosAnio,
      gastosAnio,
      balanceAnio,
      ingresosMesAnterior,
      gastosMesAnterior,
      balanceMesAnterior,
      variacionIngresos,
      variacionGastos,
      ingresosAnioAnterior,
      gastosAnioAnterior,
      balanceAnioAnterior,
      variacionIngresosAnual,
      variacionGastosAnual,
      variacionBalanceAnual,
      saludFinanciera: {
        score: patrimonioNeto > 0 ? (activos.total > pasivos.total * 2 ? 9 : 7) : 5,
        nivel: patrimonioNeto > 0 ? (activos.total > pasivos.total * 2 ? 'Excelente' : 'Buena') : 'Regular',
        descripcion: patrimonioNeto > 0 ? 'Patrimonio neto positivo' : 'Necesita reducir deudas'
      },
      distribucionActivos,
      distribucionPasivos,
      topCategorias,
      topCategoriasMesAnterior,
      topCategoriasAnual,
      cuentasResumen: accountsWithBalances.map(a => ({ cuenta: a.nombre, saldo: a.saldoActual, tipo: a.tipo })),
      tendenciaMensual,
      inversionesResumen: {
        totalInversiones,
        aportacionesMes,
        aportacionesMesAnterior,
        variacionAportaciones,
        cuentasInversion
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
    const processedTransactions: Transaction[] = newTransactions.map(transaction => {
      const id = (transaction as any).csvId || (Date.now().toString() + Math.random().toString(36).substr(2, 9));
      return {
        ...transaction,
        id: id,
        monto: transaction.ingreso - transaction.gasto,
      };
    });
    const updated = [...transactions, ...processedTransactions];
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