import { useState, useEffect, useMemo } from 'react';
import { Account, Category, Transaction, TransactionType, AccountType, DashboardMetrics } from '@/types/finance';

// Categorías reales
const initialCategories: Category[] = [
  { id: '1', subcategoria: 'Nómina', categoria: '💰 Sueldos', tipo: 'Ingreso' },
  { id: '2', subcategoria: 'Bonos / Comisiones', categoria: '💰 Sueldos', tipo: 'Ingreso' },
  { id: '3', subcategoria: 'Reembolsos', categoria: '💰 Ingresos adicionales', tipo: 'Ingreso' },
  { id: '4', subcategoria: 'Ventas personales', categoria: '💰 Ingresos adicionales', tipo: 'Ingreso' },
  { id: '5', subcategoria: 'Otros ingresos', categoria: '💰 Ingresos adicionales', tipo: 'Ingreso' },
  { id: '6', subcategoria: 'Alquiler / Hipoteca', categoria: '🏠 Hogar', tipo: 'Gastos' },
  { id: '7', subcategoria: 'Servicios (luz, agua, gas, mantenimiento)', categoria: '🏠 Hogar', tipo: 'Gastos' },
  { id: '8', subcategoria: 'Supermercado, Oxxo', categoria: '🥑 Alimentación', tipo: 'Gastos' },
  { id: '9', subcategoria: 'Uber / Taxi / Vuelos', categoria: '🎿 Ocio y tiempo libre', tipo: 'Gastos' },
  { id: '10', subcategoria: 'Casetas / Parking / Gas / Servicios', categoria: '🚙 Transporte', tipo: 'Gastos' },
  { id: '11', subcategoria: 'Seguro médico', categoria: '🩺 Salud', tipo: 'Gastos' },
  { id: '12', subcategoria: 'Farmacia / Consultas / Laboratorio', categoria: '🩺 Salud', tipo: 'Gastos' },
  { id: '13', subcategoria: 'Colegiaturas / Cursos / Material Escolar', categoria: '📚 Educación', tipo: 'Gastos' },
  { id: '14', subcategoria: 'Restaurantes, Café, Viajes', categoria: '🎿 Ocio y tiempo libre', tipo: 'Gastos' },
  { id: '15', subcategoria: 'Compras', categoria: '🛒 Compras personales', tipo: 'Gastos' },
  { id: '16', subcategoria: 'Cuotas / Suscripciones', categoria: '🛒 Compras personales', tipo: 'Gastos' },
  { id: '17', subcategoria: 'Aportación ahorro', categoria: '🏦 Inversiones', tipo: 'Aportación' },
  { id: '18', subcategoria: 'Aportación a Sociedad', categoria: '🏦 Participaciones', tipo: 'Retiro' },
  { id: '19', subcategoria: 'Pago tarjeta de crédito', categoria: '🔂 Transferencias internas', tipo: 'Retiro' },
  { id: '20', subcategoria: 'A otra cuenta propia', categoria: '🔂 Transferencias internas', tipo: 'Aportación' },
  { id: '21', subcategoria: 'Retiro Ahorro', categoria: '🏦 Inversiones', tipo: 'Retiro' },
  { id: '22', subcategoria: 'Dividentos', categoria: '🏦 Participaciones', tipo: 'Ingreso' },
  { id: '23', subcategoria: 'Abono tarjeta de crédito', categoria: '🔂 Transferencias internas', tipo: 'Aportación' },
  { id: '24', subcategoria: 'Desde otra cuenta propia', categoria: '🔂 Transferencias internas', tipo: 'Retiro' },
  { id: '25', subcategoria: 'Impuestos', categoria: '📃 Impuestos', tipo: 'Gastos' },
  { id: '26', subcategoria: 'Pago Deuda', categoria: '🔂 Transferencias internas', tipo: 'Aportación' },
  { id: '27', subcategoria: 'Abono Deuda', categoria: '🔂 Transferencias internas', tipo: 'Aportación' },
];

const initialAccountTypes: AccountType[] = ['Efectivo', 'Banco', 'Tarjeta de Crédito', 'Ahorros', 'Inversiones', 'Hipoteca', 'Empresa Propia'];

const initialAccounts: Account[] = [
  { id: '1', nombre: 'HSBC', tipo: 'Banco', saldoInicial: 0, saldoActual: 0 },
  { id: '2', nombre: 'AMEX', tipo: 'Tarjeta de Crédito', saldoInicial: 0, saldoActual: 0 },
  { id: '3', nombre: 'Mastercard', tipo: 'Tarjeta de Crédito', saldoInicial: 0, saldoActual: 0 },
  { id: '4', nombre: 'QUANT', tipo: 'Inversiones', saldoInicial: 0, saldoActual: 0 },
];

const initialTransactions: Transaction[] = [];

export const useFinanceData = () => {
  // Cargar datos desde localStorage al iniciar
  const loadFromStorage = (key: string, defaultValue: any) => {
    try {
      const stored = localStorage.getItem(key);
      if (stored) {
        const parsed = JSON.parse(stored);
        // Convertir fechas de vuelta a objetos Date si es necesario
        if (key === 'financeTransactions') {
          return parsed.map((t: any) => ({
            ...t,
            fecha: new Date(t.fecha)
          }));
        }
        return parsed;
      }
    } catch (error) {
      console.error(`Error loading ${key} from localStorage:`, error);
    }
    return defaultValue;
  };

  const [accounts, setAccounts] = useState<Account[]>(() => 
    loadFromStorage('financeAccounts', initialAccounts)
  );
  const [categories, setCategories] = useState<Category[]>(() => 
    loadFromStorage('financeCategories', initialCategories)
  );
  const [transactions, setTransactions] = useState<Transaction[]>(() => 
    loadFromStorage('financeTransactions', initialTransactions)
  );
  const [accountTypes] = useState<AccountType[]>(initialAccountTypes);
  const [dateFilter, setDateFilter] = useState<{ start: Date; end: Date }>({
    start: new Date(2025, 0, 1), // Enero 1, 2025
    end: new Date(2025, 11, 31)  // Diciembre 31, 2025
  });

  // Guardar en localStorage cuando cambien los datos
  useEffect(() => {
    localStorage.setItem('financeAccounts', JSON.stringify(accounts));
  }, [accounts]);

  useEffect(() => {
    localStorage.setItem('financeCategories', JSON.stringify(categories));
  }, [categories]);

  useEffect(() => {
    localStorage.setItem('financeTransactions', JSON.stringify(transactions));
  }, [transactions]);

  // Recalcular saldos actuales cuando cambien las transacciones
  useEffect(() => {
    const updatedAccounts = accounts.map(account => {
      const accountTransactions = transactions.filter(t => t.cuentaId === account.id);
      const totalTransactions = accountTransactions.reduce((sum, t) => sum + t.monto, 0);
      const newSaldoActual = account.saldoInicial + totalTransactions;
      
      // Solo actualizar si el saldo cambió para evitar loops infinitos
      if (account.saldoActual !== newSaldoActual) {
        return {
          ...account,
          saldoActual: newSaldoActual
        };
      }
      return account;
    });
    
    // Solo setState si realmente hay cambios
    const hasChanges = updatedAccounts.some((acc, index) => 
      acc.saldoActual !== accounts[index].saldoActual
    );
    
    if (hasChanges) {
      setAccounts(updatedAccounts);
    }
  }, [transactions]); // Removemos accounts de las dependencias para evitar loops

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
    // Filtrar transacciones para el mes actual (julio 2025)
    const currentDate = new Date();
    const currentMonth = 6; // Julio (0-indexed)
    const currentYear = 2025;
    
    const mesActualStart = new Date(currentYear, currentMonth, 1);
    const mesActualEnd = new Date(currentYear, currentMonth + 1, 0);
    
    const transaccionesMesActual = enrichedTransactions.filter(t => 
      t.fecha >= mesActualStart && t.fecha <= mesActualEnd
    );

    console.log('Mes actual:', { mesActualStart, mesActualEnd });
    console.log('Transacciones mes actual:', transaccionesMesActual);
    console.log('Todas las transacciones enriched:', enrichedTransactions);

    // ACTIVOS (lo que tienes)
    const activos = {
      efectivoBancos: accounts
        .filter(acc => ['Efectivo', 'Banco', 'Ahorros'].includes(acc.tipo))
        .reduce((sum, acc) => sum + acc.saldoActual, 0),
      inversiones: accounts
        .filter(acc => acc.tipo === 'Inversiones')
        .reduce((sum, acc) => sum + (acc.valorMercado || acc.saldoActual), 0),
      empresasPrivadas: accounts
        .filter(acc => acc.tipo === 'Empresa Propia')
        .reduce((sum, acc) => sum + acc.saldoActual, 0),
      total: 0
    };
    activos.total = activos.efectivoBancos + activos.inversiones + activos.empresasPrivadas;

    // PASIVOS (lo que debes)
    const pasivos = {
      tarjetasCredito: accounts
        .filter(acc => acc.tipo === 'Tarjeta de Crédito')
        .reduce((sum, acc) => sum + Math.abs(acc.saldoActual), 0),
      hipoteca: accounts
        .filter(acc => acc.tipo === 'Hipoteca')
        .reduce((sum, acc) => sum + Math.abs(acc.saldoActual), 0),
      total: 0
    };
    pasivos.total = pasivos.tarjetasCredito + pasivos.hipoteca;

    // PATRIMONIO NETO = Activos - Pasivos
    const patrimonioNeto = activos.total - pasivos.total;
    
    // Balance total (mantener para compatibilidad)
    const balanceTotal = patrimonioNeto;
    const ingresosMes = transaccionesMesActual.filter(t => t.tipo === 'Ingreso').reduce((sum, t) => sum + t.ingreso, 0);
    const gastosMes = transaccionesMesActual.filter(t => t.tipo === 'Gastos').reduce((sum, t) => sum + t.gasto, 0);
    const balanceMes = ingresosMes - gastosMes;

    console.log('Ingresos mes actual:', ingresosMes);
    console.log('Gastos mes actual:', gastosMes);

    // Métricas del mes anterior para comparativo (junio 2025)
    const mesAnteriorStart = new Date(currentYear, currentMonth - 1, 1);
    const mesAnteriorEnd = new Date(currentYear, currentMonth, 0);
    
    const transaccionesMesAnterior = enrichedTransactions.filter(t => 
      t.fecha >= mesAnteriorStart && t.fecha <= mesAnteriorEnd
    );
    
    const ingresosMesAnterior = transaccionesMesAnterior.filter(t => t.tipo === 'Ingreso').reduce((sum, t) => sum + t.ingreso, 0);
    const gastosMesAnterior = transaccionesMesAnterior.filter(t => t.tipo === 'Gastos').reduce((sum, t) => sum + t.gasto, 0);
    const balanceMesAnterior = ingresosMesAnterior - gastosMesAnterior;

    // Calcular variaciones porcentuales
    const variacionIngresos = ingresosMesAnterior > 0 ? ((ingresosMes - ingresosMesAnterior) / ingresosMesAnterior) * 100 : 0;
    const variacionGastos = gastosMesAnterior > 0 ? ((gastosMes - gastosMesAnterior) / gastosMesAnterior) * 100 : 0;

    // Top categorías (basado en transacciones del mes actual - solo gastos)
    const categoryTotals = new Map<string, { monto: number; tipo: TransactionType }>();
    transaccionesMesActual.forEach(t => {
      if (t.categoria && t.tipo === 'Gastos') { // Solo incluir gastos
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

    // Top categorías del mes anterior (para gráfica mensual)
    const categoryTotalsMesAnterior = new Map<string, { monto: number; tipo: TransactionType }>();
    transaccionesMesAnterior.forEach(t => {
      if (t.categoria && t.tipo === 'Gastos') { // Solo incluir gastos
        const key = `${t.categoria}_${t.tipo}`;
        const current = categoryTotalsMesAnterior.get(key) || { monto: 0, tipo: t.tipo };
        categoryTotalsMesAnterior.set(key, {
          monto: current.monto + Math.abs(t.monto),
          tipo: t.tipo
        });
      }
    });

    const topCategoriasMesAnterior = Array.from(categoryTotalsMesAnterior.entries())
      .map(([key, value]) => ({
        categoria: key.split('_')[0],
        monto: value.monto,
        tipo: value.tipo
      }))
      .sort((a, b) => b.monto - a.monto)
      .slice(0, 5);

    // Métricas anuales (año 2025 completo)
    const anioStart = new Date(currentYear, 0, 1);
    const anioEnd = new Date(currentYear, 11, 31);
    
    const transaccionesAnio = enrichedTransactions.filter(t => 
      t.fecha >= anioStart && t.fecha <= anioEnd
    );
    
    const ingresosAnio = transaccionesAnio.filter(t => t.tipo === 'Ingreso').reduce((sum, t) => sum + t.ingreso, 0);
    const gastosAnio = transaccionesAnio.filter(t => t.tipo === 'Gastos').reduce((sum, t) => sum + t.gasto, 0);
    const balanceAnio = ingresosAnio - gastosAnio;

    // Métricas del año anterior (2024) para comparativo
    const anioAnteriorStart = new Date(currentYear - 1, 0, 1);
    const anioAnteriorEnd = new Date(currentYear - 1, 11, 31);
    
    const transaccionesAnioAnterior = enrichedTransactions.filter(t => 
      t.fecha >= anioAnteriorStart && t.fecha <= anioAnteriorEnd
    );
    
    const ingresosAnioAnterior = transaccionesAnioAnterior.filter(t => t.tipo === 'Ingreso').reduce((sum, t) => sum + t.ingreso, 0);
    const gastosAnioAnterior = transaccionesAnioAnterior.filter(t => t.tipo === 'Gastos').reduce((sum, t) => sum + t.gasto, 0);
    const balanceAnioAnterior = ingresosAnioAnterior - gastosAnioAnterior;

    // Calcular variaciones porcentuales anuales
    const variacionIngresosAnual = ingresosAnioAnterior > 0 ? ((ingresosAnio - ingresosAnioAnterior) / ingresosAnioAnterior) * 100 : 0;
    const variacionGastosAnual = gastosAnioAnterior > 0 ? ((gastosAnio - gastosAnioAnterior) / gastosAnioAnterior) * 100 : 0;
    const variacionBalanceAnual = balanceAnioAnterior !== 0 ? ((balanceAnio - balanceAnioAnterior) / Math.abs(balanceAnioAnterior)) * 100 : 0;

    // Top categorías anuales (basado en transacciones del año - solo gastos)
    const categoryTotalsAnual = new Map<string, { monto: number; tipo: TransactionType }>();
    transaccionesAnio.forEach(t => {
      if (t.categoria && t.tipo === 'Gastos') { // Solo incluir gastos
        const key = `${t.categoria}_${t.tipo}`;
        const current = categoryTotalsAnual.get(key) || { monto: 0, tipo: t.tipo };
        categoryTotalsAnual.set(key, {
          monto: current.monto + Math.abs(t.monto),
          tipo: t.tipo
        });
      }
    });

    const topCategoriasAnual = Array.from(categoryTotalsAnual.entries())
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

    // Métricas de inversiones
    const cuentasInversion = accounts.filter(acc => acc.tipo === 'Inversiones');
    const totalInversiones = cuentasInversion.reduce((sum, acc) => sum + acc.saldoActual, 0);
    
    const aportacionesMes = transaccionesMesActual
      .filter(t => t.tipo === 'Aportación' && cuentasInversion.some(inv => inv.id === t.cuentaId))
      .reduce((sum, t) => sum + t.ingreso, 0);
    
    const aportacionesMesAnterior = transaccionesMesAnterior
      .filter(t => t.tipo === 'Aportación' && cuentasInversion.some(inv => inv.id === t.cuentaId))
      .reduce((sum, t) => sum + t.ingreso, 0);
    
    const variacionAportaciones = aportacionesMesAnterior > 0 ? 
      ((aportacionesMes - aportacionesMesAnterior) / aportacionesMesAnterior) * 100 : 0;
    
    const cuentasInversionResumen = cuentasInversion.map(acc => {
      const rendimiento = acc.saldoActual - acc.saldoInicial;
      return {
        cuenta: acc.nombre,
        saldo: acc.saldoActual,
        saldoInicial: acc.saldoInicial,
        rendimiento
      };
    });

    const inversionesResumen = {
      totalInversiones,
      aportacionesMes,
      aportacionesMesAnterior,
      variacionAportaciones,
      cuentasInversion: cuentasInversionResumen
    };

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
    
    // Calcular patrimonio del mes anterior para variación
    // Para el patrimonio anterior, restar las transacciones del mes actual
    const patrimonioNetoAnterior = patrimonioNeto - balanceMes;
    const variacionPatrimonio = patrimonioNetoAnterior > 0 ? 
      ((patrimonioNeto - patrimonioNetoAnterior) / patrimonioNetoAnterior) * 100 : 
      patrimonioNeto > 0 ? 100 : 0;

    // Score de salud financiera
    const ratioDeuda = pasivos.total > 0 ? (pasivos.total / activos.total) * 100 : 0;
    const ratioAhorro = ingresosMes > 0 ? ((ingresosMes - gastosMes) / ingresosMes) * 100 : 0;
    
    let score = 10;
    let nivel: 'Excelente' | 'Buena' | 'Regular' | 'Mejorable' | 'Crítica' = 'Excelente';
    let descripcion = '';
    
    // Penalizar por alto ratio de deuda
    if (ratioDeuda > 80) {
      score -= 4;
      descripcion = 'Alto nivel de deuda';
    } else if (ratioDeuda > 60) {
      score -= 2;
      descripcion = 'Nivel de deuda moderado';
    } else if (ratioDeuda > 30) {
      score -= 1;
      descripcion = 'Nivel de deuda controlado';
    } else {
      descripcion = 'Estructura financiera sólida';
    }
    
    // Penalizar por bajo ratio de ahorro
    if (ratioAhorro < 10) {
      score -= 3;
      descripcion += ratioDeuda > 0 ? ', muy bajo ahorro' : 'Muy bajo nivel de ahorro';
    } else if (ratioAhorro < 20) {
      score -= 1;
      descripcion += ratioDeuda > 0 ? ', ahorro mejorable' : 'Ahorro mejorable';
    } else {
      descripcion += ratioDeuda > 0 ? ', buen nivel de ahorro' : 'Excelente capacidad de ahorro';
    }
    
    // Determinar nivel según score
    if (score >= 9) nivel = 'Excelente';
    else if (score >= 7) nivel = 'Buena';
    else if (score >= 5) nivel = 'Regular';
    else if (score >= 3) nivel = 'Mejorable';
    else nivel = 'Crítica';
    
    const saludFinanciera = {
      score: Number(score.toFixed(1)),
      nivel,
      descripcion
    };

    // Distribución de activos
    const distribucionActivos = [
      {
        categoria: 'Efectivo y Bancos',
        monto: activos.efectivoBancos,
        porcentaje: activos.total > 0 ? (activos.efectivoBancos / activos.total) * 100 : 0
      },
      {
        categoria: 'Inversiones',
        monto: activos.inversiones,
        porcentaje: activos.total > 0 ? (activos.inversiones / activos.total) * 100 : 0
      },
      {
        categoria: 'Empresas Privadas',
        monto: activos.empresasPrivadas,
        porcentaje: activos.total > 0 ? (activos.empresasPrivadas / activos.total) * 100 : 0
      }
    ].filter(item => item.monto > 0);

    return {
      balanceTotal,
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
      saludFinanciera,
      distribucionActivos,
      topCategorias,
      topCategoriasMesAnterior,
      topCategoriasAnual,
      cuentasResumen,
      tendenciaMensual,
      inversionesResumen
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

  const addTransactionsBatch = (transactions: Omit<Transaction, 'id' | 'monto'>[]) => {
    const newTransactions: Transaction[] = transactions.map(transaction => {
      // Usar el csvId si existe, sino generar uno
      const id = (transaction as any).csvId || (Date.now().toString() + Math.random().toString(36).substr(2, 9));
      return {
        ...transaction,
        id: id,
        monto: transaction.ingreso - transaction.gasto,
      };
    });
    console.log('Adding transactions batch:', newTransactions.length, 'transactions');
    console.log('Sample transaction:', newTransactions[0]);
    setTransactions(prev => [...prev, ...newTransactions]);
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

  const clearAllTransactions = () => {
    setTransactions([]);
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
    deleteCategory,
    updateCategory,
    deleteTransaction,
    addTransaction,
    addTransactionsBatch,
    updateTransaction,
    clearAllTransactions,
    setDateFilter
  };
};