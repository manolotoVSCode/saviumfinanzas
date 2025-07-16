import { useState, useMemo } from 'react';
import { Account, Category, Transaction, DashboardMetrics, AccountType, TransactionType } from '@/types/finance';

// Data inicial simple
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
    
    // ACTIVOS DETALLADOS POR MONEDA
    const activosPorMoneda = {
      MXN: {
        efectivoBancos: accountsWithBalances.filter(a => ['Efectivo', 'Banco', 'Ahorros'].includes(a.tipo) && (a.divisa === 'MXN' || !a.divisa)).reduce((s, a) => s + a.saldoActual, 0),
        inversiones: accountsWithBalances.filter(a => a.tipo === 'Inversiones' && (a.divisa === 'MXN' || !a.divisa)).reduce((s, a) => s + a.saldoActual, 0),
        empresasPrivadas: accountsWithBalances.filter(a => a.tipo === 'Empresa Propia' && (a.divisa === 'MXN' || !a.divisa)).reduce((s, a) => s + a.saldoActual, 0),
      },
      USD: {
        efectivoBancos: accountsWithBalances.filter(a => ['Efectivo', 'Banco', 'Ahorros'].includes(a.tipo) && a.divisa === 'USD').reduce((s, a) => s + a.saldoActual, 0),
        inversiones: accountsWithBalances.filter(a => a.tipo === 'Inversiones' && a.divisa === 'USD').reduce((s, a) => s + a.saldoActual, 0),
        empresasPrivadas: accountsWithBalances.filter(a => a.tipo === 'Empresa Propia' && a.divisa === 'USD').reduce((s, a) => s + a.saldoActual, 0),
      },
      EUR: {
        efectivoBancos: accountsWithBalances.filter(a => ['Efectivo', 'Banco', 'Ahorros'].includes(a.tipo) && a.divisa === 'EUR').reduce((s, a) => s + a.saldoActual, 0),
        inversiones: accountsWithBalances.filter(a => a.tipo === 'Inversiones' && a.divisa === 'EUR').reduce((s, a) => s + a.saldoActual, 0),
        empresasPrivadas: accountsWithBalances.filter(a => a.tipo === 'Empresa Propia' && a.divisa === 'EUR').reduce((s, a) => s + a.saldoActual, 0),
      }
    };
    
    // Calcular totales por moneda
    Object.keys(activosPorMoneda).forEach(moneda => {
      const activos = activosPorMoneda[moneda as keyof typeof activosPorMoneda];
      (activos as any).total = activos.efectivoBancos + activos.inversiones + activos.empresasPrivadas;
    });
    
    // Para compatibilidad con código existente
    const activos = {
      efectivoBancos: Object.values(activosPorMoneda).reduce((s, a) => s + a.efectivoBancos, 0),
      inversiones: Object.values(activosPorMoneda).reduce((s, a) => s + a.inversiones, 0),
      empresasPrivadas: Object.values(activosPorMoneda).reduce((s, a) => s + a.empresasPrivadas, 0),
      total: 0
    };
    activos.total = activos.efectivoBancos + activos.inversiones + activos.empresasPrivadas;
    
    // PASIVOS DETALLADOS POR MONEDA
    const pasivosPorMoneda = {
      MXN: {
        tarjetasCredito: accountsWithBalances.filter(a => a.tipo === 'Tarjeta de Crédito' && (a.divisa === 'MXN' || !a.divisa)).reduce((s, a) => s + Math.abs(Math.min(0, a.saldoActual)), 0),
        hipoteca: accountsWithBalances.filter(a => a.tipo === 'Hipoteca' && (a.divisa === 'MXN' || !a.divisa)).reduce((s, a) => s + Math.abs(Math.min(0, a.saldoActual)), 0),
      },
      USD: {
        tarjetasCredito: accountsWithBalances.filter(a => a.tipo === 'Tarjeta de Crédito' && a.divisa === 'USD').reduce((s, a) => s + Math.abs(Math.min(0, a.saldoActual)), 0),
        hipoteca: accountsWithBalances.filter(a => a.tipo === 'Hipoteca' && a.divisa === 'USD').reduce((s, a) => s + Math.abs(Math.min(0, a.saldoActual)), 0),
      },
      EUR: {
        tarjetasCredito: accountsWithBalances.filter(a => a.tipo === 'Tarjeta de Crédito' && a.divisa === 'EUR').reduce((s, a) => s + Math.abs(Math.min(0, a.saldoActual)), 0),
        hipoteca: accountsWithBalances.filter(a => a.tipo === 'Hipoteca' && a.divisa === 'EUR').reduce((s, a) => s + Math.abs(Math.min(0, a.saldoActual)), 0),
      }
    };
    
    // Calcular totales por moneda
    Object.keys(pasivosPorMoneda).forEach(moneda => {
      const pasivos = pasivosPorMoneda[moneda as keyof typeof pasivosPorMoneda];
      (pasivos as any).total = pasivos.tarjetasCredito + pasivos.hipoteca;
    });
    
    // Para compatibilidad con código existente
    const pasivos = {
      tarjetasCredito: Object.values(pasivosPorMoneda).reduce((s, p) => s + p.tarjetasCredito, 0),
      hipoteca: Object.values(pasivosPorMoneda).reduce((s, p) => s + p.hipoteca, 0),
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
    const totalInversiones = accountsWithBalances.filter(a => a.tipo === 'Inversiones').reduce((s, a) => s + a.saldoActual, 0);
    
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
    const valorActualInversiones = accountsWithBalances.filter(a => a.tipo === 'Inversiones').reduce((s, a) => s + a.saldoActual, 0);
    const saldoInicialInversiones = accountsWithBalances.filter(a => a.tipo === 'Inversiones').reduce((s, a) => s + a.saldoInicial, 0);
    const rendimientoAnualTotal = valorActualInversiones - saldoInicialInversiones - totalAportadoAnual + totalRetiradoAnual;
    const rendimientoAnualPorcentaje = (saldoInicialInversiones + totalAportadoAnual - totalRetiradoAnual) > 0 ? 
      (rendimientoAnualTotal / (saldoInicialInversiones + totalAportadoAnual - totalRetiradoAnual)) * 100 : 0;
    
    const cuentasInversion = accountsWithBalances
      .filter(a => a.tipo === 'Inversiones')
      .map(a => {
        const aportaciones = enrichedTransactions.filter(t => t.cuentaId === a.id && t.tipo === 'Aportación').reduce((sum, t) => sum + t.ingreso, 0);
        const retiros = enrichedTransactions.filter(t => t.cuentaId === a.id && t.tipo === 'Retiro').reduce((sum, t) => sum + Math.abs(t.gasto), 0);
        const valorActual = a.saldoActual;
        const rendimiento = valorActual - a.saldoInicial - aportaciones + retiros;
        
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
          saldoInicial: a.saldoInicial,
          rendimiento,
          movimientosPorMes
        };
      });

    return {
      balanceTotal: activos.total,
      activos,
      activosPorMoneda,
      pasivos,
      pasivosPorMoneda,
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
      cuentasResumen: accountsWithBalances.map(a => ({ cuenta: a.nombre, saldo: a.saldoActual, tipo: a.tipo })),
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