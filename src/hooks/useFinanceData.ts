import { useState, useEffect, useMemo } from 'react';
import { Account, Category, Transaction, TransactionType, AccountType, DashboardMetrics } from '@/types/finance';

// Datos iniciales de ejemplo
const initialCategories: Category[] = [
  { id: '1', subcategoria: 'Salario', categoria: 'Trabajo', tipo: 'Ingreso' },
  { id: '2', subcategoria: 'Freelance', categoria: 'Trabajo', tipo: 'Ingreso' },
  { id: '3', subcategoria: 'Supermercado', categoria: 'Alimentación', tipo: 'Gastos' },
  { id: '4', subcategoria: 'Restaurantes', categoria: 'Alimentación', tipo: 'Gastos' },
  { id: '5', subcategoria: 'Gasolina', categoria: 'Transporte', tipo: 'Gastos' },
  { id: '6', subcategoria: 'Transferencia Entre Cuentas', categoria: 'Interno', tipo: 'Aportación' },
  { id: '7', subcategoria: 'Retiro Entre Cuentas', categoria: 'Interno', tipo: 'Retiro' },
];

const initialAccountTypes: AccountType[] = ['Efectivo', 'Banco', 'Tarjeta de Crédito', 'Ahorros', 'Inversiones'];

const initialAccounts: Account[] = [
  { id: '1', nombre: 'Cuenta Principal', tipo: 'Banco', saldoInicial: 50000, saldoActual: 50000 },
  { id: '2', nombre: 'Efectivo', tipo: 'Efectivo', saldoInicial: 2000, saldoActual: 2000 },
  { id: '3', nombre: 'Ahorros', tipo: 'Ahorros', saldoInicial: 25000, saldoActual: 25000 },
];

const initialTransactions: Transaction[] = [
  // Enero 2025
  {
    id: '1',
    cuentaId: '1',
    fecha: new Date('2025-01-15'),
    comentario: 'Salario enero',
    ingreso: 25000,
    gasto: 0,
    subcategoriaId: '1',
    monto: 25000
  },
  {
    id: '2',
    cuentaId: '1',
    fecha: new Date('2025-01-20'),
    comentario: 'Compras supermercado',
    ingreso: 0,
    gasto: 3500,
    subcategoriaId: '3',
    monto: -3500
  },
  
  // Febrero 2025
  {
    id: '3',
    cuentaId: '1',
    fecha: new Date('2025-02-15'),
    comentario: 'Salario febrero',
    ingreso: 25000,
    gasto: 0,
    subcategoriaId: '1',
    monto: 25000
  },
  {
    id: '4',
    cuentaId: '2',
    fecha: new Date('2025-02-10'),
    comentario: 'Cena restaurante',
    ingreso: 0,
    gasto: 1200,
    subcategoriaId: '4',
    monto: -1200
  },
  
  // Marzo 2025
  {
    id: '5',
    cuentaId: '1',
    fecha: new Date('2025-03-15'),
    comentario: 'Salario marzo',
    ingreso: 25000,
    gasto: 0,
    subcategoriaId: '1',
    monto: 25000
  },
  {
    id: '6',
    cuentaId: '1',
    fecha: new Date('2025-03-25'),
    comentario: 'Gasolina',
    ingreso: 0,
    gasto: 800,
    subcategoriaId: '5',
    monto: -800
  },
  
  // Abril 2025
  {
    id: '7',
    cuentaId: '1',
    fecha: new Date('2025-04-15'),
    comentario: 'Salario abril',
    ingreso: 26000,
    gasto: 0,
    subcategoriaId: '1',
    monto: 26000
  },
  {
    id: '8',
    cuentaId: '1',
    fecha: new Date('2025-04-08'),
    comentario: 'Compras varias',
    ingreso: 0,
    gasto: 2800,
    subcategoriaId: '3',
    monto: -2800
  },
  
  // Mayo 2025
  {
    id: '9',
    cuentaId: '1',
    fecha: new Date('2025-05-15'),
    comentario: 'Salario mayo',
    ingreso: 26000,
    gasto: 0,
    subcategoriaId: '1',
    monto: 26000
  },
  {
    id: '10',
    cuentaId: '2',
    fecha: new Date('2025-05-22'),
    comentario: 'Proyecto freelance',
    ingreso: 8000,
    gasto: 0,
    subcategoriaId: '2',
    monto: 8000
  },
  
  // Junio 2025
  {
    id: '11',
    cuentaId: '1',
    fecha: new Date('2025-06-15'),
    comentario: 'Salario junio',
    ingreso: 27000,
    gasto: 0,
    subcategoriaId: '1',
    monto: 27000
  },
  {
    id: '12',
    cuentaId: '1',
    fecha: new Date('2025-06-30'),
    comentario: 'Cena familiar',
    ingreso: 0,
    gasto: 1500,
    subcategoriaId: '4',
    monto: -1500
  },
  
  // Julio 2025
  {
    id: '13',
    cuentaId: '1',
    fecha: new Date('2025-07-15'),
    comentario: 'Salario julio',
    ingreso: 27000,
    gasto: 0,
    subcategoriaId: '1',
    monto: 27000
  },
  {
    id: '14',
    cuentaId: '1',
    fecha: new Date('2025-07-05'),
    comentario: 'Gasolina y mantenimiento',
    ingreso: 0,
    gasto: 1800,
    subcategoriaId: '5',
    monto: -1800
  }
];

export const useFinanceData = () => {
  const [accounts, setAccounts] = useState<Account[]>(initialAccounts);
  const [categories, setCategories] = useState<Category[]>(initialCategories);
  const [transactions, setTransactions] = useState<Transaction[]>(initialTransactions);
  const [accountTypes] = useState<AccountType[]>(initialAccountTypes);
  const [dateFilter, setDateFilter] = useState<{ start: Date; end: Date }>({
    start: new Date(new Date().getFullYear(), new Date().getMonth(), 1),
    end: new Date()
  });

  // Recalcular saldos actuales cuando cambien las transacciones
  useEffect(() => {
    setAccounts(prevAccounts => 
      prevAccounts.map(account => {
        const accountTransactions = transactions.filter(t => t.cuentaId === account.id);
        const totalTransactions = accountTransactions.reduce((sum, t) => sum + t.monto, 0);
        return {
          ...account,
          saldoActual: account.saldoInicial + totalTransactions
        };
      })
    );
  }, [transactions]);

  // Añadir campos calculados a transacciones
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

  // Métricas del dashboard
  const dashboardMetrics = useMemo((): DashboardMetrics => {
    const filteredTransactions = enrichedTransactions.filter(t => 
      t.fecha >= dateFilter.start && t.fecha <= dateFilter.end
    );

    console.log('Fecha filter:', dateFilter);
    console.log('Filtered transactions:', filteredTransactions);
    console.log('All enriched transactions:', enrichedTransactions);

    const balanceTotal = accounts.reduce((sum, acc) => sum + acc.saldoActual, 0);
    const ingresosMes = filteredTransactions.filter(t => t.tipo === 'Ingreso').reduce((sum, t) => sum + t.ingreso, 0);
    const gastosMes = filteredTransactions.filter(t => t.tipo === 'Gastos').reduce((sum, t) => sum + t.gasto, 0);
    const balanceMes = ingresosMes - gastosMes;

    console.log('Ingresos mes:', ingresosMes);
    console.log('Gastos mes:', gastosMes);

    // Métricas del mes anterior para comparativo
    const mesAnteriorStart = new Date(dateFilter.start);
    mesAnteriorStart.setMonth(mesAnteriorStart.getMonth() - 1);
    const mesAnteriorEnd = new Date(mesAnteriorStart.getFullYear(), mesAnteriorStart.getMonth() + 1, 0);
    
    const transaccionesMesAnterior = enrichedTransactions.filter(t => 
      t.fecha >= mesAnteriorStart && t.fecha <= mesAnteriorEnd
    );
    
    const ingresosMesAnterior = transaccionesMesAnterior.filter(t => t.tipo === 'Ingreso').reduce((sum, t) => sum + t.ingreso, 0);
    const gastosMesAnterior = transaccionesMesAnterior.filter(t => t.tipo === 'Gastos').reduce((sum, t) => sum + t.gasto, 0);
    const balanceMesAnterior = ingresosMesAnterior - gastosMesAnterior;

    // Calcular variaciones porcentuales
    const variacionIngresos = ingresosMesAnterior > 0 ? ((ingresosMes - ingresosMesAnterior) / ingresosMesAnterior) * 100 : 0;
    const variacionGastos = gastosMesAnterior > 0 ? ((gastosMes - gastosMesAnterior) / gastosMesAnterior) * 100 : 0;

    // Top categorías
    const categoryTotals = new Map<string, { monto: number; tipo: TransactionType }>();
    filteredTransactions.forEach(t => {
      if (t.categoria && t.tipo && (t.tipo === 'Ingreso' || t.tipo === 'Gastos')) {
        const key = `${t.categoria}_${t.tipo}`;
        const current = categoryTotals.get(key) || { monto: 0, tipo: t.tipo };
        categoryTotals.set(key, {
          monto: current.monto + Math.abs(t.monto),
          tipo: t.tipo
        });
      }
    });

    const topCategorias = Array.from(categoryTotals.entries())
      .map(([key, value]) => ({
        categoria: key.split('_')[0],
        monto: value.monto,
        tipo: value.tipo
      }))
      .sort((a, b) => b.monto - a.monto)
      .slice(0, 5);

    // Resumen cuentas
    const cuentasResumen = accounts.map(acc => ({
      cuenta: acc.nombre,
      saldo: acc.saldoActual,
      tipo: acc.tipo
    }));

    // Tendencia mensual (últimos 6 meses)
    const tendenciaMensual = [];
    for (let i = 5; i >= 0; i--) {
      const date = new Date();
      date.setMonth(date.getMonth() - i);
      const monthStart = new Date(date.getFullYear(), date.getMonth(), 1);
      const monthEnd = new Date(date.getFullYear(), date.getMonth() + 1, 0);
      
      const monthTransactions = enrichedTransactions.filter(t => 
        t.fecha >= monthStart && t.fecha <= monthEnd
      );
      
      const ingresos = monthTransactions.filter(t => t.tipo === 'Ingreso').reduce((sum, t) => sum + t.ingreso, 0);
      const gastos = monthTransactions.filter(t => t.tipo === 'Gastos').reduce((sum, t) => sum + t.gasto, 0);
      
      tendenciaMensual.push({
        mes: date.toLocaleDateString('es-MX', { month: 'short', year: '2-digit' }),
        ingresos,
        gastos
      });
    }

    return {
      balanceTotal,
      ingresosMes,
      gastosMes,
      balanceMes,
      ingresosMesAnterior,
      gastosMesAnterior,
      balanceMesAnterior,
      variacionIngresos,
      variacionGastos,
      topCategorias,
      cuentasResumen,
      tendenciaMensual
    };
  }, [enrichedTransactions, accounts, dateFilter]);

  // Funciones CRUD
  const addAccount = (account: Omit<Account, 'id' | 'saldoActual'>) => {
    const newAccount: Account = {
      ...account,
      id: Date.now().toString(),
      saldoActual: account.saldoInicial
    };
    setAccounts(prev => [...prev, newAccount]);
  };

  const updateAccount = (id: string, updates: Partial<Account>) => {
    setAccounts(prev => prev.map(acc => 
      acc.id === id ? { ...acc, ...updates } : acc
    ));
  };

  const deleteAccount = (id: string) => {
    setAccounts(prev => prev.filter(acc => acc.id !== id));
    setTransactions(prev => prev.filter(t => t.cuentaId !== id));
  };

  const addCategory = (category: Omit<Category, 'id'>) => {
    const newCategory: Category = {
      ...category,
      id: Date.now().toString()
    };
    setCategories(prev => [...prev, newCategory]);
  };

  const updateCategory = (id: string, updates: Partial<Category>) => {
    setCategories(prev => prev.map(cat => 
      cat.id === id ? { ...cat, ...updates } : cat
    ));
  };

  const deleteCategory = (id: string) => {
    setCategories(prev => prev.filter(cat => cat.id !== id));
    setTransactions(prev => prev.filter(t => t.subcategoriaId !== id));
  };

  const addTransaction = (transaction: Omit<Transaction, 'id' | 'monto'>) => {
    const newTransaction: Transaction = {
      ...transaction,
      id: Date.now().toString(),
      monto: transaction.ingreso - transaction.gasto
    };
    setTransactions(prev => [...prev, newTransaction]);
  };

  const updateTransaction = (id: string, updates: Partial<Transaction>) => {
    setTransactions(prev => prev.map(t => 
      t.id === id ? { 
        ...t, 
        ...updates, 
        monto: (updates.ingreso ?? t.ingreso) - (updates.gasto ?? t.gasto)
      } : t
    ));
  };

  const deleteTransaction = (id: string) => {
    setTransactions(prev => prev.filter(t => t.id !== id));
  };

  return {
    // Data
    accounts,
    categories,
    transactions: enrichedTransactions,
    accountTypes,
    dashboardMetrics,
    dateFilter,
    
    // Actions
    addAccount,
    updateAccount,
    deleteAccount,
    addCategory,
    updateCategory,
    deleteCategory,
    addTransaction,
    updateTransaction,
    deleteTransaction,
    setDateFilter
  };
};