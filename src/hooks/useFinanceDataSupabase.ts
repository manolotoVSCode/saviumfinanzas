import { useState, useEffect, useMemo } from 'react';
import { Account, Category, Transaction, DashboardMetrics, AccountType, TransactionType } from '@/types/finance';
import { supabase } from '@/integrations/supabase/client';
import { useExchangeRates } from './useExchangeRates';
import { useAppConfig } from './useAppConfig';
import { useToast } from '@/hooks/use-toast';

export const useFinanceDataSupabase = () => {
  const { convertCurrency } = useExchangeRates();
  const { config } = useAppConfig();
  const { toast } = useToast();
  
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);

  const [accountTypes] = useState<AccountType[]>([
    'Efectivo', 'Banco', 'Tarjeta de Crédito', 'Ahorros', 'Inversiones', 'Hipoteca', 'Empresa Propia'
  ]);

  const [dateFilter, setDateFilter] = useState<{ start: Date; end: Date }>({
    start: new Date(2025, 0, 1),
    end: new Date(2025, 11, 31)
  });

  // Cargar datos iniciales
  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      
      // Cargar cuentas
      const { data: cuentasData, error: cuentasError } = await supabase
        .from('cuentas')
        .select('*');
      
      if (cuentasError) throw cuentasError;

      // Cargar categorías
      const { data: categoriasData, error: categoriasError } = await supabase
        .from('categorias')
        .select('*');
      
      if (categoriasError) throw categoriasError;

      // Cargar transacciones
      const { data: transaccionesData, error: transaccionesError } = await supabase
        .from('transacciones')
        .select('*')
        .order('fecha', { ascending: false });
      
      if (transaccionesError) throw transaccionesError;

      // Mapear datos de Supabase a tipos locales
      const mappedAccounts: Account[] = cuentasData.map(cuenta => ({
        id: cuenta.id,
        nombre: cuenta.nombre,
        tipo: cuenta.tipo as AccountType,
        saldoInicial: Number(cuenta.saldo_inicial),
        saldoActual: Number(cuenta.saldo_inicial), // Se calculará después
        divisa: cuenta.divisa as 'MXN' | 'USD' | 'EUR',
        valorMercado: cuenta.valor_mercado ? Number(cuenta.valor_mercado) : undefined,
        rendimientoMensual: cuenta.rendimiento_mensual ? Number(cuenta.rendimiento_mensual) : undefined
      }));

      const mappedCategories: Category[] = categoriasData.map(categoria => ({
        id: categoria.id,
        subcategoria: categoria.subcategoria,
        categoria: categoria.categoria,
        tipo: categoria.tipo as TransactionType
      }));

      const mappedTransactions: Transaction[] = transaccionesData.map(transaccion => ({
        id: transaccion.id,
        fecha: new Date(transaccion.fecha),
        comentario: transaccion.comentario,
        monto: Number(transaccion.ingreso) - Number(transaccion.gasto),
        ingreso: Number(transaccion.ingreso),
        gasto: Number(transaccion.gasto),
        subcategoriaId: transaccion.subcategoria_id,
        cuentaId: transaccion.cuenta_id,
        divisa: transaccion.divisa as 'MXN' | 'USD' | 'EUR'
      }));

      setAccounts(mappedAccounts);
      setCategories(mappedCategories);
      setTransactions(mappedTransactions);

    } catch (error) {
      console.error('Error loading data:', error);
      toast({
        title: "Error",
        description: "No se pudieron cargar los datos financieros",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

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

  // Funciones auxiliares para el cálculo de score financiero (definidas antes del useMemo)
  const calcularScoreFinanciero = (activos: any, pasivos: any, balanceMes: number, ahorroTarget: number) => {
    let score = 0;
    
    // Ratio de liquidez (30 puntos máximo)
    const ratioLiquidez = activos.efectivoBancos / (pasivos.total || 1);
    if (ratioLiquidez >= 3) score += 30;
    else if (ratioLiquidez >= 1) score += 20;
    else score += 10;
    
    // Capacidad de ahorro (40 puntos máximo)
    const ratioAhorro = balanceMes / ahorroTarget;
    if (ratioAhorro >= 1) score += 40;
    else if (ratioAhorro >= 0.5) score += 25;
    else if (ratioAhorro > 0) score += 15;
    
    // Diversificación (30 puntos máximo)
    if (activos.inversiones > 0) score += 20;
    if (activos.total > activos.efectivoBancos) score += 10;
    
    return Math.min(100, score);
  };

  const generateRecommendations = (activos: any, pasivos: any, balanceMes: number, ahorroTarget: number) => {
    const recommendations = [];
    
    if (balanceMes < ahorroTarget) {
      recommendations.push('Considera reducir gastos para alcanzar tu meta de ahorro mensual');
    }
    
    if (pasivos.total > activos.efectivoBancos * 2) {
      recommendations.push('Tu nivel de deuda es alto, prioriza reducir pasivos');
    }
    
    if (activos.inversiones === 0) {
      recommendations.push('Considera diversificar con inversiones para hacer crecer tu patrimonio');
    }
    
    return recommendations;
  };

  // Dashboard metrics (reutilizar la misma lógica del hook original)
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
    
    // Para el dashboard, NO filtrar por divisa sino incluir todas las transacciones convertidas
    const transactionsThisMonth = enrichedTransactions.filter(t => t.fecha >= startOfMonth && t.fecha <= endOfMonth);
    const transactionsPreviousMonth = enrichedTransactions.filter(t => t.fecha >= startOfPreviousMonth && t.fecha <= endOfPreviousMonth);
    const transactionsThisYear = enrichedTransactions.filter(t => t.fecha >= startOfYear && t.fecha <= endOfYear);
    const transactionsLastYear = enrichedTransactions.filter(t => t.fecha >= startOfLastYear && t.fecha <= endOfLastYear);
    
    // Debug logs para verificar fechas
    console.log('=== DEBUG FECHAS ===');
    console.log('Fecha actual:', now);
    console.log('Mes actual:', now.getMonth() + 1); // +1 porque getMonth() es 0-indexado
    console.log('startOfPreviousMonth:', startOfPreviousMonth);
    console.log('endOfPreviousMonth:', endOfPreviousMonth);
    console.log('Sample enriched transactions:', enrichedTransactions.slice(0, 3).map(t => ({ fecha: t.fecha, fechaString: t.fecha.toISOString(), comentario: t.comentario.substring(0, 20), ingreso: t.ingreso, tipo: t.tipo })));
    console.log('transactionsPreviousMonth:', transactionsPreviousMonth.map(t => ({ fecha: t.fecha, fechaString: t.fecha.toISOString(), comentario: t.comentario.substring(0, 20), ingreso: t.ingreso, tipo: t.tipo })));
    
    // INGRESOS Y GASTOS MENSUALES - CONVERTIR A MXN
    const ingresosMes = transactionsThisMonth
      .filter(t => t.tipo === 'Ingreso')
      .reduce((sum, t) => sum + convertCurrency(t.ingreso, t.divisa, 'MXN'), 0);
    const gastosMes = transactionsThisMonth
      .filter(t => t.tipo === 'Gastos')
      .reduce((sum, t) => sum + convertCurrency(t.gasto, t.divisa, 'MXN'), 0);
    const balanceMes = ingresosMes - gastosMes;
    
    // MES ANTERIOR (dinámico) - CONVERTIR A MXN
    const ingresosMesAnterior = transactionsPreviousMonth
      .filter(t => t.tipo === 'Ingreso')
      .reduce((sum, t) => sum + convertCurrency(t.ingreso, t.divisa, 'MXN'), 0);
    const gastosMesAnterior = transactionsPreviousMonth
      .filter(t => t.tipo === 'Gastos')
      .reduce((sum, t) => sum + convertCurrency(t.gasto, t.divisa, 'MXN'), 0);
    const balanceMesAnterior = ingresosMesAnterior - gastosMesAnterior;
    
    // ANUALES - CONVERTIR A MXN
    const ingresosAnio = transactionsThisYear
      .filter(t => t.tipo === 'Ingreso')
      .reduce((sum, t) => sum + convertCurrency(t.ingreso, t.divisa, 'MXN'), 0);
    const gastosAnio = transactionsThisYear
      .filter(t => t.tipo === 'Gastos')
      .reduce((sum, t) => sum + convertCurrency(t.gasto, t.divisa, 'MXN'), 0);
    const balanceAnio = ingresosAnio - gastosAnio;
    
    // AÑO ANTERIOR - CONVERTIR A MXN
    const ingresosAnioAnterior = transactionsLastYear
      .filter(t => t.tipo === 'Ingreso')
      .reduce((sum, t) => sum + convertCurrency(t.ingreso, t.divisa, 'MXN'), 0);
    const gastosAnioAnterior = transactionsLastYear
      .filter(t => t.tipo === 'Gastos')
      .reduce((sum, t) => sum + convertCurrency(t.gasto, t.divisa, 'MXN'), 0);
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
    
    // Para compatibilidad con código existente - EXCLUYENDO EMPRESAS PRIVADAS del total
    const activos = {
      efectivoBancos: Object.entries(activosPorMoneda).reduce((total, [moneda, activos]) => {
        return total + convertCurrency(activos.efectivoBancos, moneda as any, config.currency);
      }, 0),
      inversiones: Object.entries(activosPorMoneda).reduce((total, [moneda, activos]) => {
        return total + convertCurrency(activos.inversiones, moneda as any, config.currency);
      }, 0),
      empresasPrivadas: Object.entries(activosPorMoneda).reduce((total, [moneda, activos]) => {
        return total + convertCurrency(activos.empresasPrivadas, moneda as any, config.currency);
      }, 0),
      total: 0
    };
    // TOTAL ACTIVOS = SOLO efectivo + inversiones (SIN empresas privadas)
    activos.total = activos.efectivoBancos + activos.inversiones;
    
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
    
    // Para compatibilidad con código existente - convertir a moneda configurada
    const pasivos = {
      tarjetasCredito: Object.entries(pasivosPorMoneda).reduce((total, [moneda, pasivos]) => {
        return total + convertCurrency(pasivos.tarjetasCredito, moneda as any, config.currency);
      }, 0),
      hipoteca: Object.entries(pasivosPorMoneda).reduce((total, [moneda, pasivos]) => {
        return total + convertCurrency(pasivos.hipoteca, moneda as any, config.currency);
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
    
    // TENDENCIA MENSUAL (últimos 12 meses) - CONVERTIDO A MXN PARA DASHBOARD
    const tendenciaMensual = [];
    for (let i = 11; i >= 0; i--) {
      const date = new Date();
      date.setMonth(date.getMonth() - i);
      const monthStart = new Date(date.getFullYear(), date.getMonth(), 1);
      const monthEnd = new Date(date.getFullYear(), date.getMonth() + 1, 0);
      
      const monthTransactions = enrichedTransactions.filter(t => t.fecha >= monthStart && t.fecha <= monthEnd);
      
      // Convertir todos los ingresos y gastos a MXN para el dashboard
      const ingresos = monthTransactions
        .filter(t => t.tipo === 'Ingreso')
        .reduce((sum, t) => sum + convertCurrency(t.ingreso, t.divisa, 'MXN'), 0);
      const gastos = monthTransactions
        .filter(t => t.tipo === 'Gastos')
        .reduce((sum, t) => sum + convertCurrency(t.gasto, t.divisa, 'MXN'), 0);
      
      tendenciaMensual.push({
        mes: date.toLocaleDateString('es-MX', { month: 'short', year: '2-digit' }),
        ingresos,
        gastos
      });
    }
    
    // INVERSIONES DETALLADAS (considerando saldo inicial)
    const cuentasInversionIds = accountsWithBalances.filter(a => a.tipo === 'Inversiones').map(a => a.id);
    const totalInversiones = accountsWithBalances.filter(a => a.tipo === 'Inversiones').reduce((s, a) => {
      const convertedAmount = convertCurrency(a.saldoActual, a.divisa, 'MXN');
      return s + convertedAmount;
    }, 0);
    
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
      ).reduce((sum, t) => sum + t.gasto, 0);
      
      aportacionesPorMes.push(aportacionesMesActual);
      retirosPorMes.push(retirosMesActual);
    }

    // OBJETIVOS Y SCORE FINANCIERO
    const ahorroTargetMensual = 15000;
    const tasaObjetivo = 8;
    const scoreFinanciero = calcularScoreFinanciero(activos, pasivos, balanceMes, ahorroTargetMensual);
    
    // Cálculo de salud financiera simplificado
    const nivel = scoreFinanciero >= 80 ? 'Excelente' : scoreFinanciero >= 60 ? 'Buena' : scoreFinanciero >= 40 ? 'Regular' : 'Mejorable';
    const saludFinanciera = {
      score: scoreFinanciero,
      nivel: nivel as 'Excelente' | 'Buena' | 'Regular' | 'Mejorable' | 'Crítica',
      descripcion: scoreFinanciero >= 80 ? 'Tu situación financiera es excelente' : scoreFinanciero >= 60 ? 'Tu situación financiera es buena' : scoreFinanciero >= 40 ? 'Tu situación financiera es regular' : 'Tu situación financiera necesita mejorar'
    };

    return {
      // Balance general tradicional (mantener para compatibilidad)
      balanceTotal: patrimonioNeto,
      
      // Métricas mensuales
      ingresosMes,
      gastosMes,
      balanceMes,
      variacionIngresosMes,
      variacionGastosMes,
      
      // Datos del mes anterior
      ingresosMesAnterior,
      gastosMesAnterior,
      balanceMesAnterior,
      
      // Métricas anuales
      ingresosAnio,
      gastosAnio,
      balanceAnio,
      variacionIngresosAnual,
      variacionGastosAnual,
      variacionBalanceAnual,
      
      // Comparativo año anterior
      ingresosAnioAnterior,
      gastosAnioAnterior,
      balanceAnioAnterior,
      
      // Balance estructurado
      activos,
      activosPorMoneda,
      pasivos,
      pasivosPorMoneda,
      patrimonioNeto,
      patrimonioNetoAnterior,
      variacionPatrimonio,
      
      // Distribuciones
      distribucionActivos,
      distribucionPasivos,
      
      // Top categorías por tipo
      topCategorias: [...topCategoriasGastos, ...topCategoriasIngresos],
      topCategoriasMesAnterior: [...topCategoriasGastosMesAnterior, ...topCategoriasIngresosMesAnterior],
      topCategoriasAnual: [...topCategoriasGastosAnual, ...topCategoriasIngresosAnual],
      
      topCategoriasGastos,
      topCategoriasGastosMesAnterior,
      topCategoriasGastosAnual,
      
      topCategoriasIngresos,
      topCategoriasIngresosMesAnterior,
      topCategoriasIngresosAnual,
      
      // Resumen de cuentas
      cuentasResumen: accountsWithBalances.map(acc => ({
        cuenta: acc.nombre,
        saldo: acc.saldoActual,
        tipo: acc.tipo
      })),
      
      tendenciaMensual,
      
      // Métricas de inversiones
      inversionesResumen: {
        totalInversiones,
        aportacionesMes,
        aportacionesMesAnterior,
        variacionAportaciones,
        aportacionesPorMes: aportacionesPorMes.map((monto, index) => ({
          mes: new Date(currentYear, index).toLocaleDateString('es-MX', { month: 'short' }),
          monto
        })),
        retirosPorMes: retirosPorMes.map((monto, index) => ({
          mes: new Date(currentYear, index).toLocaleDateString('es-MX', { month: 'short' }),
          monto
        })),
        totalAportadoAnual: aportacionesPorMes.reduce((sum, amount) => sum + amount, 0),
        totalRetiradoAnual: retirosPorMes.reduce((sum, amount) => sum + amount, 0),
        rendimientoAnualTotal: totalInversiones - aportacionesPorMes.reduce((sum, amount) => sum + amount, 0) + retirosPorMes.reduce((sum, amount) => sum + amount, 0),
        rendimientoAnualPorcentaje: 0, // TODO: calcular basado en valor inicial vs actual
        cuentasInversion: accountsWithBalances.filter(a => a.tipo === 'Inversiones').map(cuenta => ({
          cuenta: cuenta.nombre,
          id: cuenta.id,
          saldo: cuenta.saldoActual,
          saldoInicial: cuenta.saldoInicial,
          rendimiento: cuenta.saldoActual - cuenta.saldoInicial,
          movimientosPorMes: aportacionesPorMes.map((aportacion, index) => ({
            mes: new Date(currentYear, index).toLocaleDateString('es-MX', { month: 'short' }),
            aportaciones: aportacion,
            retiros: retirosPorMes[index]
          }))
        }))
      },
      
      saludFinanciera
    };
  }, [accountsWithBalances, enrichedTransactions, convertCurrency, config.currency]);

  // CRUD operations placeholder (para futuras implementaciones)
  const addAccount = async (account: Omit<Account, 'id'>) => {
    // TODO: Implementar inserción en Supabase
  };

  const updateAccount = async (id: string, account: Partial<Account>) => {
    // TODO: Implementar actualización en Supabase
  };

  const deleteAccount = async (id: string) => {
    // TODO: Implementar eliminación en Supabase
  };

  const addCategory = async (category: Omit<Category, 'id'>) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Usuario no autenticado');

      const { error } = await supabase
        .from('categorias')
        .insert({
          user_id: user.id,
          subcategoria: category.subcategoria,
          categoria: category.categoria,
          tipo: category.tipo
        });
      
      if (error) throw error;
      
      // Recargar datos
      await loadData();
      
      toast({
        title: "Éxito",
        description: "Categoría creada correctamente"
      });
    } catch (error) {
      console.error('Error adding category:', error);
      toast({
        title: "Error",
        description: "No se pudo crear la categoría",
        variant: "destructive"
      });
    }
  };

  const updateCategory = async (id: string, category: Partial<Category>) => {
    try {
      const updateData: any = {};
      
      if (category.subcategoria) updateData.subcategoria = category.subcategoria;
      if (category.categoria) updateData.categoria = category.categoria;
      if (category.tipo) updateData.tipo = category.tipo;
      
      const { error } = await supabase
        .from('categorias')
        .update(updateData)
        .eq('id', id);
      
      if (error) throw error;
      
      // Recargar datos
      await loadData();
      
      toast({
        title: "Éxito",
        description: "Categoría actualizada correctamente"
      });
    } catch (error) {
      console.error('Error updating category:', error);
      toast({
        title: "Error",
        description: "No se pudo actualizar la categoría",
        variant: "destructive"
      });
    }
  };

  const deleteCategory = async (id: string) => {
    try {
      const { error } = await supabase
        .from('categorias')
        .delete()
        .eq('id', id);
      
      if (error) throw error;
      
      // Recargar datos
      await loadData();
      
      toast({
        title: "Éxito",
        description: "Categoría eliminada correctamente"
      });
    } catch (error) {
      console.error('Error deleting category:', error);
      toast({
        title: "Error",
        description: "No se pudo eliminar la categoría",
        variant: "destructive"
      });
    }
  };

  const addTransaction = async (transaction: Omit<Transaction, 'id' | 'monto'>, autoContribution?: { targetAccountId: string }) => {
    try {
      // Obtener el usuario actual
      const { data: userData, error: userError } = await supabase.auth.getUser();
      if (userError || !userData.user) {
        throw new Error('Usuario no autenticado');
      }

      // Preparar datos para inserción en Supabase
      const insertData = {
        cuenta_id: transaction.cuentaId,
        fecha: transaction.fecha.toISOString().split('T')[0],
        comentario: transaction.comentario,
        ingreso: transaction.ingreso,
        gasto: transaction.gasto,
        subcategoria_id: transaction.subcategoriaId,
        divisa: transaction.divisa || 'MXN',
        user_id: userData.user.id
      };

      const { error } = await supabase
        .from('transacciones')
        .insert([insertData]);

      if (error) throw error;

      // Si hay aportación automática, crear transacción adicional
      if (autoContribution && autoContribution.targetAccountId) {
        const autoContribData = {
          cuenta_id: autoContribution.targetAccountId,
          fecha: transaction.fecha.toISOString().split('T')[0],
          comentario: `Aportación automática: ${transaction.comentario}`,
          ingreso: transaction.gasto, // El gasto se convierte en aportación
          gasto: 0,
          subcategoria_id: transaction.subcategoriaId,
          divisa: transaction.divisa || 'MXN',
          user_id: userData.user.id
        };

        const { error: autoError } = await supabase
          .from('transacciones')
          .insert([autoContribData]);

        if (autoError) throw autoError;
      }

      // Recargar datos
      await loadData();

      toast({
        title: "Éxito",
        description: "Transacción guardada correctamente"
      });
    } catch (error) {
      console.error('Error adding transaction:', error);
      toast({
        title: "Error",
        description: "No se pudo guardar la transacción",
        variant: "destructive"
      });
    }
  };

  const addTransactionsBatch = async (newTransactions: Omit<Transaction, 'id' | 'monto'>[]) => {
    try {
      // Obtener el usuario actual
      const { data: userData, error: userError } = await supabase.auth.getUser();
      if (userError || !userData.user) {
        throw new Error('Usuario no autenticado');
      }

      // Preparar datos para inserción masiva
      const insertData = newTransactions.map(transaction => ({
        cuenta_id: transaction.cuentaId,
        fecha: transaction.fecha.toISOString().split('T')[0],
        comentario: transaction.comentario,
        ingreso: transaction.ingreso,
        gasto: transaction.gasto,
        subcategoria_id: transaction.subcategoriaId,
        divisa: transaction.divisa || 'MXN',
        user_id: userData.user.id
      }));

      const { error } = await supabase
        .from('transacciones')
        .insert(insertData);

      if (error) throw error;

      // Recargar datos
      await loadData();

      toast({
        title: "Éxito",
        description: `${newTransactions.length} transacciones importadas correctamente`
      });
    } catch (error) {
      console.error('Error adding transactions batch:', error);
      toast({
        title: "Error",
        description: "No se pudieron importar las transacciones",
        variant: "destructive"
      });
    }
  };

  const updateTransaction = async (id: string, transaction: Partial<Transaction>) => {
    try {
      // Preparar datos para Supabase
      const updateData: any = {};
      
      if (transaction.fecha) updateData.fecha = transaction.fecha.toISOString().split('T')[0];
      if (transaction.comentario) updateData.comentario = transaction.comentario;
      if (transaction.subcategoriaId) updateData.subcategoria_id = transaction.subcategoriaId;
      if (transaction.cuentaId) updateData.cuenta_id = transaction.cuentaId;
      if (transaction.divisa) updateData.divisa = transaction.divisa;
      
      // Manejar ingreso y gasto
      if (transaction.ingreso !== undefined) updateData.ingreso = transaction.ingreso;
      if (transaction.gasto !== undefined) updateData.gasto = transaction.gasto;
      
      const { error } = await supabase
        .from('transacciones')
        .update(updateData)
        .eq('id', id);
      
      if (error) throw error;
      
      // Recargar datos
      await loadData();
      
      toast({
        title: "Éxito",
        description: "Transacción actualizada correctamente"
      });
    } catch (error) {
      console.error('Error updating transaction:', error);
      toast({
        title: "Error",
        description: "No se pudo actualizar la transacción",
        variant: "destructive"
      });
    }
  };

  const deleteTransaction = async (id: string) => {
    try {
      const { error } = await supabase
        .from('transacciones')
        .delete()
        .eq('id', id);

      if (error) throw error;

      // Recargar datos
      await loadData();

      toast({
        title: "Éxito",
        description: "Transacción eliminada correctamente"
      });
    } catch (error) {
      console.error('Error deleting transaction:', error);
      toast({
        title: "Error",
        description: "No se pudo eliminar la transacción",
        variant: "destructive"
      });
    }
  };

  const clearAllTransactions = async () => {
    try {
      // Obtener el usuario actual
      const { data: userData, error: userError } = await supabase.auth.getUser();
      if (userError || !userData.user) {
        throw new Error('Usuario no autenticado');
      }

      const { error } = await supabase
        .from('transacciones')
        .delete()
        .eq('user_id', userData.user.id);

      if (error) throw error;

      // Recargar datos
      await loadData();

      toast({
        title: "Éxito",
        description: "Todas las transacciones han sido eliminadas"
      });
    } catch (error) {
      console.error('Error clearing all transactions:', error);
      toast({
        title: "Error",
        description: "No se pudieron eliminar las transacciones",
        variant: "destructive"
      });
    }
  };

  return {
    // Data
    accounts: accountsWithBalances,
    categories,
    transactions: enrichedTransactions,
    accountTypes,
    dashboardMetrics,
    dateFilter,
    setDateFilter,
    loading,
    
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
    
    // Utility
    refreshData: loadData
  };
};