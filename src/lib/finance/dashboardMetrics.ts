import { Account, DashboardMetrics, Transaction, TransactionType } from '@/types/finance';

export type CurrencyCode = 'MXN' | 'USD' | 'EUR';
export type ConvertCurrency = (amount: number, from: CurrencyCode, to: CurrencyCode) => number;

// Funciones auxiliares para el cálculo de score financiero
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
  const detalles: any = {};
  
  // 1. Liquidez (20 puntos)
  const ratioLiquidez = gastosPromedioMensual > 0 ? activos.efectivoBancos / gastosPromedioMensual : 0;
  let puntosLiquidez = 0;
  if (ratioLiquidez >= 6) puntosLiquidez = 20;
  else if (ratioLiquidez >= 3) puntosLiquidez = 15;
  else if (ratioLiquidez >= 1) puntosLiquidez = 10;
  else puntosLiquidez = 5;
  score += puntosLiquidez;
  detalles.liquidez = { puntos: puntosLiquidez, maxPuntos: 20, ratio: ratioLiquidez, mesesCobertura: ratioLiquidez.toFixed(1) };
  
  // 2. Capacidad de Ahorro (25 puntos)
  const ratioAhorro = ahorroTarget > 0 ? balanceMesAnterior / ahorroTarget : 0;
  let puntosAhorro = 0;
  if (ratioAhorro >= 1.5) puntosAhorro = 25;
  else if (ratioAhorro >= 1) puntosAhorro = 20;
  else if (ratioAhorro >= 0.5) puntosAhorro = 15;
  else if (ratioAhorro > 0) puntosAhorro = 8;
  score += puntosAhorro;
  detalles.ahorro = { puntos: puntosAhorro, maxPuntos: 25, ratio: ratioAhorro, porcentaje: (ratioAhorro * 100).toFixed(1) };
  
  // 3. Endeudamiento (25 puntos)
  const ratioDeuda = activos.total > 0 ? pasivos.total / activos.total : 0;
  let puntosEndeudamiento = 0;
  if (ratioDeuda <= 0.1) puntosEndeudamiento = 25;
  else if (ratioDeuda <= 0.3) puntosEndeudamiento = 20;
  else if (ratioDeuda <= 0.5) puntosEndeudamiento = 12;
  else if (ratioDeuda <= 0.7) puntosEndeudamiento = 5;
  score += puntosEndeudamiento;
  detalles.endeudamiento = { puntos: puntosEndeudamiento, maxPuntos: 25, ratio: ratioDeuda, porcentaje: (ratioDeuda * 100).toFixed(1) };
  
  // 4. Rendimiento de Inversiones (15 puntos)
  let rendimientoPromedio = 0;
  let inversionesTotales = 0;
  cuentasInversiones.forEach((cuenta: any) => {
    if (cuenta.rendimiento_neto !== null && cuenta.rendimiento_neto !== undefined) {
      rendimientoPromedio += cuenta.rendimiento_neto;
      inversionesTotales++;
    }
  });
  rendimientoPromedio = inversionesTotales > 0 ? rendimientoPromedio / inversionesTotales : 0;
  let puntosRendimiento = 0;
  if (rendimientoPromedio >= 10) puntosRendimiento = 15;
  else if (rendimientoPromedio >= 7) puntosRendimiento = 12;
  else if (rendimientoPromedio >= 4) puntosRendimiento = 8;
  else if (rendimientoPromedio >= 0) puntosRendimiento = 4;
  score += puntosRendimiento;
  detalles.rendimientoInversiones = { puntos: puntosRendimiento, maxPuntos: 15, rendimiento: rendimientoPromedio, porcentaje: rendimientoPromedio.toFixed(1) };
  
  // 5. Diversificación (15 puntos)
  let puntosDiversificacion = 0;
  if (activos.inversiones > 0) puntosDiversificacion += 7;
  if (activos.bienRaiz > 0) puntosDiversificacion += 5;
  if (activos.empresasPrivadas > 0) puntosDiversificacion += 3;
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
  
  return { score: Math.min(100, score), detalles };
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

/**
 * Métricas del dashboard a partir de las cuentas (con saldo calculado) y las
 * transacciones enriquecidas. `now` se inyecta para poder testear períodos.
 */
export const computeDashboardMetrics = (
  accountsWithBalances: Account[],
  enrichedTransactions: Transaction[],
  convertCurrency: ConvertCurrency,
  currency: CurrencyCode,
  now: Date = new Date()
): DashboardMetrics => {
    
    // Filtrar transacciones por períodos
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0);
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
    
    // INGRESOS Y GASTOS MENSUALES - CONVERTIR A DIVISA PREFERIDA
    // Reembolso = ingreso > 0 asociado a categoría tipo 'Gastos' (ingreso en categoría de gasto)
    const reembolsosMes = transactionsThisMonth
      .filter(t => t.ingreso > 0 && t.tipo === 'Gastos')
      .reduce((sum, t) => sum + convertCurrency(t.ingreso, t.divisa, currency), 0);
    
    const ingresosMes = transactionsThisMonth
      .filter(t => t.ingreso > 0 && t.tipo === 'Ingreso' && t.categoria !== 'Compra Venta Inmuebles')
      .reduce((sum, t) => sum + convertCurrency(t.ingreso, t.divisa, currency), 0);
    const gastosMes = transactionsThisMonth
      .filter(t => t.tipo === 'Gastos' && t.categoria !== 'Compra Venta Inmuebles')
      .reduce((sum, t) => sum + convertCurrency(t.gasto, t.divisa, currency), 0) - reembolsosMes;
    const balanceMes = ingresosMes - gastosMes;
    
    // MES ANTERIOR (dinámico) - CONVERTIR A DIVISA PREFERIDA
    const reembolsosMesAnterior = transactionsPreviousMonth
      .filter(t => t.ingreso > 0 && t.tipo === 'Gastos')
      .reduce((sum, t) => sum + convertCurrency(t.ingreso, t.divisa, currency), 0);
    
    const ingresosMesAnterior = transactionsPreviousMonth
      .filter(t => t.ingreso > 0 && t.tipo === 'Ingreso' && t.categoria !== 'Compra Venta Inmuebles')
      .reduce((sum, t) => sum + convertCurrency(t.ingreso, t.divisa, currency), 0);
    const gastosMesAnterior = transactionsPreviousMonth
      .filter(t => t.tipo === 'Gastos' && t.categoria !== 'Compra Venta Inmuebles')
      .reduce((sum, t) => sum + convertCurrency(t.gasto, t.divisa, currency), 0) - reembolsosMesAnterior;
    const balanceMesAnterior = ingresosMesAnterior - gastosMesAnterior;
    
    // ANUALES - CONVERTIR A DIVISA PREFERIDA
    const reembolsosAnio = transactionsThisYear
      .filter(t => t.ingreso > 0 && t.tipo === 'Gastos')
      .reduce((sum, t) => sum + convertCurrency(t.ingreso, t.divisa, currency), 0);
    
    const ingresosAnio = transactionsThisYear
      .filter(t => t.ingreso > 0 && t.tipo === 'Ingreso' && t.categoria !== 'Compra Venta Inmuebles')
      .reduce((sum, t) => sum + convertCurrency(t.ingreso, t.divisa, currency), 0);
    const gastosAnio = transactionsThisYear
      .filter(t => t.tipo === 'Gastos' && t.categoria !== 'Compra Venta Inmuebles')
      .reduce((sum, t) => sum + convertCurrency(t.gasto, t.divisa, currency), 0) - reembolsosAnio;
    const balanceAnio = ingresosAnio - gastosAnio;
    
    // AÑO ANTERIOR - CONVERTIR A DIVISA PREFERIDA
    const reembolsosAnioAnterior = transactionsLastYear
      .filter(t => t.ingreso > 0 && t.tipo === 'Gastos')
      .reduce((sum, t) => sum + convertCurrency(t.ingreso, t.divisa, currency), 0);
    
    const ingresosAnioAnterior = transactionsLastYear
      .filter(t => t.ingreso > 0 && t.tipo === 'Ingreso' && t.categoria !== 'Compra Venta Inmuebles')
      .reduce((sum, t) => sum + convertCurrency(t.ingreso, t.divisa, currency), 0);
    const gastosAnioAnterior = transactionsLastYear
      .filter(t => t.tipo === 'Gastos' && t.categoria !== 'Compra Venta Inmuebles')
      .reduce((sum, t) => sum + convertCurrency(t.gasto, t.divisa, currency), 0) - reembolsosAnioAnterior;
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
        return total + convertCurrency(activos.efectivoBancos, moneda as any, currency);
      }, 0),
      inversiones: Object.entries(activosPorMoneda).reduce((total, [moneda, activos]) => {
        return total + convertCurrency(activos.inversiones, moneda as any, currency);
      }, 0),
      empresasPrivadas: Object.entries(activosPorMoneda).reduce((total, [moneda, activos]) => {
        return total + convertCurrency(activos.empresasPrivadas, moneda as any, currency);
      }, 0),
      bienRaiz: Object.entries(activosPorMoneda).reduce((total, [moneda, activos]) => {
        return total + convertCurrency(activos.bienRaiz, moneda as any, currency);
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
        return total + convertCurrency(pasivos.tarjetasCredito, moneda as any, currency);
      }, 0),
      hipoteca: Object.entries(pasivosPorMoneda).reduce((total, [moneda, pasivos]) => {
        return total + convertCurrency(pasivos.hipoteca, moneda as any, currency);
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
    // Reembolso = ingreso > 0 asociado a categoría tipo 'Gastos' (ingreso en categoría de gasto)
    const getCategoryTotalsGastos = (transactions: typeof enrichedTransactions) => {
      const categoryTotals = new Map<string, number>();
      
      transactions.forEach(t => {
        if (t.categoria && t.tipo === 'Gastos') {
          const current = categoryTotals.get(t.categoria) || 0;
          // Sumar gastos y restar reembolsos (ingreso en categoría de gasto)
          const gastoNeto = t.gasto - (t.ingreso || 0);
          categoryTotals.set(t.categoria, current + gastoNeto);
        }
      });
      
      return Array.from(categoryTotals.entries())
        .filter(([, monto]) => monto > 0) // Solo categorías con gasto neto positivo
        .map(([categoria, monto]) => ({ categoria, monto, tipo: 'Gastos' as TransactionType }))
        .sort((a, b) => b.monto - a.monto)
        .slice(0, 5);
    };

    const getCategoryTotalsIngresos = (transactions: typeof enrichedTransactions) => {
      const categoryTotals = new Map<string, number>();
      transactions.forEach(t => {
        // Solo ingresos de categorías tipo 'Ingreso' (NO reembolsos que están en categorías tipo 'Gastos')
        if (t.categoria && t.tipo === 'Ingreso' && t.ingreso > 0) {
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
    
    // TENDENCIA MENSUAL (últimos 12 meses) - CONVERTIDO A DIVISA PREFERIDA
    const tendenciaMensual = [];
    for (let i = 11; i >= 0; i--) {
      const date = new Date();
      date.setMonth(date.getMonth() - i);
      const monthStart = new Date(date.getFullYear(), date.getMonth(), 1);
      const monthEnd = new Date(date.getFullYear(), date.getMonth() + 1, 0);
      
      const monthTransactions = enrichedTransactions.filter(t => t.fecha >= monthStart && t.fecha <= monthEnd);
      
      const reembolsosMesTendencia = monthTransactions
        .filter(t => t.ingreso > 0 && t.tipo === 'Gastos')
        .reduce((sum, t) => sum + convertCurrency(t.ingreso, t.divisa, currency), 0);
      
      const ingresos = monthTransactions
        .filter(t => t.tipo === 'Ingreso' && t.categoria !== 'Compra Venta Inmuebles')
        .reduce((sum, t) => sum + convertCurrency(t.ingreso, t.divisa, currency), 0);
      const gastos = monthTransactions
        .filter(t => t.tipo === 'Gastos' && t.categoria !== 'Compra Venta Inmuebles')
        .reduce((sum, t) => sum + convertCurrency(t.gasto, t.divisa, currency), 0) - reembolsosMesTendencia;
      
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
      
      // Reembolso = ingreso > 0 asociado a categoría tipo 'Gastos'
      const reembolsosMesMedia = monthTransactions
        .filter(t => t.ingreso > 0 && t.tipo === 'Gastos')
        .reduce((sum, t) => sum + convertCurrency(t.ingreso, t.divisa, currency), 0);
      
      const ingresos = monthTransactions
        .filter(t => 
          t.tipo === 'Ingreso' && 
          t.categoria !== 'Compra Venta Inmuebles'
        )
        .reduce((sum, t) => sum + convertCurrency(t.ingreso, t.divisa, currency), 0);
        
      const gastos = monthTransactions
        .filter(t => t.tipo === 'Gastos' && t.categoria !== 'Compra Venta Inmuebles')
        .reduce((sum, t) => sum + convertCurrency(t.gasto, t.divisa, currency), 0) - reembolsosMesMedia;
      
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
      const convertedAmount = convertCurrency(a.saldoActual, a.divisa, currency);
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
};
