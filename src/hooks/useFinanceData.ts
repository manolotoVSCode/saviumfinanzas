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
  { id: '8', subcategoria: 'Aportación ETFs', categoria: 'Inversiones', tipo: 'Aportación' },
  { id: '9', subcategoria: 'Aportación Acciones', categoria: 'Inversiones', tipo: 'Aportación' },
];

const initialAccountTypes: AccountType[] = ['Efectivo', 'Banco', 'Tarjeta de Crédito', 'Ahorros', 'Inversiones', 'Hipoteca', 'Empresa Propia'];

const initialAccounts: Account[] = [
  { id: '1', nombre: 'Cuenta Principal', tipo: 'Banco', saldoInicial: 42500, saldoActual: 42500 },
  { id: '2', nombre: 'Efectivo', tipo: 'Efectivo', saldoInicial: 3200, saldoActual: 3200 },
  { id: '3', nombre: 'Ahorros', tipo: 'Ahorros', saldoInicial: 67800, saldoActual: 67800 },
  { id: '4', nombre: 'Portafolio ETFs', tipo: 'Inversiones', saldoInicial: 125000, saldoActual: 125000 },
  { id: '5', nombre: 'Acciones Individuales', tipo: 'Inversiones', saldoInicial: 89300, saldoActual: 89300 },
  { id: '6', nombre: 'Hipoteca Casa', tipo: 'Hipoteca', saldoInicial: -245000, saldoActual: -245000 },
  { id: '7', nombre: 'Mi Startup Tech', tipo: 'Empresa Propia', saldoInicial: 156000, saldoActual: 156000 },
  { id: '8', nombre: 'Tarjeta de Crédito', tipo: 'Tarjeta de Crédito', saldoInicial: -4200, saldoActual: -4200 },
];

const initialTransactions: Transaction[] = [
  // Enero 2025
  {
    id: '1',
    cuentaId: '1',
    fecha: new Date('2025-01-15'),
    comentario: 'Salario enero',
    ingreso: 28500,
    gasto: 0,
    subcategoriaId: '1',
    monto: 28500
  },
  {
    id: '2',
    cuentaId: '1',
    fecha: new Date('2025-01-20'),
    comentario: 'Compras supermercado',
    ingreso: 0,
    gasto: 4200,
    subcategoriaId: '3',
    monto: -4200
  },
  {
    id: '3',
    cuentaId: '2',
    fecha: new Date('2025-01-08'),
    comentario: 'Cena restaurante',
    ingreso: 0,
    gasto: 1800,
    subcategoriaId: '4',
    monto: -1800
  },
  {
    id: '4',
    cuentaId: '8',
    fecha: new Date('2025-01-25'),
    comentario: 'Pago tarjeta crédito',
    ingreso: 0,
    gasto: 2100,
    subcategoriaId: '3',
    monto: -2100
  },
  
  // Febrero 2025
  {
    id: '5',
    cuentaId: '1',
    fecha: new Date('2025-02-15'),
    comentario: 'Salario febrero',
    ingreso: 29000,
    gasto: 0,
    subcategoriaId: '1',
    monto: 29000
  },
  {
    id: '6',
    cuentaId: '2',
    fecha: new Date('2025-02-10'),
    comentario: 'Proyecto freelance',
    ingreso: 12000,
    gasto: 0,
    subcategoriaId: '2',
    monto: 12000
  },
  {
    id: '7',
    cuentaId: '1',
    fecha: new Date('2025-02-22'),
    comentario: 'Gasolina febrero',
    ingreso: 0,
    gasto: 2400,
    subcategoriaId: '5',
    monto: -2400
  },
  {
    id: '8',
    cuentaId: '1',
    fecha: new Date('2025-02-28'),
    comentario: 'Compras varias',
    ingreso: 0,
    gasto: 3600,
    subcategoriaId: '3',
    monto: -3600
  },
  
  // Marzo 2025
  {
    id: '9',
    cuentaId: '1',
    fecha: new Date('2025-03-15'),
    comentario: 'Salario marzo',
    ingreso: 29500,
    gasto: 0,
    subcategoriaId: '1',
    monto: 29500
  },
  {
    id: '10',
    cuentaId: '1',
    fecha: new Date('2025-03-25'),
    comentario: 'Supermercado marzo',
    ingreso: 0,
    gasto: 4800,
    subcategoriaId: '3',
    monto: -4800
  },
  {
    id: '11',
    cuentaId: '2',
    fecha: new Date('2025-03-12'),
    comentario: 'Cena familiar',
    ingreso: 0,
    gasto: 2200,
    subcategoriaId: '4',
    monto: -2200
  },
  {
    id: '12',
    cuentaId: '4',
    fecha: new Date('2025-03-05'),
    comentario: 'Aportación ETFs marzo',
    ingreso: 18000,
    gasto: 0,
    subcategoriaId: '8',
    monto: 18000
  },
  
  // Abril 2025
  {
    id: '13',
    cuentaId: '1',
    fecha: new Date('2025-04-15'),
    comentario: 'Salario abril',
    ingreso: 30000,
    gasto: 0,
    subcategoriaId: '1',
    monto: 30000
  },
  {
    id: '14',
    cuentaId: '1',
    fecha: new Date('2025-04-08'),
    comentario: 'Gasolina abril',
    ingreso: 0,
    gasto: 2600,
    subcategoriaId: '5',
    monto: -2600
  },
  {
    id: '15',
    cuentaId: '2',
    fecha: new Date('2025-04-20'),
    comentario: 'Freelance diseño web',
    ingreso: 15000,
    gasto: 0,
    subcategoriaId: '2',
    monto: 15000
  },
  {
    id: '16',
    cuentaId: '5',
    fecha: new Date('2025-04-10'),
    comentario: 'Compra acciones Tesla',
    ingreso: 25000,
    gasto: 0,
    subcategoriaId: '9',
    monto: 25000
  },
  
  // Mayo 2025
  {
    id: '17',
    cuentaId: '1',
    fecha: new Date('2025-05-15'),
    comentario: 'Salario mayo',
    ingreso: 30500,
    gasto: 0,
    subcategoriaId: '1',
    monto: 30500
  },
  {
    id: '18',
    cuentaId: '1',
    fecha: new Date('2025-05-22'),
    comentario: 'Supermercado mayo',
    ingreso: 0,
    gasto: 5200,
    subcategoriaId: '3',
    monto: -5200
  },
  {
    id: '19',
    cuentaId: '8',
    fecha: new Date('2025-05-12'),
    comentario: 'Restaurante elegante',
    ingreso: 0,
    gasto: 3400,
    subcategoriaId: '4',
    monto: -3400
  },
  {
    id: '20',
    cuentaId: '4',
    fecha: new Date('2025-05-05'),
    comentario: 'Aportación ETFs mayo',
    ingreso: 20000,
    gasto: 0,
    subcategoriaId: '8',
    monto: 20000
  },
  
  // Junio 2025
  {
    id: '21',
    cuentaId: '1',
    fecha: new Date('2025-06-15'),
    comentario: 'Salario junio',
    ingreso: 31000,
    gasto: 0,
    subcategoriaId: '1',
    monto: 31000
  },
  {
    id: '22',
    cuentaId: '1',
    fecha: new Date('2025-06-30'),
    comentario: 'Gasolina junio',
    ingreso: 0,
    gasto: 2800,
    subcategoriaId: '5',
    monto: -2800
  },
  {
    id: '23',
    cuentaId: '2',
    fecha: new Date('2025-06-18'),
    comentario: 'Consultoría marketing',
    ingreso: 18000,
    gasto: 0,
    subcategoriaId: '2',
    monto: 18000
  },
  {
    id: '24',
    cuentaId: '5',
    fecha: new Date('2025-06-05'),
    comentario: 'Compra acciones Apple',
    ingreso: 15000,
    gasto: 0,
    subcategoriaId: '9',
    monto: 15000
  },
  {
    id: '25',
    cuentaId: '4',
    fecha: new Date('2025-06-15'),
    comentario: 'Aportación ETFs junio',
    ingreso: 22000,
    gasto: 0,
    subcategoriaId: '8',
    monto: 22000
  },
  
  // Julio 2025
  {
    id: '26',
    cuentaId: '1',
    fecha: new Date('2025-07-15'),
    comentario: 'Salario julio',
    ingreso: 31500,
    gasto: 0,
    subcategoriaId: '1',
    monto: 31500
  },
  {
    id: '27',
    cuentaId: '1',
    fecha: new Date('2025-07-05'),
    comentario: 'Supermercado julio',
    ingreso: 0,
    gasto: 5800,
    subcategoriaId: '3',
    monto: -5800
  },
  {
    id: '28',
    cuentaId: '2',
    fecha: new Date('2025-07-12'),
    comentario: 'Cena de negocios',
    ingreso: 0,
    gasto: 2900,
    subcategoriaId: '4',
    monto: -2900
  },
  {
    id: '29',
    cuentaId: '1',
    fecha: new Date('2025-07-20'),
    comentario: 'Gasolina y peajes',
    ingreso: 0,
    gasto: 3200,
    subcategoriaId: '5',
    monto: -3200
  },
  {
    id: '30',
    cuentaId: '4',
    fecha: new Date('2025-07-10'),
    comentario: 'Aportación mensual ETFs',
    ingreso: 25000,
    gasto: 0,
    subcategoriaId: '8',
    monto: 25000
  },
  {
    id: '31',
    cuentaId: '5',
    fecha: new Date('2025-07-08'),
    comentario: 'Inversión acciones Microsoft',
    ingreso: 20000,
    gasto: 0,
    subcategoriaId: '9',
    monto: 20000
  },
  {
    id: '32',
    cuentaId: '2',
    fecha: new Date('2025-07-25'),
    comentario: 'Proyecto desarrollo app',
    ingreso: 22000,
    gasto: 0,
    subcategoriaId: '2',
    monto: 22000
  }
];

export const useFinanceData = () => {
  const [accounts, setAccounts] = useState<Account[]>(initialAccounts);
  const [categories, setCategories] = useState<Category[]>(initialCategories);
  const [transactions, setTransactions] = useState<Transaction[]>(initialTransactions);
  const [accountTypes] = useState<AccountType[]>(initialAccountTypes);
  const [dateFilter, setDateFilter] = useState<{ start: Date; end: Date }>({
    start: new Date(2025, 0, 1), // Enero 1, 2025
    end: new Date(2025, 11, 31)  // Diciembre 31, 2025
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
        .reduce((sum, acc) => sum + acc.saldoActual, 0),
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