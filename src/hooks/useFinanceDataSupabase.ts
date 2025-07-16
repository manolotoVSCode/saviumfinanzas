import { useState, useEffect, useMemo } from 'react';
import { Account, Category, Transaction, DashboardMetrics, AccountType, TransactionType } from '@/types/finance';
import { useExchangeRates } from './useExchangeRates';
import { useAppConfig } from './useAppConfig';
import { useAuth } from './useAuth';
import { supabase } from '@/integrations/supabase/client';

// Data inicial simple para usuarios nuevos
const initialAccountTypes: AccountType[] = [
  'Efectivo', 'Banco', 'Tarjeta de Crédito', 'Ahorros', 'Inversiones', 'Hipoteca', 'Empresa Propia'
];

const initialCategories: Category[] = [
  { id: 'cat-1', subcategoria: 'SIN ASIGNAR', categoria: 'Sin Categoría', tipo: 'Gastos' },
  { id: 'cat-2', subcategoria: 'Salario', categoria: 'Ingresos', tipo: 'Ingreso' },
  { id: 'cat-3', subcategoria: 'Comida', categoria: 'Alimentación', tipo: 'Gastos' },
  { id: 'cat-4', subcategoria: 'Transporte', categoria: 'Movilidad', tipo: 'Gastos' },
  { id: 'cat-5', subcategoria: 'Entretenimiento', categoria: 'Ocio', tipo: 'Gastos' },
  { id: 'cat-6', subcategoria: 'Bonos / Comisiones', categoria: 'Ingresos', tipo: 'Ingreso' },
  { id: 'cat-7', subcategoria: 'Aportaciones', categoria: 'Inversiones', tipo: 'Aportación' },
];

const initialAccounts: Account[] = [
  { id: 'acc-1', nombre: 'Efectivo', tipo: 'Efectivo', saldoInicial: 0, saldoActual: 0, divisa: 'MXN' },
  { id: 'acc-2', nombre: 'Cuenta de Cheques', tipo: 'Banco', saldoInicial: 0, saldoActual: 0, divisa: 'MXN' },
];

export const useFinanceData = () => {
  const { convertCurrency } = useExchangeRates();
  const { config } = useAppConfig();
  const { user } = useAuth();
  
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [setDateFilter] = useState<{start?: Date; end?: Date}>({});

  // Cargar datos desde Supabase
  const loadData = async () => {
    if (!user) return;
    
    try {
      setLoading(true);
      
      // Cargar categorías
      const { data: categoriesData, error: catError } = await supabase
        .from('categorias')
        .select('*')
        .eq('user_id', user.id);
      
      if (catError) throw catError;
      
      // Si no hay categorías, crear las iniciales
      if (!categoriesData || categoriesData.length === 0) {
        const categoriesToInsert = initialCategories.map(cat => ({
          id: cat.id,
          user_id: user.id,
          subcategoria: cat.subcategoria,
          categoria: cat.categoria,
          tipo: cat.tipo
        }));
        
        await supabase.from('categorias').insert(categoriesToInsert);
        setCategories(initialCategories);
      } else {
        setCategories(categoriesData.map(cat => ({
          id: cat.id,
          subcategoria: cat.subcategoria,
          categoria: cat.categoria,
          tipo: cat.tipo as TransactionType
        })));
      }

      // Cargar cuentas
      const { data: accountsData, error: accError } = await supabase
        .from('cuentas')
        .select('*')
        .eq('user_id', user.id);
      
      if (accError) throw accError;
      
      // Si no hay cuentas, crear las iniciales
      if (!accountsData || accountsData.length === 0) {
        const accountsToInsert = initialAccounts.map(acc => ({
          id: acc.id,
          user_id: user.id,
          nombre: acc.nombre,
          tipo: acc.tipo,
          saldo_inicial: acc.saldoInicial,
          divisa: acc.divisa,
          valor_mercado: acc.valorMercado,
          rendimiento_mensual: acc.rendimientoMensual
        }));
        
        await supabase.from('cuentas').insert(accountsToInsert);
        setAccounts(initialAccounts);
      } else {
        setAccounts(accountsData.map(acc => ({
          id: acc.id,
          nombre: acc.nombre,
          tipo: acc.tipo as AccountType,
          saldoInicial: Number(acc.saldo_inicial),
          saldoActual: Number(acc.saldo_inicial), // Se calculará después
          divisa: acc.divisa as 'MXN' | 'USD' | 'EUR',
          valorMercado: acc.valor_mercado ? Number(acc.valor_mercado) : undefined,
          rendimientoMensual: acc.rendimiento_mensual ? Number(acc.rendimiento_mensual) : undefined
        })));
      }

      // Cargar transacciones
      const { data: transactionsData, error: transError } = await supabase
        .from('transacciones')
        .select('*')
        .eq('user_id', user.id)
        .order('fecha', { ascending: false });
      
      if (transError) throw transError;
      
      if (transactionsData) {
        setTransactions(transactionsData.map(trans => ({
          id: trans.id,
          cuentaId: trans.cuenta_id,
          fecha: new Date(trans.fecha),
          comentario: trans.comentario,
          ingreso: Number(trans.ingreso),
          gasto: Number(trans.gasto),
          subcategoriaId: trans.subcategoria_id,
          divisa: trans.divisa as 'MXN' | 'USD' | 'EUR',
          csvId: trans.csv_id,
          monto: Number(trans.ingreso) - Number(trans.gasto)
        })));
      }
      
    } catch (error) {
      console.error('Error loading data:', error);
    } finally {
      setLoading(false);
    }
  };

  // Cargar datos cuando el usuario cambie
  useEffect(() => {
    if (user) {
      loadData();
    }
  }, [user]);

  const accountsWithBalances = useMemo(() => {
    return accounts.map(account => {
      const accountTransactions = transactions.filter(t => t.cuentaId === account.id);
      const balance = accountTransactions.reduce((acc, transaction) => {
        return acc + transaction.monto;
      }, account.saldoInicial);
      
      return {
        ...account,
        saldoActual: balance
      };
    });
  }, [accounts, transactions]);

  const enrichedTransactions = useMemo(() => {
    return transactions.map(transaction => {
      const category = categories.find(cat => cat.id === transaction.subcategoriaId);
      const account = accounts.find(acc => acc.id === transaction.cuentaId);
      
      let tipo: TransactionType;
      if (transaction.ingreso > 0) {
        tipo = category?.tipo === 'Aportación' ? 'Aportación' : 'Ingreso';
      } else {
        tipo = category?.tipo === 'Retiro' ? 'Retiro' : 'Gastos';
      }
      
      return {
        ...transaction,
        categoria: category?.categoria || 'Sin categoría',
        tipo,
        cuenta: account?.nombre || 'Cuenta desconocida'
      };
    });
  }, [transactions, categories, accounts]);

  // CRUD operations for accounts
  const addAccount = async (account: Omit<Account, 'id' | 'saldoActual'>) => {
    if (!user) return;
    
    const newAccount = {
      ...account,
      id: crypto.randomUUID(),
      saldoActual: account.saldoInicial
    };

    const { error } = await supabase
      .from('cuentas')
      .insert({
        id: newAccount.id,
        user_id: user.id,
        nombre: newAccount.nombre,
        tipo: newAccount.tipo,
        saldo_inicial: newAccount.saldoInicial,
        divisa: newAccount.divisa,
        valor_mercado: newAccount.valorMercado,
        rendimiento_mensual: newAccount.rendimientoMensual
      });

    if (error) {
      console.error('Error adding account:', error);
      return;
    }

    setAccounts(prev => [...prev, newAccount]);
  };

  const updateAccount = async (id: string, updates: Partial<Account>) => {
    if (!user) return;

    const { error } = await supabase
      .from('cuentas')
      .update({
        nombre: updates.nombre,
        tipo: updates.tipo,
        saldo_inicial: updates.saldoInicial,
        divisa: updates.divisa,
        valor_mercado: updates.valorMercado,
        rendimiento_mensual: updates.rendimientoMensual
      })
      .eq('id', id)
      .eq('user_id', user.id);

    if (error) {
      console.error('Error updating account:', error);
      return;
    }

    setAccounts(prev => prev.map(acc => acc.id === id ? { ...acc, ...updates } : acc));
  };

  const deleteAccount = async (id: string) => {
    if (!user) return;

    const { error } = await supabase
      .from('cuentas')
      .delete()
      .eq('id', id)
      .eq('user_id', user.id);

    if (error) {
      console.error('Error deleting account:', error);
      return;
    }

    setAccounts(prev => prev.filter(acc => acc.id !== id));
  };

  // CRUD operations for categories
  const addCategory = async (category: Omit<Category, 'id'>) => {
    if (!user) return;

    const newCategory = {
      ...category,
      id: crypto.randomUUID()
    };

    const { error } = await supabase
      .from('categorias')
      .insert({
        id: newCategory.id,
        user_id: user.id,
        subcategoria: newCategory.subcategoria,
        categoria: newCategory.categoria,
        tipo: newCategory.tipo
      });

    if (error) {
      console.error('Error adding category:', error);
      return;
    }

    setCategories(prev => [...prev, newCategory]);
  };

  const updateCategory = async (id: string, updates: Partial<Category>) => {
    if (!user) return;

    const { error } = await supabase
      .from('categorias')
      .update({
        subcategoria: updates.subcategoria,
        categoria: updates.categoria,
        tipo: updates.tipo
      })
      .eq('id', id)
      .eq('user_id', user.id);

    if (error) {
      console.error('Error updating category:', error);
      return;
    }

    setCategories(prev => prev.map(cat => cat.id === id ? { ...cat, ...updates } : cat));
  };

  const deleteCategory = async (id: string) => {
    if (!user) return;

    const { error } = await supabase
      .from('categorias')
      .delete()
      .eq('id', id)
      .eq('user_id', user.id);

    if (error) {
      console.error('Error deleting category:', error);
      return;
    }

    setCategories(prev => prev.filter(cat => cat.id !== id));
  };

  // CRUD operations for transactions
  const addTransaction = async (transaction: Omit<Transaction, 'id' | 'monto'>, autoContribution?: { targetAccountId: string }) => {
    if (!user) return;

    const newTransaction = {
      ...transaction,
      id: crypto.randomUUID(),
      monto: transaction.ingreso - transaction.gasto
    };

    const { error } = await supabase
      .from('transacciones')
      .insert({
        id: newTransaction.id,
        user_id: user.id,
        cuenta_id: newTransaction.cuentaId,
        subcategoria_id: newTransaction.subcategoriaId,
        fecha: newTransaction.fecha.toISOString().split('T')[0],
        comentario: newTransaction.comentario,
        ingreso: newTransaction.ingreso,
        gasto: newTransaction.gasto,
        divisa: newTransaction.divisa,
        csv_id: newTransaction.csvId
      });

    if (error) {
      console.error('Error adding transaction:', error);
      return;
    }

    setTransactions(prev => [newTransaction, ...prev]);
  };

  const addTransactionsBatch = async (newTransactions: Omit<Transaction, 'id' | 'monto'>[]) => {
    if (!user) return;

    const transactionsToInsert = newTransactions.map(transaction => ({
      id: crypto.randomUUID(),
      user_id: user.id,
      cuenta_id: transaction.cuentaId,
      subcategoria_id: transaction.subcategoriaId,
      fecha: transaction.fecha.toISOString().split('T')[0],
      comentario: transaction.comentario,
      ingreso: transaction.ingreso,
      gasto: transaction.gasto,
      divisa: transaction.divisa,
      csv_id: transaction.csvId
    }));

    const { error } = await supabase
      .from('transacciones')
      .insert(transactionsToInsert);

    if (error) {
      console.error('Error adding transactions batch:', error);
      return;
    }

    const newTransactionsWithIds = transactionsToInsert.map(trans => ({
      id: trans.id,
      cuentaId: trans.cuenta_id,
      fecha: new Date(trans.fecha),
      comentario: trans.comentario,
      ingreso: trans.ingreso,
      gasto: trans.gasto,
      subcategoriaId: trans.subcategoria_id,
      divisa: trans.divisa as 'MXN' | 'USD' | 'EUR',
      csvId: trans.csv_id,
      monto: trans.ingreso - trans.gasto
    }));

    setTransactions(prev => [...newTransactionsWithIds, ...prev]);
  };

  const updateTransaction = async (id: string, updates: Partial<Transaction>) => {
    if (!user) return;

    const { error } = await supabase
      .from('transacciones')
      .update({
        cuenta_id: updates.cuentaId,
        subcategoria_id: updates.subcategoriaId,
        fecha: updates.fecha?.toISOString().split('T')[0],
        comentario: updates.comentario,
        ingreso: updates.ingreso,
        gasto: updates.gasto,
        divisa: updates.divisa
      })
      .eq('id', id)
      .eq('user_id', user.id);

    if (error) {
      console.error('Error updating transaction:', error);
      return;
    }

    setTransactions(prev => prev.map(trans => 
      trans.id === id 
        ? { ...trans, ...updates, monto: (updates.ingreso || trans.ingreso) - (updates.gasto || trans.gasto) }
        : trans
    ));
  };

  const deleteTransaction = async (id: string) => {
    if (!user) return;

    const { error } = await supabase
      .from('transacciones')
      .delete()
      .eq('id', id)
      .eq('user_id', user.id);

    if (error) {
      console.error('Error deleting transaction:', error);
      return;
    }

    setTransactions(prev => prev.filter(trans => trans.id !== id));
  };

  const clearAllTransactions = async () => {
    if (!user) return;

    const { error } = await supabase
      .from('transacciones')
      .delete()
      .eq('user_id', user.id);

    if (error) {
      console.error('Error clearing all transactions:', error);
      return;
    }

    setTransactions([]);
  };

  // Cálculo completo de métricas del dashboard
  const dashboardMetrics: DashboardMetrics = useMemo(() => {
    const now = new Date();
    const currentMonth = now.getMonth();
    const currentYear = now.getFullYear();
    
    // Filtrar transacciones por períodos
    const thisMonthTransactions = enrichedTransactions.filter(t => 
      t.fecha.getMonth() === currentMonth && t.fecha.getFullYear() === currentYear
    );
    
    const thisYearTransactions = enrichedTransactions.filter(t => 
      t.fecha.getFullYear() === currentYear
    );
    
    // Calcular métricas mensuales
    const ingresosMes = thisMonthTransactions
      .filter(t => t.ingreso > 0)
      .reduce((sum, t) => sum + t.ingreso, 0);
    
    const gastosMes = thisMonthTransactions
      .filter(t => t.gasto > 0)
      .reduce((sum, t) => sum + t.gasto, 0);
    
    // Calcular métricas anuales
    const ingresosAnio = thisYearTransactions
      .filter(t => t.ingreso > 0)
      .reduce((sum, t) => sum + t.ingreso, 0);
    
    const gastosAnio = thisYearTransactions
      .filter(t => t.gasto > 0)
      .reduce((sum, t) => sum + t.gasto, 0);
    
    // Calcular balances por tipo de cuenta
    const efectivoBancos = accountsWithBalances
      .filter(acc => ['Efectivo', 'Banco', 'Ahorros'].includes(acc.tipo))
      .reduce((sum, acc) => sum + acc.saldoActual, 0);
    
    const inversiones = accountsWithBalances
      .filter(acc => acc.tipo === 'Inversiones')
      .reduce((sum, acc) => sum + acc.saldoActual, 0);
    
    const empresasPrivadas = accountsWithBalances
      .filter(acc => acc.tipo === 'Empresa Propia')
      .reduce((sum, acc) => sum + acc.saldoActual, 0);
    
    const tarjetasCredito = accountsWithBalances
      .filter(acc => acc.tipo === 'Tarjeta de Crédito')
      .reduce((sum, acc) => sum + Math.abs(acc.saldoActual), 0);
    
    const hipoteca = accountsWithBalances
      .filter(acc => acc.tipo === 'Hipoteca')
      .reduce((sum, acc) => sum + Math.abs(acc.saldoActual), 0);
    
    const totalActivos = efectivoBancos + inversiones + empresasPrivadas;
    const totalPasivos = tarjetasCredito + hipoteca;
    const patrimonioNeto = totalActivos - totalPasivos;
    
    // Calcular activos y pasivos por moneda
    const activosPorMoneda = {
      MXN: { efectivoBancos: 0, inversiones: 0, empresasPrivadas: 0, total: 0 },
      USD: { efectivoBancos: 0, inversiones: 0, empresasPrivadas: 0, total: 0 },
      EUR: { efectivoBancos: 0, inversiones: 0, empresasPrivadas: 0, total: 0 }
    };

    const pasivosPorMoneda = {
      MXN: { tarjetasCredito: 0, hipoteca: 0, total: 0 },
      USD: { tarjetasCredito: 0, hipoteca: 0, total: 0 },
      EUR: { tarjetasCredito: 0, hipoteca: 0, total: 0 }
    };

    accountsWithBalances.forEach(acc => {
      const currency = acc.divisa || 'MXN';
      const saldo = acc.saldoActual;
      
      if (['Efectivo', 'Banco', 'Ahorros'].includes(acc.tipo) && saldo > 0) {
        activosPorMoneda[currency].efectivoBancos += saldo;
        activosPorMoneda[currency].total += saldo;
      } else if (acc.tipo === 'Inversiones' && saldo > 0) {
        activosPorMoneda[currency].inversiones += saldo;
        activosPorMoneda[currency].total += saldo;
      } else if (acc.tipo === 'Empresa Propia' && saldo > 0) {
        activosPorMoneda[currency].empresasPrivadas += saldo;
        activosPorMoneda[currency].total += saldo;
      } else if (acc.tipo === 'Tarjeta de Crédito') {
        const deuda = Math.abs(saldo);
        pasivosPorMoneda[currency].tarjetasCredito += deuda;
        pasivosPorMoneda[currency].total += deuda;
      } else if (acc.tipo === 'Hipoteca') {
        const deuda = Math.abs(saldo);
        pasivosPorMoneda[currency].hipoteca += deuda;
        pasivosPorMoneda[currency].total += deuda;
      }
    });
    
    // Top categorías del mes
    const categoriesThisMonth = thisMonthTransactions.reduce((acc, trans) => {
      const key = trans.categoria || 'Sin categoría';
      if (!acc[key]) {
        acc[key] = { categoria: key, monto: 0, tipo: trans.tipo || 'Gastos' };
      }
      acc[key].monto += trans.gasto > 0 ? trans.gasto : trans.ingreso;
      return acc;
    }, {} as Record<string, { categoria: string; monto: number; tipo: TransactionType }>);
    
    const topCategorias = Object.values(categoriesThisMonth)
      .sort((a, b) => b.monto - a.monto)
      .slice(0, 5);

    return {
      balanceTotal: patrimonioNeto,
      activos: {
        efectivoBancos,
        inversiones,
        empresasPrivadas,
        total: totalActivos
      },
      activosPorMoneda,
      pasivos: {
        tarjetasCredito,
        hipoteca,
        total: totalPasivos
      },
      pasivosPorMoneda,
      patrimonioNeto,
      patrimonioNetoAnterior: 0,
      variacionPatrimonio: 0,
      ingresosMes,
      gastosMes,
      balanceMes: ingresosMes - gastosMes,
      ingresosAnio,
      gastosAnio,
      balanceAnio: ingresosAnio - gastosAnio,
      ingresosMesAnterior: 0,
      gastosMesAnterior: 0,
      balanceMesAnterior: 0,
      variacionIngresosMes: 0,
      variacionGastosMes: 0,
      ingresosAnioAnterior: 0,
      gastosAnioAnterior: 0,
      balanceAnioAnterior: 0,
      variacionIngresosAnual: 0,
      variacionGastosAnual: 0,
      variacionBalanceAnual: 0,
      saludFinanciera: {
        score: patrimonioNeto > 0 ? 8 : 5,
        nivel: patrimonioNeto > 0 ? 'Buena' : 'Regular',
        descripcion: patrimonioNeto > 0 ? 'Patrimonio neto positivo' : 'Mejorar patrimonio neto'
      },
      distribucionActivos: [
        { categoria: 'Efectivo y Bancos', monto: efectivoBancos, porcentaje: totalActivos > 0 ? (efectivoBancos / totalActivos) * 100 : 0 },
        { categoria: 'Inversiones', monto: inversiones, porcentaje: totalActivos > 0 ? (inversiones / totalActivos) * 100 : 0 },
        { categoria: 'Empresas Privadas', monto: empresasPrivadas, porcentaje: totalActivos > 0 ? (empresasPrivadas / totalActivos) * 100 : 0 }
      ],
      distribucionPasivos: [
        { categoria: 'Tarjetas de Crédito', monto: tarjetasCredito, porcentaje: totalPasivos > 0 ? (tarjetasCredito / totalPasivos) * 100 : 0 },
        { categoria: 'Hipoteca', monto: hipoteca, porcentaje: totalPasivos > 0 ? (hipoteca / totalPasivos) * 100 : 0 }
      ],
      topCategorias,
      topCategoriasMesAnterior: [],
      topCategoriasAnual: [],
      topCategoriasGastos: topCategorias.filter(c => c.tipo === 'Gastos'),
      topCategoriasGastosMesAnterior: [],
      topCategoriasGastosAnual: [],
      topCategoriasIngresos: topCategorias.filter(c => c.tipo === 'Ingreso'),
      topCategoriasIngresosMesAnterior: [],
      topCategoriasIngresosAnual: [],
      cuentasResumen: accountsWithBalances.map(acc => ({
        cuenta: acc.nombre,
        saldo: acc.saldoActual,
        tipo: acc.tipo
      })),
      tendenciaMensual: [],
      inversionesResumen: {
        totalInversiones: inversiones,
        aportacionesMes: 0,
        aportacionesMesAnterior: 0,
        variacionAportaciones: 0,
        aportacionesPorMes: [],
        retirosPorMes: [],
        totalAportadoAnual: 0,
        totalRetiradoAnual: 0,
        rendimientoAnualTotal: 0,
        rendimientoAnualPorcentaje: 0,
        cuentasInversion: accountsWithBalances
          .filter(acc => acc.tipo === 'Inversiones')
          .map(acc => ({
            cuenta: acc.nombre,
            id: acc.id,
            saldo: acc.saldoActual,
            saldoInicial: acc.saldoInicial,
            rendimiento: acc.saldoActual - acc.saldoInicial,
            movimientosPorMes: []
          }))
      }
    };
  }, [enrichedTransactions, accountsWithBalances]);

  return {
    // Data
    accounts: accountsWithBalances,
    categories,
    transactions: enrichedTransactions,
    dashboardMetrics,
    loading,
    accountTypes: initialAccountTypes,
    
    // CRUD operations
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
    
    // Utility
    refreshData: loadData
  };
};