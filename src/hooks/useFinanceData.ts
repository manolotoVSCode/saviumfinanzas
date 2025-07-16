import { useState, useEffect, useMemo } from 'react';
import { Account, AccountType, Category, Transaction, DashboardMetrics, TransactionType } from '@/types/finance';
import { useAppConfig } from '@/hooks/useAppConfig';

const initialAccountTypes: AccountType[] = [
  'Efectivo', 'Banco', 'Tarjeta de Crédito', 'Ahorros', 'Inversiones', 'Hipoteca', 'Empresa Propia'
];

const initialAccounts: Account[] = [
  { id: '1', nombre: 'Efectivo', tipo: 'Efectivo', saldoInicial: 0, saldoActual: 0, divisa: 'MXN' },
  { id: '2', nombre: 'Cuenta de Cheques', tipo: 'Banco', saldoInicial: 0, saldoActual: 0, divisa: 'MXN' },
  { id: '3', nombre: 'Tarjeta de Crédito', tipo: 'Tarjeta de Crédito', saldoInicial: 0, saldoActual: 0, divisa: 'MXN' },
  { id: '4', nombre: 'Ahorros', tipo: 'Ahorros', saldoInicial: 0, saldoActual: 0, divisa: 'MXN' },
  { id: '5', nombre: 'QUANT', tipo: 'Inversiones', saldoInicial: 48000, saldoActual: 48000, valorMercado: 48000, divisa: 'MXN' },
  { id: '6', nombre: 'AMEX', tipo: 'Tarjeta de Crédito', saldoInicial: 0, saldoActual: 0, divisa: 'MXN' },
  { id: '7', nombre: 'Mastercard', tipo: 'Tarjeta de Crédito', saldoInicial: 0, saldoActual: 0, divisa: 'MXN' },
  { id: '8', nombre: 'Hipoteca Casa', tipo: 'Hipoteca', saldoInicial: 0, saldoActual: 0, divisa: 'MXN' }
];

const initialCategories: Category[] = [
  { id: '1', subcategoria: 'Salario', categoria: 'Ingresos', tipo: 'Ingreso' },
  { id: '2', subcategoria: 'Comida', categoria: 'Alimentación', tipo: 'Gastos' },
  { id: '3', subcategoria: 'Transporte', categoria: 'Movilidad', tipo: 'Gastos' },
  { id: '4', subcategoria: 'Entretenimiento', categoria: 'Ocio', tipo: 'Gastos' },
  { id: '5', subcategoria: 'Bonos / Comisiones', categoria: 'Ingresos', tipo: 'Ingreso' },
  { id: '6', subcategoria: 'Aportaciones', categoria: 'Inversiones', tipo: 'Aportación' },
  { id: '7', subcategoria: 'Capital', categoria: 'Hipoteca', tipo: 'Gastos' },
];

export const useFinanceData = () => {
  const { config } = useAppConfig();
  
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [accountTypes] = useState<AccountType[]>(initialAccountTypes);
  const [dateFilter, setDateFilter] = useState<string>('all');
  const [exchangeRates, setExchangeRates] = useState<{[key: string]: number}>({
    MXN: 1,
    USD: 18.8, // Valor por defecto, se actualizará
    EUR: 20.5  // Valor por defecto, se actualizará
  });

  // Función para obtener tasas de cambio
  const fetchExchangeRates = async () => {
    try {
      const response = await fetch('https://api.exchangerate-api.com/v4/latest/MXN');
      if (response.ok) {
        const data = await response.json();
        setExchangeRates({
          MXN: 1,
          USD: 1 / data.rates.USD, // Cuántos pesos por 1 dólar
          EUR: 1 / data.rates.EUR  // Cuántos pesos por 1 euro
        });
      }
    } catch (error) {
      console.error('Error fetching exchange rates:', error);
    }
  };

  // Función para convertir montos a la moneda configurada
  const convertToCurrency = (amount: number, fromCurrency: 'MXN' | 'USD' | 'EUR', toCurrency: string) => {
    if (fromCurrency === toCurrency) return amount;
    
    // Primero convertir a MXN si no está en MXN
    let amountInMXN = amount;
    if (fromCurrency !== 'MXN') {
      amountInMXN = amount * exchangeRates[fromCurrency];
    }
    
    // Luego convertir de MXN a la moneda destino
    if (toCurrency === 'MXN') {
      return amountInMXN;
    } else {
      return amountInMXN / exchangeRates[toCurrency as keyof typeof exchangeRates];
    }
  };

  // Cargar datos del localStorage al inicializar
  useEffect(() => {
    const savedAccounts = localStorage.getItem('finance-accounts');
    const savedCategories = localStorage.getItem('finance-categories');
    const savedTransactions = localStorage.getItem('finance-transactions');

    if (savedAccounts) {
      const parsedAccounts = JSON.parse(savedAccounts);
      // Migrar cuentas sin divisa para compatibilidad
      const migratedAccounts = parsedAccounts.map((account: any) => ({
        ...account,
        divisa: account.divisa || 'MXN'
      }));
      setAccounts(migratedAccounts);
    } else {
      setAccounts(initialAccounts);
    }

    setCategories(savedCategories ? JSON.parse(savedCategories) : initialCategories);
    
    if (savedTransactions) {
      const parsedTransactions = JSON.parse(savedTransactions);
      setTransactions(parsedTransactions.map((t: any) => ({
        ...t,
        fecha: new Date(t.fecha)
      })));
    }

    // Obtener tasas de cambio al inicializar
    fetchExchangeRates();
  }, []);

  // Actualizar tasas de cambio cada 5 minutos
  useEffect(() => {
    const interval = setInterval(fetchExchangeRates, 5 * 60 * 1000);
    return () => clearInterval(interval);
  }, []);

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
    
    // Mes anterior al actual
    const startOfPreviousMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const endOfPreviousMonth = new Date(now.getFullYear(), now.getMonth(), 0);
    const startOfYear = new Date(now.getFullYear(), 0, 1);
    const endOfYear = new Date(now.getFullYear(), 11, 31);
    const startOfLastYear = new Date(now.getFullYear() - 1, 0, 1);
    const endOfLastYear = new Date(now.getFullYear() - 1, 11, 31);
    
    const transactionsThisMonth = enrichedTransactions.filter(t => t.fecha >= startOfMonth && t.fecha <= endOfMonth);
    const transactionsPreviousMonth = enrichedTransactions.filter(t => t.fecha >= startOfPreviousMonth && t.fecha <= endOfPreviousMonth);
    const transactionsThisYear = enrichedTransactions.filter(t => t.fecha >= startOfYear && t.fecha <= endOfYear);
    const transactionsLastYear = enrichedTransactions.filter(t => t.fecha >= startOfLastYear && t.fecha <= endOfLastYear);
    
    // INGRESOS Y GASTOS MENSUALES
    const ingresosMes = transactionsThisMonth.filter(t => t.tipo === 'Ingreso').reduce((sum, t) => sum + t.ingreso, 0);
    const gastosMes = transactionsThisMonth.filter(t => t.tipo === 'Gastos').reduce((sum, t) => sum + t.gasto, 0);
    const balanceMes = ingresosMes - gastosMes;
    
    // MES ANTERIOR (dinámico)
    const ingresosMesAnterior = transactionsPreviousMonth.filter(t => t.tipo === 'Ingreso').reduce((sum, t) => sum + t.ingreso, 0);
    const gastosMesAnterior = transactionsPreviousMonth.filter(t => t.tipo === 'Gastos').reduce((sum, t) => sum + t.gasto, 0);
    const balanceMesAnterior = ingresosMesAnterior - gastosMesAnterior;
    
    // ANUALES
    const ingresosAnio = transactionsThisYear.filter(t => t.tipo === 'Ingreso').reduce((sum, t) => sum + t.ingreso, 0);
    const gastosAnio = transactionsThisYear.filter(t => t.tipo === 'Gastos').reduce((sum, t) => sum + t.gasto, 0);
    const balanceAnio = ingresosAnio - gastosAnio;
    
    // AÑO ANTERIOR
    const ingresosAnioAnterior = transactionsLastYear.filter(t => t.tipo === 'Ingreso').reduce((sum, t) => sum + t.ingreso, 0);
    const gastosAnioAnterior = transactionsLastYear.filter(t => t.tipo === 'Gastos').reduce((sum, t) => sum + t.gasto, 0);
    const balanceAnioAnterior = ingresosAnioAnterior - gastosAnioAnterior;
    
    // VARIACIONES PORCENTUALES (Mes actual vs Mes anterior)
    const variacionIngresosMes = ingresosMesAnterior > 0 ? ((ingresosMes - ingresosMesAnterior) / ingresosMesAnterior) * 100 : 0;
    const variacionGastosMes = gastosMesAnterior > 0 ? ((gastosMes - gastosMesAnterior) / gastosMesAnterior) * 100 : 0;
    const variacionIngresosAnual = ingresosAnioAnterior > 0 ? ((ingresosAnio - ingresosAnioAnterior) / ingresosAnioAnterior) * 100 : 0;
    const variacionGastosAnual = gastosAnioAnterior > 0 ? ((gastosAnio - gastosAnioAnterior) / gastosAnioAnterior) * 100 : 0;
    const variacionBalanceAnual = balanceAnioAnterior !== 0 ? ((balanceAnio - balanceAnioAnterior) / Math.abs(balanceAnioAnterior)) * 100 : 0;
    
    // ACTIVOS DETALLADOS CON CONVERSIÓN DE DIVISAS
    const activos = {
      efectivoBancos: accountsWithBalances
        .filter(a => ['Efectivo', 'Banco', 'Ahorros'].includes(a.tipo))
        .reduce((s, a) => s + convertToCurrency(a.saldoActual, a.divisa || 'MXN', config.currency), 0),
      inversiones: accountsWithBalances
        .filter(a => a.tipo === 'Inversiones')
        .reduce((s, a) => s + convertToCurrency(a.saldoActual, a.divisa || 'MXN', config.currency), 0),
      empresasPrivadas: accountsWithBalances
        .filter(a => a.tipo === 'Empresa Propia')
        .reduce((s, a) => s + convertToCurrency(a.saldoActual, a.divisa || 'MXN', config.currency), 0),
      total: 0
    };
    activos.total = activos.efectivoBancos + activos.inversiones + activos.empresasPrivadas;
    
    // PASIVOS DETALLADOS CON CONVERSIÓN DE DIVISAS
    const pasivos = {
      tarjetasCredito: accountsWithBalances
        .filter(a => a.tipo === 'Tarjeta de Crédito')
        .reduce((s, a) => {
          const debtAmount = Math.abs(Math.min(0, a.saldoActual));
          return s + convertToCurrency(debtAmount, a.divisa || 'MXN', config.currency);
        }, 0),
      hipoteca: accountsWithBalances
        .filter(a => a.tipo === 'Hipoteca')
        .reduce((s, a) => {
          const debtAmount = Math.abs(Math.min(0, a.saldoActual));
          return s + convertToCurrency(debtAmount, a.divisa || 'MXN', config.currency);
        }, 0),
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
    
    // TOP CATEGORÍAS GASTOS E INGRESOS
    const getCategoryTotalsGastos = (transactions: typeof enrichedTransactions) => {
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

    const getCategoryTotalsIngresos = (transactions: typeof enrichedTransactions) => {
      const categoryTotals = new Map<string, number>();
      transactions.forEach(t => {
        if (t.categoria && t.tipo === 'Ingreso') {
          const current = categoryTotals.get(t.categoria) || 0;
          categoryTotals.set(t.categoria, current + t.ingreso);
        }
      });
      return Array.from(categoryTotals.entries())
        .map(([categoria, monto]) => ({ categoria, monto, tipo: 'Ingreso' as TransactionType }))
        .sort((a, b) => b.monto - a.monto)
        .slice(0, 5);
    };
    
    const topCategoriasGastos = getCategoryTotalsGastos(transactionsThisMonth);
    const topCategoriasGastosMesAnterior = getCategoryTotalsGastos(transactionsPreviousMonth);
    const topCategoriasGastosAnual = getCategoryTotalsGastos(transactionsThisYear);

    const topCategoriasIngresos = getCategoryTotalsIngresos(transactionsThisMonth);
    const topCategoriasIngresosMesAnterior = getCategoryTotalsIngresos(transactionsPreviousMonth);
    const topCategoriasIngresosAnual = getCategoryTotalsIngresos(transactionsThisYear);
    
    // TENDENCIA MENSUAL (últimos 12 meses)
    const tendenciaMensual = [];
    for (let i = 11; i >= 0; i--) {
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
    const cuentasInversionIds = accountsWithBalances.filter(a => a.tipo === 'Inversiones').map(a => a.id);
    const totalInversiones = accountsWithBalances.filter(a => a.tipo === 'Inversiones').reduce((s, a) => s + convertToCurrency(a.saldoActual, a.divisa || 'MXN', config.currency), 0);
    
    // Filtrar aportaciones solo a cuentas de inversión
    const aportacionesMes = transactionsThisMonth.filter(t => 
      t.tipo === 'Aportación' && cuentasInversionIds.includes(t.cuentaId)
    ).reduce((s, t) => s + t.ingreso, 0);
    
    const aportacionesMesAnterior = transactionsPreviousMonth.filter(t => 
      t.tipo === 'Aportación' && cuentasInversionIds.includes(t.cuentaId)
    ).reduce((s, t) => s + t.ingreso, 0);
    
    const variacionAportaciones = aportacionesMesAnterior > 0 ? ((aportacionesMes - aportacionesMesAnterior) / aportacionesMesAnterior) * 100 : 0;

    // Calcular aportaciones y retiros por mes del año en curso
    const currentYear = new Date().getFullYear();
    const aportacionesPorMes = [];
    const retirosPorMes = [];
    
    for (let mes = 0; mes < 12; mes++) {
      const mesStart = new Date(currentYear, mes, 1);
      const mesEnd = new Date(currentYear, mes + 1, 0);
      
      const transaccionesMes = enrichedTransactions.filter(t => 
        t.fecha >= mesStart && t.fecha <= mesEnd
      );
      
      const aportacionesMesActual = transaccionesMes.filter(t => 
        t.tipo === 'Aportación' && cuentasInversionIds.includes(t.cuentaId)
      ).reduce((sum, t) => sum + t.ingreso, 0);
      
      const retirosMesActual = transaccionesMes.filter(t => 
        t.tipo === 'Retiro' && cuentasInversionIds.includes(t.cuentaId)
      ).reduce((sum, t) => sum + Math.abs(t.gasto), 0);
      
      aportacionesPorMes.push({
        mes: mesStart.toLocaleDateString('es-MX', { month: 'short' }),
        monto: aportacionesMesActual
      });
      
      retirosPorMes.push({
        mes: mesStart.toLocaleDateString('es-MX', { month: 'short' }),
        monto: retirosMesActual
      });
    }

    // Calcular rendimiento anual total
    const totalAportadoAnual = aportacionesPorMes.reduce((sum, item) => sum + item.monto, 0);
    const totalRetiradoAnual = retirosPorMes.reduce((sum, item) => sum + item.monto, 0);
    const valorActualInversiones = accountsWithBalances.filter(a => a.tipo === 'Inversiones').reduce((s, a) => s + convertToCurrency(a.saldoActual, a.divisa || 'MXN', config.currency), 0);
    const saldoInicialInversiones = accountsWithBalances.filter(a => a.tipo === 'Inversiones').reduce((s, a) => s + convertToCurrency(a.saldoInicial, a.divisa || 'MXN', config.currency), 0);
    const rendimientoAnualTotal = valorActualInversiones - saldoInicialInversiones - totalAportadoAnual + totalRetiradoAnual;
    const rendimientoAnualPorcentaje = (saldoInicialInversiones + totalAportadoAnual - totalRetiradoAnual) > 0 ? 
      (rendimientoAnualTotal / (saldoInicialInversiones + totalAportadoAnual - totalRetiradoAnual)) * 100 : 0;
    
    const cuentasInversion = accountsWithBalances
      .filter(a => a.tipo === 'Inversiones')
      .map(a => {
        const aportaciones = enrichedTransactions.filter(t => t.cuentaId === a.id && t.tipo === 'Aportación').reduce((sum, t) => sum + t.ingreso, 0);
        const retiros = enrichedTransactions.filter(t => t.cuentaId === a.id && t.tipo === 'Retiro').reduce((sum, t) => sum + Math.abs(t.gasto), 0);
        const valorActual = convertToCurrency(a.saldoActual, a.divisa || 'MXN', config.currency);
        const saldoInicialConvertido = convertToCurrency(a.saldoInicial, a.divisa || 'MXN', config.currency);
        const rendimiento = valorActual - saldoInicialConvertido - aportaciones + retiros;
        
        // Calcular movimientos por mes para esta cuenta específica
        const movimientosPorMes = [];
        for (let mes = 0; mes < 12; mes++) {
          const mesStart = new Date(currentYear, mes, 1);
          const mesEnd = new Date(currentYear, mes + 1, 0);
          
          const transaccionesMesCuenta = enrichedTransactions.filter(t => 
            t.cuentaId === a.id && t.fecha >= mesStart && t.fecha <= mesEnd
          );
          
          const aportacionesMes = transaccionesMesCuenta.filter(t => t.tipo === 'Aportación').reduce((sum, t) => sum + t.ingreso, 0);
          const retirosMes = transaccionesMesCuenta.filter(t => t.tipo === 'Retiro').reduce((sum, t) => sum + Math.abs(t.gasto), 0);
          
          movimientosPorMes.push({
            mes: mesStart.toLocaleDateString('es-MX', { month: 'short' }),
            aportaciones: aportacionesMes,
            retiros: retirosMes
          });
        }
        
        return {
          cuenta: a.nombre,
          id: a.id,
          saldo: valorActual,
          saldoInicial: saldoInicialConvertido,
          rendimiento,
          movimientosPorMes
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
      variacionIngresosMes,
      variacionGastosMes,
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
      topCategoriasGastos,
      topCategoriasGastosMesAnterior,
      topCategoriasGastosAnual,
      topCategoriasIngresos,
      topCategoriasIngresosMesAnterior,
      topCategoriasIngresosAnual,
      // Mantener compatibilidad con versión anterior
      topCategorias: topCategoriasGastos,
      topCategoriasMesAnterior: topCategoriasGastosMesAnterior,
      topCategoriasAnual: topCategoriasGastosAnual,
      cuentasResumen: accountsWithBalances.map(a => ({ cuenta: a.nombre, saldo: convertToCurrency(a.saldoActual, a.divisa || 'MXN', config.currency), tipo: a.tipo })),
      tendenciaMensual,
      inversionesResumen: {
        totalInversiones,
        aportacionesMes,
        aportacionesMesAnterior,
        variacionAportaciones,
        aportacionesPorMes,
        retirosPorMes,
        totalAportadoAnual,
        totalRetiradoAnual,
        rendimientoAnualTotal,
        rendimientoAnualPorcentaje,
        cuentasInversion
      }
    };
  }, [accountsWithBalances, enrichedTransactions, config.currency, exchangeRates]);

  // Funciones CRUD
  const addAccount = (account: Omit<Account, 'id' | 'saldoActual'>) => {
    const newAccount: Account = { ...account, id: Date.now().toString(), saldoActual: account.saldoInicial };
    const updated = [...accounts, newAccount];
    setAccounts(updated);
    localStorage.setItem('finance-accounts', JSON.stringify(updated));
  };

  const updateAccount = (id: string, updates: Partial<Account>) => {
    const updated = accounts.map(acc => acc.id === id ? { ...acc, ...updates } : acc);
    setAccounts(updated);
    localStorage.setItem('finance-accounts', JSON.stringify(updated));
  };

  const deleteAccount = (id: string) => {
    const updated = accounts.filter(acc => acc.id !== id);
    setAccounts(updated);
    localStorage.setItem('finance-accounts', JSON.stringify(updated));
  };

  const addCategory = (category: Omit<Category, 'id'>) => {
    const newCategory: Category = { ...category, id: Date.now().toString() };
    const updated = [...categories, newCategory];
    setCategories(updated);
    localStorage.setItem('finance-categories', JSON.stringify(updated));
  };

  const updateCategory = (id: string, updates: Partial<Category>) => {
    const updated = categories.map(cat => cat.id === id ? { ...cat, ...updates } : cat);
    setCategories(updated);
    localStorage.setItem('finance-categories', JSON.stringify(updated));
  };

  const deleteCategory = (id: string) => {
    const updated = categories.filter(cat => cat.id !== id);
    setCategories(updated);
    localStorage.setItem('finance-categories', JSON.stringify(updated));
  };

  const addTransaction = (transaction: Omit<Transaction, 'id' | 'monto'>, autoContribution?: { targetAccountId: string }) => {
    const newTransaction: Transaction = {
      ...transaction,
      id: Date.now().toString(),
      monto: transaction.ingreso - transaction.gasto
    };
    
    const transactionsToAdd = [newTransaction];
    
    // Crear transacción automática si está habilitada
    if (autoContribution?.targetAccountId) {
      const category = categories.find(c => c.id === transaction.subcategoriaId);
      const targetAccount = accounts.find(a => a.id === autoContribution.targetAccountId);
      
      if (category?.tipo === 'Aportación' && targetAccount && transaction.gasto > 0) {
        // Crear transacción automática en la cuenta destino
        const automaticTransaction: Transaction = {
          id: (Date.now() + 1).toString(),
          cuentaId: targetAccount.id,
          fecha: transaction.fecha,
          comentario: `Aportación automática - ${transaction.comentario}`,
          ingreso: transaction.gasto, // El gasto se convierte en ingreso para la cuenta destino
          gasto: 0,
          subcategoriaId: transaction.subcategoriaId,
          monto: transaction.gasto
        };
        transactionsToAdd.push(automaticTransaction);
      }
    }
    
    const updated = [...transactions, ...transactionsToAdd];
    setTransactions(updated);
    localStorage.setItem('finance-transactions', JSON.stringify(updated));
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
    localStorage.setItem('finance-transactions', JSON.stringify(updated));
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
    localStorage.setItem('finance-transactions', JSON.stringify(updated));
  };

  const deleteTransaction = (id: string) => {
    const updated = transactions.filter(t => t.id !== id);
    setTransactions(updated);
    localStorage.setItem('finance-transactions', JSON.stringify(updated));
  };

  const clearAllTransactions = () => {
    setTransactions([]);
    localStorage.setItem('finance-transactions', JSON.stringify([]));
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