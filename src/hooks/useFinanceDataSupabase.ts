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
    'Efectivo', 'Banco', 'Tarjeta de Crédito', 'Ahorros', 'Inversiones', 'Hipoteca', 'Empresa Propia', 'Bien Raíz'
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
        rendimientoMensual: cuenta.rendimiento_mensual ? Number(cuenta.rendimiento_mensual) : undefined,
        // Nuevos campos de inversión
        tipo_inversion: cuenta.tipo_inversion as 'Interés fijo' | 'Fondo variable' | 'Criptomoneda' | undefined,
        modalidad: cuenta.modalidad as 'Reinversión' | 'Pago mensual' | 'Pago trimestral' | undefined,
        rendimiento_bruto: cuenta.rendimiento_bruto ? Number(cuenta.rendimiento_bruto) : undefined,
        rendimiento_neto: cuenta.rendimiento_neto ? Number(cuenta.rendimiento_neto) : undefined,
        fecha_inicio: cuenta.fecha_inicio,
        ultimo_pago: cuenta.ultimo_pago
      }));

      const mappedCategories: Category[] = categoriasData.map(categoria => ({
        id: categoria.id,
        subcategoria: categoria.subcategoria,
        categoria: categoria.categoria,
        tipo: categoria.tipo as TransactionType,
        seguimiento_pago: Boolean(categoria.seguimiento_pago)
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
        divisa: transaccion.divisa as 'MXN' | 'USD' | 'EUR',
        csvId: transaccion.csv_id,
        created_at: new Date(transaccion.created_at)
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
      
      // Para TODAS las cuentas: saldoActual = saldoInicial + transacciones
      const saldoActual = account.saldoInicial + totalTransactions;
      
      return {
        ...account,
        saldoActual
      };
    });
  }, [accounts, transactions]);

  // Transacciones enriquecidas
  const enrichedTransactions = useMemo(() => {
    return transactions.map(transaction => {
      const category = categories.find(c => c.id === transaction.subcategoriaId);
      return {
        ...transaction,
        categoria: category?.categoria || 'SIN ASIGNAR',
        subcategoria: category?.subcategoria || 'SIN ASIGNAR', // Agregar subcategoría
        tipo: category?.tipo || undefined // Permitir undefined para transacciones sin clasificar
      };
    });
  }, [transactions, categories]);

  // Funciones auxiliares para el cálculo de score financiero (definidas antes del useMemo)
  const calcularScoreFinanciero = (
    activos: any, 
    pasivos: any, 
    balanceMes: number, 
    balanceMesAnterior: number, 
    ahorroTarget: number, 
    cuentasInversiones: any[], 
    gastosPromedioMensual: number
  ) => {
    let score = 0;
    let detalles: any = {};
    
    console.log('=== CÁLCULO SCORE FINANCIERO ===');
    console.log('Activos:', activos);
    console.log('Pasivos:', pasivos);
    console.log('Balance mes:', balanceMes);
    console.log('Ahorro target:', ahorroTarget);
    console.log('Gastos promedio mensual:', gastosPromedioMensual);
    
    // 1. Liquidez (20 puntos) - Efectivo/Bancos vs Gastos Mensuales
    const ratioLiquidez = gastosPromedioMensual > 0 ? activos.efectivoBancos / gastosPromedioMensual : 0;
    console.log('Ratio liquidez (meses de gastos):', ratioLiquidez);
    let puntosLiquidez = 0;
    if (ratioLiquidez >= 6) puntosLiquidez = 20; // 6+ meses de gastos
    else if (ratioLiquidez >= 3) puntosLiquidez = 15; // 3-6 meses
    else if (ratioLiquidez >= 1) puntosLiquidez = 10; // 1-3 meses
    else puntosLiquidez = 5; // Menos de 1 mes
    score += puntosLiquidez;
    detalles.liquidez = {
      puntos: puntosLiquidez,
      maxPuntos: 20,
      ratio: ratioLiquidez,
      mesesCobertura: ratioLiquidez.toFixed(1)
    };
    console.log('Puntos por liquidez:', puntosLiquidez);
    
    // 2. Capacidad de Ahorro (25 puntos) - Balance mensual vs objetivo
    const ratioAhorro = ahorroTarget > 0 ? balanceMesAnterior / ahorroTarget : 0;
    console.log('Ratio ahorro:', ratioAhorro);
    let puntosAhorro = 0;
    if (ratioAhorro >= 1.5) puntosAhorro = 25; // 150%+ del objetivo
    else if (ratioAhorro >= 1) puntosAhorro = 20; // 100%+ del objetivo
    else if (ratioAhorro >= 0.5) puntosAhorro = 15; // 50%+ del objetivo
    else if (ratioAhorro > 0) puntosAhorro = 8; // Algo de ahorro
    score += puntosAhorro;
    detalles.ahorro = {
      puntos: puntosAhorro,
      maxPuntos: 25,
      ratio: ratioAhorro,
      porcentaje: (ratioAhorro * 100).toFixed(1)
    };
    console.log('Puntos por ahorro:', puntosAhorro);
    
    // 3. Endeudamiento (25 puntos) - Ratio de deuda
    const ratioDeuda = activos.total > 0 ? pasivos.total / activos.total : 0;
    console.log('Ratio deuda:', ratioDeuda);
    let puntosEndeudamiento = 0;
    if (ratioDeuda <= 0.1) puntosEndeudamiento = 25; // Deuda mínima (≤10%)
    else if (ratioDeuda <= 0.3) puntosEndeudamiento = 20; // Deuda baja (≤30%)
    else if (ratioDeuda <= 0.5) puntosEndeudamiento = 12; // Deuda moderada (≤50%)
    else if (ratioDeuda <= 0.7) puntosEndeudamiento = 5; // Deuda alta (≤70%)
    else puntosEndeudamiento = 0; // Deuda crítica (>70%)
    score += puntosEndeudamiento;
    detalles.endeudamiento = {
      puntos: puntosEndeudamiento,
      maxPuntos: 25,
      ratio: ratioDeuda,
      porcentaje: (ratioDeuda * 100).toFixed(1)
    };
    console.log('Puntos por endeudamiento:', puntosEndeudamiento);
    
    // 4. Rendimiento de Inversiones (15 puntos) - Rendimiento anualizado
    let rendimientoPromedio = 0;
    let inversionesTotales = 0;
    cuentasInversiones.forEach((cuenta: any) => {
      if (cuenta.rendimiento_neto !== null && cuenta.rendimiento_neto !== undefined) {
        rendimientoPromedio += cuenta.rendimiento_neto;
        inversionesTotales++;
      }
    });
    rendimientoPromedio = inversionesTotales > 0 ? rendimientoPromedio / inversionesTotales : 0;
    console.log('Rendimiento promedio inversiones:', rendimientoPromedio, 'de', inversionesTotales, 'cuentas');
    let puntosRendimiento = 0;
    if (rendimientoPromedio >= 10) puntosRendimiento = 15; // ≥10% anual
    else if (rendimientoPromedio >= 7) puntosRendimiento = 12; // ≥7% anual
    else if (rendimientoPromedio >= 4) puntosRendimiento = 8; // ≥4% anual
    else if (rendimientoPromedio >= 0) puntosRendimiento = 4; // Positivo pero <4%
    else puntosRendimiento = 0; // Negativo
    score += puntosRendimiento;
    detalles.rendimientoInversiones = {
      puntos: puntosRendimiento,
      maxPuntos: 15,
      rendimiento: rendimientoPromedio,
      porcentaje: rendimientoPromedio.toFixed(1)
    };
    console.log('Puntos por rendimiento inversiones:', puntosRendimiento);
    
    // 5. Diversificación (15 puntos) - Tipos de activos
    let puntosDiversificacion = 0;
    if (activos.inversiones > 0) {
      puntosDiversificacion += 7;
      console.log('Tiene inversiones +7 puntos');
    }
    if (activos.bienRaiz > 0) {
      puntosDiversificacion += 5;
      console.log('Tiene bienes raíces +5 puntos');
    }
    if (activos.empresasPrivadas > 0) {
      puntosDiversificacion += 3;
      console.log('Tiene empresas privadas +3 puntos');
    }
    score += puntosDiversificacion;
    detalles.diversificacion = {
      puntos: puntosDiversificacion,
      maxPuntos: 15,
      tiposActivos: [
        activos.efectivoBancos > 0 ? 'Efectivo/Bancos' : null,
        activos.inversiones > 0 ? 'Inversiones' : null,
        activos.bienRaiz > 0 ? 'Bienes Raíces' : null,
        activos.empresasPrivadas > 0 ? 'Empresas Privadas' : null
      ].filter(Boolean)
    };
    console.log('Puntos por diversificación:', puntosDiversificacion);
    
    const finalScore = Math.min(100, score);
    console.log('Score final antes de límite:', score);
    console.log('Score final:', finalScore);
    console.log('Detalles:', detalles);
    console.log('=== FIN CÁLCULO SCORE ===');
    
    return { score: finalScore, detalles };
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
    // Excluir reembolsos de ingresos y restarlos de gastos
    const reembolsosMes = transactionsThisMonth
      .filter(t => t.categoria === 'Ingresos adicionales' && t.subcategoria === 'Reembolsos')
      .reduce((sum, t) => sum + convertCurrency(t.ingreso, t.divisa, 'MXN'), 0);
    
    const ingresosMes = transactionsThisMonth
      .filter(t => t.tipo === 'Ingreso' && !(t.categoria === 'Ingresos adicionales' && t.subcategoria === 'Reembolsos') && t.categoria !== 'Compra Venta Inmuebles')
      .reduce((sum, t) => sum + convertCurrency(t.ingreso, t.divisa, 'MXN'), 0);
    const gastosMes = transactionsThisMonth
      .filter(t => t.tipo === 'Gastos' && t.categoria !== 'Compra Venta Inmuebles')
      .reduce((sum, t) => sum + convertCurrency(t.gasto, t.divisa, 'MXN'), 0) - reembolsosMes;
    const balanceMes = ingresosMes - gastosMes;
    
    // MES ANTERIOR (dinámico) - CONVERTIR A MXN
    const reembolsosMesAnterior = transactionsPreviousMonth
      .filter(t => t.categoria === 'Ingresos adicionales' && t.subcategoria === 'Reembolsos')
      .reduce((sum, t) => sum + convertCurrency(t.ingreso, t.divisa, 'MXN'), 0);
    
    const ingresosMesAnterior = transactionsPreviousMonth
      .filter(t => t.tipo === 'Ingreso' && !(t.categoria === 'Ingresos adicionales' && t.subcategoria === 'Reembolsos') && t.categoria !== 'Compra Venta Inmuebles')
      .reduce((sum, t) => sum + convertCurrency(t.ingreso, t.divisa, 'MXN'), 0);
    const gastosMesAnterior = transactionsPreviousMonth
      .filter(t => t.tipo === 'Gastos' && t.categoria !== 'Compra Venta Inmuebles')
      .reduce((sum, t) => sum + convertCurrency(t.gasto, t.divisa, 'MXN'), 0) - reembolsosMesAnterior;
    const balanceMesAnterior = ingresosMesAnterior - gastosMesAnterior;
    
    // ANUALES - CONVERTIR A MXN
    const reembolsosAnio = transactionsThisYear
      .filter(t => t.categoria === 'Ingresos adicionales' && t.subcategoria === 'Reembolsos')
      .reduce((sum, t) => sum + convertCurrency(t.ingreso, t.divisa, 'MXN'), 0);
    
    const ingresosAnio = transactionsThisYear
      .filter(t => t.tipo === 'Ingreso' && !(t.categoria === 'Ingresos adicionales' && t.subcategoria === 'Reembolsos') && t.categoria !== 'Compra Venta Inmuebles')
      .reduce((sum, t) => sum + convertCurrency(t.ingreso, t.divisa, 'MXN'), 0);
    const gastosAnio = transactionsThisYear
      .filter(t => t.tipo === 'Gastos' && t.categoria !== 'Compra Venta Inmuebles')
      .reduce((sum, t) => sum + convertCurrency(t.gasto, t.divisa, 'MXN'), 0) - reembolsosAnio;
    const balanceAnio = ingresosAnio - gastosAnio;
    
    // AÑO ANTERIOR - CONVERTIR A MXN
    const reembolsosAnioAnterior = transactionsLastYear
      .filter(t => t.categoria === 'Ingresos adicionales' && t.subcategoria === 'Reembolsos')
      .reduce((sum, t) => sum + convertCurrency(t.ingreso, t.divisa, 'MXN'), 0);
    
    const ingresosAnioAnterior = transactionsLastYear
      .filter(t => t.tipo === 'Ingreso' && !(t.categoria === 'Ingresos adicionales' && t.subcategoria === 'Reembolsos') && t.categoria !== 'Compra Venta Inmuebles')
      .reduce((sum, t) => sum + convertCurrency(t.ingreso, t.divisa, 'MXN'), 0);
    const gastosAnioAnterior = transactionsLastYear
      .filter(t => t.tipo === 'Gastos' && t.categoria !== 'Compra Venta Inmuebles')
      .reduce((sum, t) => sum + convertCurrency(t.gasto, t.divisa, 'MXN'), 0) - reembolsosAnioAnterior;
    const balanceAnioAnterior = ingresosAnioAnterior - gastosAnioAnterior;
    
    // VARIACIONES PORCENTUALES (Mes actual vs Mes anterior)
    const variacionIngresosMes = ingresosMesAnterior > 0 ? ((ingresosMes - ingresosMesAnterior) / ingresosMesAnterior) * 100 : 0;
    const variacionGastosMes = gastosMesAnterior > 0 ? ((gastosMes - gastosMesAnterior) / gastosMesAnterior) * 100 : 0;
    const variacionIngresosAnual = ingresosAnioAnterior > 0 ? ((ingresosAnio - ingresosAnioAnterior) / ingresosAnioAnterior) * 100 : 0;
    const variacionGastosAnual = gastosAnioAnterior > 0 ? ((gastosAnio - gastosAnioAnterior) / gastosAnioAnterior) * 100 : 0;
    const variacionBalanceAnual = balanceAnioAnterior !== 0 ? ((balanceAnio - balanceAnioAnterior) / Math.abs(balanceAnioAnterior)) * 100 : 0;
    
    // ACTIVOS DETALLADOS POR MONEDA
    // Para el dashboard, siempre usar saldoActual que refleja todas las transacciones
    // valorMercado es solo informativo y puede estar desactualizado
    const activosPorMoneda = {
      MXN: {
        efectivoBancos: accountsWithBalances.filter(a => ['Efectivo', 'Banco', 'Ahorros'].includes(a.tipo) && (a.divisa === 'MXN' || !a.divisa) && !a.vendida).reduce((s, a) => s + a.saldoActual, 0),
        inversiones: accountsWithBalances.filter(a => a.tipo === 'Inversiones' && (a.divisa === 'MXN' || !a.divisa) && !a.vendida).reduce((s, a) => s + a.saldoActual, 0),
        empresasPrivadas: accountsWithBalances.filter(a => a.tipo === 'Empresa Propia' && (a.divisa === 'MXN' || !a.divisa) && !a.vendida).reduce((s, a) => s + a.saldoActual, 0),
        bienRaiz: accountsWithBalances.filter(a => a.tipo === 'Bien Raíz' && (a.divisa === 'MXN' || !a.divisa) && !a.vendida).reduce((s, a) => s + a.saldoActual, 0),
      },
      USD: {
        efectivoBancos: accountsWithBalances.filter(a => ['Efectivo', 'Banco', 'Ahorros'].includes(a.tipo) && a.divisa === 'USD' && !a.vendida).reduce((s, a) => s + a.saldoActual, 0),
        inversiones: accountsWithBalances.filter(a => a.tipo === 'Inversiones' && a.divisa === 'USD' && !a.vendida).reduce((s, a) => s + a.saldoActual, 0),
        empresasPrivadas: accountsWithBalances.filter(a => a.tipo === 'Empresa Propia' && a.divisa === 'USD' && !a.vendida).reduce((s, a) => s + a.saldoActual, 0),
        bienRaiz: accountsWithBalances.filter(a => a.tipo === 'Bien Raíz' && a.divisa === 'USD' && !a.vendida).reduce((s, a) => s + a.saldoActual, 0),
      },
      EUR: {
        efectivoBancos: accountsWithBalances.filter(a => ['Efectivo', 'Banco', 'Ahorros'].includes(a.tipo) && a.divisa === 'EUR' && !a.vendida).reduce((s, a) => s + a.saldoActual, 0),
        inversiones: accountsWithBalances.filter(a => a.tipo === 'Inversiones' && a.divisa === 'EUR' && !a.vendida).reduce((s, a) => s + a.saldoActual, 0),
        empresasPrivadas: accountsWithBalances.filter(a => a.tipo === 'Empresa Propia' && a.divisa === 'EUR' && !a.vendida).reduce((s, a) => s + a.saldoActual, 0),
        bienRaiz: accountsWithBalances.filter(a => a.tipo === 'Bien Raíz' && a.divisa === 'EUR' && !a.vendida).reduce((s, a) => s + a.saldoActual, 0),
      }
    };
    
    // Calcular totales por moneda
    Object.keys(activosPorMoneda).forEach(moneda => {
      const activos = activosPorMoneda[moneda as keyof typeof activosPorMoneda];
      (activos as any).total = activos.efectivoBancos + activos.inversiones + activos.empresasPrivadas + activos.bienRaiz;
    });
    
    // Para compatibilidad con código existente - INCLUYENDO BIEN RAÍZ EN ACTIVOS
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
      bienRaiz: Object.entries(activosPorMoneda).reduce((total, [moneda, activos]) => {
        return total + convertCurrency(activos.bienRaiz, moneda as any, config.currency);
      }, 0),
      total: 0
    };
    // TOTAL ACTIVOS = efectivo + inversiones + bienes raíces + empresas privadas
    activos.total = activos.efectivoBancos + activos.inversiones + activos.bienRaiz + activos.empresasPrivadas;
    
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
      const reembolsosTotal = transactions
        .filter(t => t.categoria === 'Ingresos adicionales' && t.subcategoria === 'Reembolsos')
        .reduce((sum, t) => sum + t.ingreso, 0);
      
      transactions.forEach(t => {
        if (t.categoria && t.tipo === 'Gastos') {
          const current = categoryTotals.get(t.categoria) || 0;
          categoryTotals.set(t.categoria, current + t.gasto);
        }
      });
      
      // Restar reembolsos proporcionalmente de todas las categorías de gastos
      if (reembolsosTotal > 0) {
        const totalGastos = Array.from(categoryTotals.values()).reduce((sum, val) => sum + val, 0);
        if (totalGastos > 0) {
          categoryTotals.forEach((monto, categoria) => {
            const proporcion = monto / totalGastos;
            const reembolsoCategoria = reembolsosTotal * proporcion;
            categoryTotals.set(categoria, Math.max(0, monto - reembolsoCategoria));
          });
        }
      }
      
      return Array.from(categoryTotals.entries())
        .map(([categoria, monto]) => ({ categoria, monto, tipo: 'Gastos' as TransactionType }))
        .sort((a, b) => b.monto - a.monto)
        .slice(0, 5);
    };

    const getCategoryTotalsIngresos = (transactions: typeof enrichedTransactions) => {
      const categoryTotals = new Map<string, number>();
      transactions.forEach(t => {
        // Excluir reembolsos de los ingresos
        if (t.categoria && t.tipo === 'Ingreso' && !(t.categoria === 'Ingresos adicionales' && t.subcategoria === 'Reembolsos')) {
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
      
      // Debug log para septiembre 2025
      const monthLabel = date.toLocaleDateString('es-MX', { month: 'short', year: '2-digit' });
      if (monthLabel === 'sep 25') {
        console.log('=== DEBUG SEPTIEMBRE 2025 ===');
        console.log('Total transacciones del mes:', monthTransactions.length);
        const ingresosCompraVenta = monthTransactions.filter(t => 
          t.tipo === 'Ingreso' && t.categoria === 'Compra Venta Inmuebles'
        );
        console.log('Ingresos de Compra Venta Inmuebles encontrados:', ingresosCompraVenta.length);
        ingresosCompraVenta.forEach(t => {
          console.log('- Transacción:', {
            fecha: t.fecha,
            categoria: t.categoria,
            subcategoria: t.subcategoria,
            ingreso: t.ingreso,
            divisa: t.divisa
          });
        });
      }
      
      // Convertir todos los ingresos y gastos a MXN para el dashboard
      // Excluir reembolsos y "Compra Venta Inmuebles"
      const reembolsosMes = monthTransactions
        .filter(t => t.categoria === 'Ingresos adicionales' && t.subcategoria === 'Reembolsos')
        .reduce((sum, t) => sum + convertCurrency(t.ingreso, t.divisa, 'MXN'), 0);
      
      const ingresos = monthTransactions
        .filter(t => 
          t.tipo === 'Ingreso' && 
          !(t.categoria === 'Ingresos adicionales' && t.subcategoria === 'Reembolsos') &&
          t.categoria !== 'Compra Venta Inmuebles'
        )
        .reduce((sum, t) => sum + convertCurrency(t.ingreso, t.divisa, 'MXN'), 0);
      const gastos = monthTransactions
        .filter(t => t.tipo === 'Gastos' && t.categoria !== 'Compra Venta Inmuebles')
        .reduce((sum, t) => sum + convertCurrency(t.gasto, t.divisa, 'MXN'), 0) - reembolsosMes;
      
      // Debug log para septiembre 2025 - resultado final
      if (monthLabel === 'sep 25') {
        console.log('Ingresos calculados (sin Compra Venta):', ingresos);
        console.log('=== FIN DEBUG SEPTIEMBRE 2025 ===');
      }
      
      tendenciaMensual.push({
        mes: date.toLocaleDateString('es-MX', { month: 'short', year: '2-digit' }),
        ingresos,
        gastos
      });
    }
    
    // MEDIA DE INGRESOS Y GASTOS DE LOS ÚLTIMOS 6 MESES (excluyendo mes actual)
    // Calcular para los últimos 6 meses completos (del mes -6 al mes -1, sin incluir el actual)
    const tendenciaUltimos6Meses = [];
    for (let i = 6; i >= 1; i--) {
      const date = new Date();
      date.setMonth(date.getMonth() - i);
      const monthStart = new Date(date.getFullYear(), date.getMonth(), 1);
      const monthEnd = new Date(date.getFullYear(), date.getMonth() + 1, 0);
      
      const monthTransactions = enrichedTransactions.filter(t => t.fecha >= monthStart && t.fecha <= monthEnd);
      
      // Excluir reembolsos y "Compra Venta Inmuebles"
      const reembolsosMes = monthTransactions
        .filter(t => t.categoria === 'Ingresos adicionales' && t.subcategoria === 'Reembolsos')
        .reduce((sum, t) => sum + convertCurrency(t.ingreso, t.divisa, 'MXN'), 0);
      
      const ingresos = monthTransactions
        .filter(t => 
          t.tipo === 'Ingreso' && 
          !(t.categoria === 'Ingresos adicionales' && t.subcategoria === 'Reembolsos') &&
          t.categoria !== 'Compra Venta Inmuebles'
        )
        .reduce((sum, t) => sum + convertCurrency(t.ingreso, t.divisa, 'MXN'), 0);
        
      const gastos = monthTransactions
        .filter(t => t.tipo === 'Gastos' && t.categoria !== 'Compra Venta Inmuebles')
        .reduce((sum, t) => sum + convertCurrency(t.gasto, t.divisa, 'MXN'), 0) - reembolsosMes;
      
      tendenciaUltimos6Meses.push({ ingresos, gastos });
    }
    
    // Media de ingresos: últimos 6 meses completos sin mes actual, sin reembolsos, sin "Compra Venta Inmuebles"
    const mediaIngresosUltimos12Meses = tendenciaUltimos6Meses.length > 0
      ? tendenciaUltimos6Meses.reduce((sum, m) => sum + m.ingresos, 0) / tendenciaUltimos6Meses.length
      : 0;
    
    // Media de gastos: últimos 6 meses completos sin mes actual, sin "Compra Venta Inmuebles"
    const mediaGastosUltimos12Meses = tendenciaUltimos6Meses.length > 0 
      ? tendenciaUltimos6Meses.reduce((sum, m) => sum + m.gastos, 0) / tendenciaUltimos6Meses.length
      : 0;
    
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
    
    // Calcular gastos promedio mensual para liquidez
    const gastosPromedioMensual = mediaGastosUltimos12Meses;
    
    // Obtener cuentas de inversiones para calcular rendimiento
    const cuentasInversiones = accountsWithBalances.filter(a => a.tipo === 'Inversiones');
    
    const resultadoScore = calcularScoreFinanciero(
      activos, 
      pasivos, 
      balanceMes, 
      balanceMesAnterior, 
      ahorroTargetMensual,
      cuentasInversiones,
      gastosPromedioMensual
    );
    
    // Cálculo de salud financiera
    const nivel = resultadoScore.score >= 80 ? 'Excelente' : 
                  resultadoScore.score >= 60 ? 'Buena' : 
                  resultadoScore.score >= 40 ? 'Regular' : 'Mejorable';
    const saludFinanciera = {
      score: resultadoScore.score,
      nivel: nivel as 'Excelente' | 'Buena' | 'Regular' | 'Mejorable' | 'Crítica',
      descripcion: resultadoScore.score >= 80 ? 'Tu situación financiera es excelente' : 
                   resultadoScore.score >= 60 ? 'Tu situación financiera es buena' : 
                   resultadoScore.score >= 40 ? 'Tu situación financiera es regular' : 
                   'Tu situación financiera necesita mejorar',
      detalles: resultadoScore.detalles
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
      
      // Media de últimos 12 meses
      mediaIngresosUltimos12Meses,
      mediaGastosUltimos12Meses,
      
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

  // CRUD operations para cuentas
  const addAccount = async (account: Omit<Account, 'id' | 'saldoActual'>) => {
    try {
      // Verificar autenticación
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        toast({
          title: "Error de autenticación",
          description: "Debes estar logueado para crear cuentas",
          variant: "destructive"
        });
        return;
      }

      const accountData: any = {
        nombre: account.nombre,
        tipo: account.tipo,
        saldo_inicial: account.saldoInicial,
        divisa: account.divisa,
        user_id: user.id
      };

      // Agregar campos específicos de inversión si existen
      if (account.tipo === 'Inversiones') {
        if (account.tipo_inversion) accountData.tipo_inversion = account.tipo_inversion;
        if (account.modalidad) accountData.modalidad = account.modalidad;
        if (account.rendimiento_bruto) accountData.rendimiento_bruto = account.rendimiento_bruto;
        if (account.rendimiento_neto) accountData.rendimiento_neto = account.rendimiento_neto;
        if (account.fecha_inicio) accountData.fecha_inicio = account.fecha_inicio;
        if (account.ultimo_pago) accountData.ultimo_pago = account.ultimo_pago;
        if (account.valorMercado) accountData.valor_mercado = account.valorMercado;
      }

      console.log('=== CREAR CUENTA ===');
      console.log('Datos a insertar:', accountData);

      const { data, error } = await supabase
        .from('cuentas')
        .insert(accountData)
        .select();

      if (error) {
        console.error('Error al crear cuenta:', error);
        throw error;
      }

      console.log('Cuenta creada exitosamente:', data);

      toast({
        title: "¡Cuenta creada!",
        description: `La cuenta ${account.nombre} ha sido creada exitosamente.`,
      });

      // Recargar datos
      loadData();
    } catch (error) {
      console.error('Error creating account:', error);
      toast({
        title: "Error",
        description: "No se pudo crear la cuenta",
        variant: "destructive"
      });
    }
  };

  const updateAccount = async (id: string, updates: Partial<Account>) => {
    try {
      // Verificar autenticación
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        toast({
          title: "Error de autenticación",
          description: "Debes estar logueado para actualizar cuentas",
          variant: "destructive"
        });
        return;
      }

      const updateData: any = {};

      // Mapear campos básicos
      if (updates.nombre) updateData.nombre = updates.nombre;
      if (updates.tipo) updateData.tipo = updates.tipo;
      if (updates.saldoInicial !== undefined) updateData.saldo_inicial = updates.saldoInicial;
      if (updates.divisa) updateData.divisa = updates.divisa;

      // Mapear campos específicos de inversión
      if (updates.tipo_inversion) updateData.tipo_inversion = updates.tipo_inversion;
      if (updates.modalidad) updateData.modalidad = updates.modalidad;
      if (updates.rendimiento_bruto !== undefined) updateData.rendimiento_bruto = updates.rendimiento_bruto;
      if (updates.rendimiento_neto !== undefined) updateData.rendimiento_neto = updates.rendimiento_neto;
      if (updates.fecha_inicio) updateData.fecha_inicio = updates.fecha_inicio;
      if (updates.ultimo_pago) updateData.ultimo_pago = updates.ultimo_pago;
      if (updates.valorMercado !== undefined) updateData.valor_mercado = updates.valorMercado;

      console.log('=== ACTUALIZAR CUENTA ===');
      console.log('ID:', id);
      console.log('Datos a actualizar:', updateData);

      const { data, error } = await supabase
        .from('cuentas')
        .update(updateData)
        .eq('id', id)
        .select();

      if (error) {
        console.error('Error al actualizar cuenta:', error);
        throw error;
      }

      if (!data || data.length === 0) {
        throw new Error('No se encontró la cuenta para actualizar');
      }

      console.log('Cuenta actualizada exitosamente:', data[0]);

      toast({
        title: "¡Cuenta actualizada!",
        description: "Los cambios se han guardado exitosamente.",
      });

      // Recargar datos
      loadData();
    } catch (error) {
      console.error('Error updating account:', error);
      toast({
        title: "Error",
        description: "No se pudieron guardar los cambios",
        variant: "destructive"
      });
    }
  };

  const deleteAccount = async (id: string) => {
    try {
      // Verificar autenticación
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        toast({
          title: "Error de autenticación",
          description: "Debes estar logueado para eliminar cuentas",
          variant: "destructive"
        });
        return;
      }

      const { error } = await supabase
        .from('cuentas')
        .delete()
        .eq('id', id);

      if (error) throw error;

      toast({
        title: "Cuenta eliminada",
        description: "La cuenta ha sido eliminada exitosamente.",
      });

      // Recargar datos
      loadData();
    } catch (error) {
      console.error('Error deleting account:', error);
      toast({
        title: "Error",
        description: "No se pudo eliminar la cuenta",
        variant: "destructive"
      });
    }
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
      if (typeof category.seguimiento_pago === 'boolean') updateData.seguimiento_pago = category.seguimiento_pago;
      
      const { error } = await supabase
        .from('categorias')
        .update(updateData)
        .eq('id', id);
      
      if (error) throw error;
      
      // Actualizar solo el estado local en lugar de recargar todos los datos
      setCategories(prevCategories => 
        prevCategories.map(cat => 
          cat.id === id ? { ...cat, ...category } : cat
        )
      );
      
      // Solo mostrar toast para cambios importantes (no para seguimiento_pago)
      if (!('seguimiento_pago' in category)) {
        toast({
          title: "Éxito",
          description: "Categoría actualizada correctamente"
        });
      }
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

  const addTransaction = async (transaction: Omit<Transaction, 'id' | 'monto'>, autoContribution?: { targetAccountId: string; targetAccountType: 'Aportación' | 'Retiro' }) => {
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
        // Encontrar la categoría del tipo seleccionado
        const targetCategory = categories.find(cat => 
          cat.tipo === autoContribution.targetAccountType && 
          cat.categoria.toLowerCase().includes('sin asignar')
        );

        const autoContribData = {
          cuenta_id: autoContribution.targetAccountId,
          fecha: transaction.fecha.toISOString().split('T')[0],
          comentario: `${autoContribution.targetAccountType} automática: ${transaction.comentario}`,
          ingreso: autoContribution.targetAccountType === 'Aportación' ? transaction.gasto : 0,
          gasto: autoContribution.targetAccountType === 'Retiro' ? transaction.gasto : 0,
          subcategoria_id: targetCategory?.id || transaction.subcategoriaId,
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

  const updateTransaction = async (id: string, transaction: Partial<Transaction>, autoContribution?: { targetAccountId: string; targetAccountType: 'Aportación' | 'Retiro' }) => {
    try {
      // Obtener el usuario actual
      const { data: userData, error: userError } = await supabase.auth.getUser();
      if (userError || !userData.user) {
        throw new Error('Usuario no autenticado');
      }

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

      // Si hay aportación automática, crear la transacción complementaria
      if (autoContribution && autoContribution.targetAccountId) {
        // Determinar si es aportación o retiro basado en el tipo de transacción
        const isContribution = transaction.ingreso && transaction.ingreso > 0;
        const amount = isContribution ? transaction.ingreso : transaction.gasto;
        
        if (amount && amount > 0) {
          // Buscar categoría de aportación o retiro
          const targetCategory = categories.find(cat => 
            cat.tipo === (isContribution ? 'Aportación' : 'Retiro')
          );
          
          if (targetCategory) {
            const autoTransactionData = {
              user_id: userData.user.id,
              cuenta_id: autoContribution.targetAccountId,
              subcategoria_id: targetCategory.id,
              fecha: transaction.fecha?.toISOString().split('T')[0] || new Date().toISOString().split('T')[0],
              comentario: `${isContribution ? 'Aportación' : 'Retiro'} automático - ${transaction.comentario}`,
              ingreso: isContribution ? amount : 0,
              gasto: isContribution ? 0 : amount,
              divisa: transaction.divisa || 'MXN'
            };
            
            const { error: autoError } = await supabase
              .from('transacciones')
              .insert(autoTransactionData);
            
            if (autoError) {
              console.error('Error creating auto contribution:', autoError);
              toast({
                title: "Advertencia",
                description: "Transacción actualizada pero no se pudo crear la aportación automática",
                variant: "destructive"
              });
            }
          }
        }
      }
      
      // Recargar datos
      await loadData();
      
      toast({
        title: "Éxito",
        description: autoContribution ? "Transacción actualizada con aportación automática" : "Transacción actualizada correctamente"
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
    enrichedTransactions, // Add explicit reference for clarity
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
