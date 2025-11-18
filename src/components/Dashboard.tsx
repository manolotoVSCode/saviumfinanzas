import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Tooltip as UITooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { ChevronDown } from 'lucide-react';
import { Progress } from '@/components/ui/progress';
import { DashboardMetrics } from '@/types/finance';
import { TrendingUp, TrendingDown, Info } from 'lucide-react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart as RechartsPieChart, Pie, Cell, BarChart, Bar, ComposedChart } from 'recharts';
import { useState } from 'react';
import { useLanguage } from '@/contexts/LanguageContext';
import { cn } from '@/lib/utils';


interface DashboardProps {
  metrics: DashboardMetrics;
  formatCurrency: (amount: number) => string;
  currencyCode?: string;
  transactions?: any[]; // Agregamos las transacciones para filtrar
  accounts?: any[]; // Agregamos las cuentas para filtrar
}

export const Dashboard = ({ metrics, formatCurrency, currencyCode = 'MXN', transactions = [], accounts = [] }: DashboardProps) => {
  const [selectedCurrency, setSelectedCurrency] = useState<'MXN' | 'USD' | 'EUR'>('MXN');
  const [collapsibleStates, setCollapsibleStates] = useState<Record<string, boolean>>({});
  const [assetsAccordionValue, setAssetsAccordionValue] = useState<string>("");
  const [liabilitiesAccordionValue, setLiabilitiesAccordionValue] = useState<string>("");
  const { t } = useLanguage();

  const toggleCollapsible = (key: string) => {
    setCollapsibleStates(prev => ({
      ...prev,
      [key]: !prev[key]
    }));
  };

  // Función para filtrar métricas por moneda
  const getFilteredMetrics = (currency: 'MXN' | 'USD' | 'EUR') => {
    // Filtrar transacciones por moneda seleccionada
    const filteredTransactions = transactions.filter(t => t.divisa === currency);
    
    const now = new Date();
    
    // MES ANTERIOR (para resumen del mes)
    const startOfLastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const endOfLastMonth = new Date(now.getFullYear(), now.getMonth(), 0);
    
    // DOS MESES ATRÁS (para comparativo)
    const startOfTwoMonthsAgo = new Date(now.getFullYear(), now.getMonth() - 2, 1);
    const endOfTwoMonthsAgo = new Date(now.getFullYear(), now.getMonth() - 1, 0);
    
    // AÑO ACTUAL (para resumen del año)
    const startOfYear = new Date(now.getFullYear(), 0, 1);
    
    // AÑO ANTERIOR (para comparativo)
    const startOfLastYear = new Date(now.getFullYear() - 1, 0, 1);
    const endOfLastYear = new Date(now.getFullYear() - 1, 11, 31);
    
    // Transacciones del mes anterior
    const lastMonthTransactions = filteredTransactions.filter(t => {
      const tDate = new Date(t.fecha);
      return tDate.getMonth() === now.getMonth() - 1 && tDate.getFullYear() === now.getFullYear();
    });
    
    // Transacciones de dos meses atrás
    const twoMonthsAgoTransactions = filteredTransactions.filter(t => {
      const tDate = new Date(t.fecha);
      return tDate.getMonth() === now.getMonth() - 2 && tDate.getFullYear() === now.getFullYear();
    });
    
    // Transacciones del año actual
    const yearTransactions = filteredTransactions.filter(t => {
      const tDate = new Date(t.fecha);
      return tDate.getFullYear() === now.getFullYear();
    });
    
    // Transacciones del año anterior
    const lastYearTransactions = filteredTransactions.filter(t => {
      const tDate = new Date(t.fecha);
      return tDate.getFullYear() === now.getFullYear() - 1;
    });
    
    // Cálculos del mes anterior (excluyendo aportaciones de ingresos y retiros de gastos, y "Compra Venta Inmuebles")
    const ingresosMes = lastMonthTransactions
      .filter(t => t.tipo === 'Ingreso' && t.categoria !== 'Compra Venta Inmuebles')
      .reduce((sum, t) => sum + t.ingreso, 0);
    const gastosMes = lastMonthTransactions
      .filter(t => t.tipo === 'Gastos' && t.categoria !== 'Compra Venta Inmuebles')
      .reduce((sum, t) => sum + t.gasto, 0);
    
    // Calcular reembolsos del mes anterior
    const reembolsosMes = lastMonthTransactions
      .filter(t => t.ingreso > 0 && (
        t.categoria?.toLowerCase().includes('reembolso') ||
        t.subcategoria?.toLowerCase().includes('reembolso') ||
        t.comentario.toLowerCase().includes('reembolso')
      ))
      .reduce((sum, t) => sum + t.ingreso, 0);
    
    // Ajustar por reembolsos (restar de ingresos y gastos)
    const ingresosAjustadosMes = ingresosMes - reembolsosMes;
    const gastosAjustadosMes = gastosMes - reembolsosMes;
    
    // Cálculos de dos meses atrás (para comparativo - excluyendo aportaciones y retiros, y "Compra Venta Inmuebles")
    const ingresosMesAnterior = twoMonthsAgoTransactions
      .filter(t => t.tipo === 'Ingreso' && t.categoria !== 'Compra Venta Inmuebles')
      .reduce((sum, t) => sum + t.ingreso, 0);
    const gastosMesAnterior = twoMonthsAgoTransactions
      .filter(t => t.tipo === 'Gastos' && t.categoria !== 'Compra Venta Inmuebles')
      .reduce((sum, t) => sum + t.gasto, 0);
    
    // Calcular reembolsos de dos meses atrás
    const reembolsosMesAnterior = twoMonthsAgoTransactions
      .filter(t => t.ingreso > 0 && (
        t.categoria?.toLowerCase().includes('reembolso') ||
        t.subcategoria?.toLowerCase().includes('reembolso') ||
        t.comentario.toLowerCase().includes('reembolso')
      ))
      .reduce((sum, t) => sum + t.ingreso, 0);
    
    // Ajustar por reembolsos
    const ingresosAjustadosMesAnterior = ingresosMesAnterior - reembolsosMesAnterior;
    const gastosAjustadosMesAnterior = gastosMesAnterior - reembolsosMesAnterior;
    
    // Cálculos del año actual (excluyendo aportaciones de ingresos y retiros de gastos, y "Compra Venta Inmuebles")
    const ingresosAnio = yearTransactions
      .filter(t => t.tipo === 'Ingreso' && t.categoria !== 'Compra Venta Inmuebles')
      .reduce((sum, t) => sum + t.ingreso, 0);
    const gastosAnio = yearTransactions
      .filter(t => t.tipo === 'Gastos' && t.categoria !== 'Compra Venta Inmuebles')
      .reduce((sum, t) => sum + t.gasto, 0);
    
    // Calcular reembolsos del año actual
    const reembolsosAnio = yearTransactions
      .filter(t => t.ingreso > 0 && (
        t.categoria?.toLowerCase().includes('reembolso') ||
        t.subcategoria?.toLowerCase().includes('reembolso') ||
        t.comentario.toLowerCase().includes('reembolso')
      ))
      .reduce((sum, t) => sum + t.ingreso, 0);
    
    // Ajustar por reembolsos
    const ingresosAjustadosAnio = ingresosAnio - reembolsosAnio;
    const gastosAjustadosAnio = gastosAnio - reembolsosAnio;
    
    // Cálculos del año anterior (para comparativo - excluyendo aportaciones y retiros, y "Compra Venta Inmuebles")
    const ingresosAnioAnterior = lastYearTransactions
      .filter(t => t.tipo === 'Ingreso' && t.categoria !== 'Compra Venta Inmuebles')
      .reduce((sum, t) => sum + t.ingreso, 0);
    const gastosAnioAnterior = lastYearTransactions
      .filter(t => t.tipo === 'Gastos' && t.categoria !== 'Compra Venta Inmuebles')
      .reduce((sum, t) => sum + t.gasto, 0);
    
    // Calcular reembolsos del año anterior
    const reembolsosAnioAnterior = lastYearTransactions
      .filter(t => t.ingreso > 0 && (
        t.categoria?.toLowerCase().includes('reembolso') ||
        t.subcategoria?.toLowerCase().includes('reembolso') ||
        t.comentario.toLowerCase().includes('reembolso')
      ))
      .reduce((sum, t) => sum + t.ingreso, 0);
    
    // Ajustar por reembolsos
    const ingresosAjustadosAnioAnterior = ingresosAnioAnterior - reembolsosAnioAnterior;
    const gastosAjustadosAnioAnterior = gastosAnioAnterior - reembolsosAnioAnterior;
    
    // Generar datos de tendencia mensual para la moneda seleccionada (últimos 12 meses excluyendo mes actual)
    const tendenciaMensual = [];
    for (let i = 12; i >= 1; i--) {
      const now = new Date();
      const year = now.getFullYear();
      const month = now.getMonth() - i;
      
      // Crear fecha correcta manejando cambios de año
      const targetDate = new Date(year, month, 1);
      const monthStart = new Date(targetDate.getFullYear(), targetDate.getMonth(), 1);
      const monthEnd = new Date(targetDate.getFullYear(), targetDate.getMonth() + 1, 0);
      
      const monthTrans = filteredTransactions.filter(t => {
        const adjustedDate = new Date(t.fecha.getTime() + t.fecha.getTimezoneOffset() * 60000);
        return adjustedDate >= monthStart && adjustedDate <= monthEnd;
      });
      
      // Debug general
      const monthNames = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'];
      const mesLabel = `${monthNames[targetDate.getMonth()]} ${targetDate.getFullYear().toString().slice(-2)}`;
      
      // Filtrar solo transacciones no aportaciones para ingresos y gastos regulares, excluyendo "Compra Venta Inmuebles"
      const ingresos = monthTrans
        .filter(t => t.tipo === 'Ingreso' && t.categoria !== 'Compra Venta Inmuebles')
        .reduce((sum, t) => sum + t.ingreso, 0);
      const gastos = Math.abs(monthTrans
        .filter(t => t.tipo === 'Gastos' && t.categoria !== 'Compra Venta Inmuebles')
        .reduce((sum, t) => sum + t.gasto, 0));
      
      // Calcular reembolsos del mes (solo ingresos que contengan "reembolso")
      const reembolsos = monthTrans
        .filter(t => t.ingreso > 0 && (
          t.categoria?.toLowerCase().includes('reembolso') ||
          t.subcategoria?.toLowerCase().includes('reembolso') ||
          t.comentario.toLowerCase().includes('reembolso')
        ))
        .reduce((sum, t) => sum + t.ingreso, 0);
      
      // Ajustar por reembolsos
      const ingresosAjustados = ingresos - reembolsos;
      const gastosAjustados = gastos - reembolsos;
      
      tendenciaMensual.push({
        mes: mesLabel,
        ingresos: ingresosAjustados,
        gastos: gastosAjustados,
        balance: ingresosAjustados - gastosAjustados
      });
    }
    
    return {
      // Datos del mes anterior (resumen del mes) - ajustados por reembolsos
      ingresosMes: ingresosAjustadosMes,
      gastosMes: gastosAjustadosMes,
      balanceMes: ingresosAjustadosMes - gastosAjustadosMes,
      
      // Datos del año actual (resumen del año) - ajustados por reembolsos
      ingresosAnio: ingresosAjustadosAnio,
      gastosAnio: gastosAjustadosAnio,
      balanceAnio: ingresosAjustadosAnio - gastosAjustadosAnio,
      
      // Comparativos - usando valores ajustados
      cambioIngresosMes: ingresosAjustadosMesAnterior > 0 ? ((ingresosAjustadosMes - ingresosAjustadosMesAnterior) / ingresosAjustadosMesAnterior) * 100 : 0,
      cambioGastosMes: gastosAjustadosMesAnterior > 0 ? ((gastosAjustadosMes - gastosAjustadosMesAnterior) / gastosAjustadosMesAnterior) * 100 : 0,
      cambioIngresosAnio: ingresosAjustadosAnioAnterior > 0 ? ((ingresosAjustadosAnio - ingresosAjustadosAnioAnterior) / ingresosAjustadosAnioAnterior) * 100 : 0,
      cambioGastosAnio: gastosAjustadosAnioAnterior > 0 ? ((gastosAjustadosAnio - gastosAjustadosAnioAnterior) / gastosAjustadosAnioAnterior) * 100 : 0,
      
      // Comparativos de balance - usando valores ajustados
      balanceMesAnterior: ingresosAjustadosMesAnterior - gastosAjustadosMesAnterior,
      balanceAnioAnterior: ingresosAjustadosAnioAnterior - gastosAjustadosAnioAnterior,
      
      tendenciaMensual
    };
  };

  const filteredMetrics = getFilteredMetrics(selectedCurrency);

  const getBalanceColor = (amount: number) => {
    if (amount > 0) return 'text-success';
    if (amount < 0) return 'text-destructive';
    return 'text-muted-foreground';
  };

  const COLORS = [
    '#3B82F6', // Azul brillante
    '#10B981', // Verde esmeralda
    '#F59E0B', // Ámbar/Dorado
    '#EF4444', // Rojo vibrante
    '#8B5CF6', // Púrpura
    '#06B6D4', // Cyan
    '#84CC16', // Lima
    '#F97316', // Naranja
    '#EC4899', // Rosa
    '#6366F1', // Índigo
  ];

  // Función para obtener distribución por categorías filtrada por moneda (excluyendo aportaciones y retiros)
  const getFilteredDistribution = (currency: 'MXN' | 'USD' | 'EUR', type: 'Ingreso' | 'Gastos', period: 'month' | 'year') => {
    // Filtrar transacciones por divisa y tipo, excluyendo aportaciones de ingresos y retiros de gastos
    const transactionsByType = transactions.filter(t => 
      t.divisa === currency && t.tipo === type
    );
    
    const now = new Date();
    let filteredByPeriod;
    
    if (period === 'month') {
      // Mes anterior (no mes actual)
      const startOfLastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
      const endOfLastMonth = new Date(now.getFullYear(), now.getMonth(), 0);
      filteredByPeriod = transactionsByType.filter(t => {
        const adjustedDate = new Date(t.fecha.getTime() + t.fecha.getTimezoneOffset() * 60000);
        return adjustedDate >= startOfLastMonth && adjustedDate <= endOfLastMonth;
      });
    } else {
      // Año actual
      const startOfYear = new Date(now.getFullYear(), 0, 1);
      filteredByPeriod = transactionsByType.filter(t => {
        const adjustedDate = new Date(t.fecha.getTime() + t.fecha.getTimezoneOffset() * 60000);
        return adjustedDate >= startOfYear;
      });
    }
    
    // Agrupar por categoría
    const categoryTotals: Record<string, number> = {};
    filteredByPeriod.forEach(t => {
      const categoria = t.categoria || 'Sin categoría';
      const amount = type === 'Ingreso' ? t.ingreso : t.gasto;
      categoryTotals[categoria] = (categoryTotals[categoria] || 0) + Math.abs(amount);
    });

    // Convertir a array y ordenar
    return Object.entries(categoryTotals)
      .map(([categoria, monto], index) => ({
        name: categoria,
        value: monto,
        color: COLORS[index % COLORS.length]
      }))
      .sort((a, b) => b.value - a.value)
      .slice(0, 10); // Top 10 categorías
  };

  // Preparar datos para gráficos filtrados por moneda seleccionada
  const pieDataGastosMesAnterior = getFilteredDistribution(selectedCurrency, 'Gastos', 'month');
  const pieDataGastosAnual = getFilteredDistribution(selectedCurrency, 'Gastos', 'year');
  const pieDataIngresosMesAnterior = getFilteredDistribution(selectedCurrency, 'Ingreso', 'month');
  const pieDataIngresosAnual = getFilteredDistribution(selectedCurrency, 'Ingreso', 'year');

  // Función para mostrar tendencia
  const getTrendIcon = (change: number) => {
    if (change > 0) return <TrendingUp className="h-4 w-4 text-success" />;
    if (change < 0) return <TrendingDown className="h-4 w-4 text-destructive" />;
    return null;
  };

  const getTrendColor = (change: number) => {
    if (change > 0) return 'text-success';
    if (change < 0) return 'text-destructive';
    return 'text-muted-foreground';
  };

  // Función para formatear moneda consistentemente
  const formatCurrencyConsistent = (amount: number, currency: string) => {
    return `${new Intl.NumberFormat('es-MX', {minimumFractionDigits: 2, maximumFractionDigits: 2}).format(amount)} ${currency}`;
  };

  // Función para formatear totales sin decimales
  const formatCurrencyTotals = (amount: number, currency: string) => {
    return `${new Intl.NumberFormat('es-ES', {minimumFractionDigits: 0, maximumFractionDigits: 0}).format(amount)} ${currency}`;
  };

  // Calcular cambios en balance
  const cambioBalanceMes = filteredMetrics.balanceMesAnterior !== 0 ? 
    ((filteredMetrics.balanceMes - filteredMetrics.balanceMesAnterior) / Math.abs(filteredMetrics.balanceMesAnterior)) * 100 : 0;
  
  const cambioBalanceAnio = filteredMetrics.balanceAnioAnterior !== 0 ? 
    ((filteredMetrics.balanceAnio - filteredMetrics.balanceAnioAnterior) / Math.abs(filteredMetrics.balanceAnioAnterior)) * 100 : 0;


  const getSaludColor = (nivel: string) => {
    switch (nivel) {
      case 'Excelente': return 'text-success';
      case 'Buena': return 'text-primary';
      case 'Regular': return 'text-warning';
      case 'Mejorable': return 'text-destructive';
      case 'Crítica': return 'text-destructive';
      default: return 'text-muted-foreground';
    }
  };

  const getFinancialAdvice = (nivel: string, score: number) => {
    switch (nivel) {
      case 'Excelente':
        return t('dashboard.advice.excellent');
      case 'Buena':
        return t('dashboard.advice.good');
      case 'Regular':
        return t('dashboard.advice.regular');
      case 'Mejorable':
        return t('dashboard.advice.improvable');
      case 'Crítica':
        return t('dashboard.advice.critical');
      default:
        return t('dashboard.advice.default');
    }
  };

  return (
    <div className="space-y-6 animate-fade-in">
      {/* MEDIAS DE ÚLTIMOS 6 MESES */}
      <div className="space-y-3">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Card className="border-primary/20 hover:border-primary/40 transition-all duration-300">
            <CardHeader className="pb-3">
              <CardTitle className="text-base text-primary flex items-center gap-2">
                <TrendingUp className="h-5 w-5" />
                Media Ingresos (6 meses)
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                <div className="text-2xl font-bold text-primary">
                  {formatCurrencyTotals(metrics.mediaIngresosUltimos12Meses, 'MXN')}
                </div>
                <p className="text-xs text-muted-foreground">
                  Promedio mensual (excl. mes actual y Compra Venta Inmuebles)
                </p>
              </div>
            </CardContent>
          </Card>

          <Card className="border-destructive/20 hover:border-destructive/40 transition-all duration-300">
            <CardHeader className="pb-3">
              <CardTitle className="text-base text-destructive flex items-center gap-2">
                <TrendingDown className="h-5 w-5" />
                Media Gastos (6 meses)
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                <div className="text-2xl font-bold text-destructive">
                  {formatCurrencyTotals(metrics.mediaGastosUltimos12Meses, 'MXN')}
                </div>
                <p className="text-xs text-muted-foreground">
                  Promedio mensual (excl. mes actual y Compra Venta Inmuebles)
                </p>
              </div>
            </CardContent>
          </Card>
        </div>
        
        <Card className="bg-muted/30 border-muted">
          <CardContent className="pt-4">
            <div className="flex gap-2">
              <Info className="h-4 w-4 text-muted-foreground flex-shrink-0 mt-0.5" />
              <p className="text-xs text-muted-foreground leading-relaxed">
                <strong>Nota:</strong> Los reembolsos no se incluyen en los ingresos, pero el mismo monto está descontado de los gastos. 
                La categoría "Compra Venta Inmuebles" no está incluida, aun siendo gastos e ingresos reales, 
                porque desajustan el control y la media mensual.
              </p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* BALANCE GENERAL - Activos y Pasivos */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* ACTIVOS */}
        <Card className="border-success/20 hover:border-success/40 transition-all duration-300">
          <CardHeader>
            <CardTitle className="text-success">
              {t('dashboard.assets')}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {/* Total principal */}
              <div className="p-4 rounded-lg bg-success/10 border-2 border-success/30">
                <div className="flex justify-between items-center">
                    <span className="font-semibold text-success">{t('dashboard.total_assets')}</span>
                    <span className="text-xl font-bold text-success">{formatCurrencyTotals(metrics.activos.total, 'MXN')}</span>
                </div>
              </div>

              {/* Total excluyendo Bienes Raíces y Empresas Privadas */}
              <div className="p-4 rounded-lg bg-success/5 border border-success/20">
                <div className="flex justify-between items-center">
                    <span className="text-sm text-muted-foreground">Total Líquido</span>
                    <span className="text-lg font-bold text-success">
                      {formatCurrencyTotals(metrics.activos.efectivoBancos + metrics.activos.inversiones, 'MXN')}
                    </span>
                </div>
                <div className="text-xs text-muted-foreground mt-1">
                  Excluyendo Bienes Raíces y Empresas Privadas
                </div>
              </div>

              {/* Desglose colapsable */}
              <Accordion 
                type="single" 
                collapsible 
                className="w-full"
                value={assetsAccordionValue}
                onValueChange={setAssetsAccordionValue}
              >
                <AccordionItem value="assets-detail" className="border-success/20">
                  <AccordionTrigger className="text-sm text-success hover:text-success/80 hover:no-underline">
                    Ver desglose de activos
                  </AccordionTrigger>
                  <AccordionContent forceMount>
                    <div className="data-[state=closed]:hidden">
                    <div className="space-y-3 pt-2">
                      {/* Mostrar categorías por moneda con cuentas individuales */}
                      {Object.entries(metrics.activosPorMoneda).map(([moneda, activos]) => {
                        const formatNumberOnly = (amount: number) => {
                          return new Intl.NumberFormat('es-MX', {
                            minimumFractionDigits: 0,
                            maximumFractionDigits: 0,
                          }).format(amount);
                        };

                        const hasAssets = activos.efectivoBancos > 0 || activos.inversiones > 0 || activos.bienRaiz > 0 || activos.empresasPrivadas > 0;
                        
                        if (!hasAssets) return null;

                        // Filtrar cuentas por moneda
                        const cuentasEfectivo = accounts.filter(cuenta => 
                          cuenta.tipo === 'Efectivo/Bancos' && 
                          cuenta.divisa === moneda && 
                          cuenta.vendida !== true &&
                          cuenta.saldoActual > 0
                        );

                        const cuentasInversion = accounts.filter(cuenta => 
                          cuenta.tipo === 'Inversión' && 
                          cuenta.divisa === moneda && 
                          cuenta.vendida !== true &&
                          cuenta.saldoActual > 0
                        );

                        const cuentasEmpresas = accounts.filter(cuenta => 
                          cuenta.tipo === 'Empresa Privada' && 
                          cuenta.divisa === moneda && 
                          cuenta.vendida !== true &&
                          cuenta.saldoActual > 0
                        );

                        const cuentasBienRaiz = accounts.filter(cuenta => 
                          cuenta.tipo === 'Bien Raíz' && 
                          cuenta.divisa === moneda && 
                          cuenta.vendida !== true &&
                          cuenta.saldoActual > 0
                        );

                        return (
                           <div key={moneda} className="space-y-3">
                              {/* Efectivo/Bancos */}
                              {activos.efectivoBancos > 0 && (
                                 <Collapsible 
                                   open={collapsibleStates[`efectivo-${moneda}`] || false}
                                   onOpenChange={() => toggleCollapsible(`efectivo-${moneda}`)}
                                   className="rounded-lg bg-success/5 border border-success/20"
                                 >
                                   <CollapsibleTrigger className="group w-full p-4 flex justify-between items-center cursor-pointer text-left">
                                     <div className="flex items-center gap-2">
                                       <ChevronDown className="h-4 w-4 text-success transition-transform duration-200 group-data-[state=open]:rotate-180" />
                                       <div className="text-left">
                                         <div className="text-sm font-semibold text-muted-foreground">{t('dashboard.cash_banks')}</div>
                                         <div className="text-xs text-muted-foreground mt-1">{t('dashboard.available_immediately')}</div>
                                       </div>
                                     </div>
                                     <span className="font-bold text-success">{formatNumberOnly(activos.efectivoBancos)} {moneda}</span>
                                   </CollapsibleTrigger>
                                   <CollapsibleContent className="px-4 pb-4">
                                     <div className="space-y-2 pl-3 border-l-2 border-success/30">
                                       {cuentasEfectivo.map(cuenta => (
                                         <div key={cuenta.id} className="flex justify-between items-center text-xs py-1">
                                           <span className="text-muted-foreground">• {cuenta.nombre} {cuenta.divisa}</span>
                                           <span className="font-medium text-success">{formatNumberOnly(cuenta.saldoActual)} {moneda}</span>
                                         </div>
                                       ))}
                                     </div>
                                    </CollapsibleContent>
                                 </Collapsible>
                              )}
                             
                              {/* Inversiones */}
                              {activos.inversiones > 0 && (
                                 <Collapsible 
                                   open={collapsibleStates[`inversiones-${moneda}`] || false}
                                   onOpenChange={() => toggleCollapsible(`inversiones-${moneda}`)}
                                   className="rounded-lg bg-primary/5 border border-primary/20"
                                 >
                                   <CollapsibleTrigger className="group w-full p-4 flex justify-between items-center cursor-pointer text-left">
                                     <div className="flex items-center gap-2">
                                       <ChevronDown className="h-4 w-4 text-primary transition-transform duration-200 group-data-[state=open]:rotate-180" />
                                       <div className="text-left">
                                         <div className="text-sm font-semibold text-muted-foreground">{t('dashboard.investments_label')}</div>
                                         <div className="text-xs text-muted-foreground mt-1">{t('dashboard.funds_stocks_etfs')}</div>
                                       </div>
                                     </div>
                                     <span className="font-bold text-primary">{formatNumberOnly(activos.inversiones)} {moneda}</span>
                                   </CollapsibleTrigger>
                                   <CollapsibleContent className="px-4 pb-4">
                                     <div className="space-y-2 pl-3 border-l-2 border-primary/30">
                                       {cuentasInversion.map(cuenta => (
                                         <div key={cuenta.id} className="flex justify-between items-center text-xs py-1">
                                           <span className="text-muted-foreground">• {cuenta.nombre} {cuenta.divisa}</span>
                                           <span className="font-medium text-primary">{formatNumberOnly(cuenta.saldoActual)} {moneda}</span>
                                         </div>
                                       ))}
                                     </div>
                                   </CollapsibleContent>
                                </Collapsible>
                               )}

                               {/* Empresas Privadas */}
                               {activos.empresasPrivadas > 0 && (
                                 <Collapsible 
                                   open={collapsibleStates[`empresas-${moneda}`] || false}
                                   onOpenChange={() => toggleCollapsible(`empresas-${moneda}`)}
                                   className="rounded-lg bg-accent/5 border border-accent/20"
                                 >
                                     <CollapsibleTrigger className="group w-full p-4 flex justify-between items-center cursor-pointer text-left">
                                       <div className="flex items-center gap-2">
                                         <ChevronDown className="h-4 w-4 text-accent transition-transform duration-200 group-data-[state=open]:rotate-180" />
                                        <div className="text-left">
                                          <div className="text-sm font-semibold text-muted-foreground">Empresas Privadas</div>
                                          <div className="text-xs text-muted-foreground mt-1">Participaciones en empresas propias</div>
                                        </div>
                                      </div>
                                      <span className="font-bold text-accent">{formatNumberOnly(activos.empresasPrivadas)} {moneda}</span>
                                    </CollapsibleTrigger>
                                    <CollapsibleContent className="px-4 pb-4">
                                      <div className="space-y-2 pl-3 border-l-2 border-accent/30">
                                        {cuentasEmpresas.map(cuenta => (
                                          <div key={cuenta.id} className="flex justify-between items-center text-xs py-1">
                                            <span className="text-muted-foreground">• {cuenta.nombre} {cuenta.divisa}</span>
                                            <span className="font-medium text-accent">{formatNumberOnly(cuenta.saldoActual)} {moneda}</span>
                                          </div>
                                        ))}
                                      </div>
                                    </CollapsibleContent>
                                 </Collapsible>
                               )}
                              
                               {/* Bienes Raíces */}
                               {activos.bienRaiz > 0 && (
                                  <Collapsible 
                                    open={collapsibleStates[`bienraiz-${moneda}`] || false}
                                    onOpenChange={() => toggleCollapsible(`bienraiz-${moneda}`)}
                                    className="rounded-lg bg-secondary/5 border border-secondary/20"
                                  >
                                     <CollapsibleTrigger className="group w-full p-4 flex justify-between items-center cursor-pointer text-left">
                                       <div className="flex items-center gap-2">
                                         <ChevronDown className="h-4 w-4 text-secondary transition-transform duration-200 group-data-[state=open]:rotate-180" />
                                        <div className="text-left">
                                          <div className="text-sm font-semibold text-muted-foreground">Bienes Raíces</div>
                                          <div className="text-xs text-muted-foreground mt-1">Propiedades y terrenos</div>
                                        </div>
                                      </div>
                                      <span className="font-bold text-secondary">{formatNumberOnly(activos.bienRaiz)} {moneda}</span>
                                    </CollapsibleTrigger>
                                    <CollapsibleContent className="px-4 pb-4">
                                      <div className="space-y-2 pl-3 border-l-2 border-secondary/30">
                                        {cuentasBienRaiz.map(cuenta => (
                                          <div key={cuenta.id} className="flex justify-between items-center text-xs py-1">
                                            <span className="text-muted-foreground">• {cuenta.nombre} {cuenta.divisa}</span>
                                            <span className="font-medium text-secondary">{formatNumberOnly(cuenta.saldoActual)} {moneda}</span>
                                          </div>
                                        ))}
                                      </div>
                                    </CollapsibleContent>
                                 </Collapsible>
                               )}
                            </div>
                        );
                      })}
                    </div>
                    </div>
                  </AccordionContent>
                </AccordionItem>
              </Accordion>
            </div>
          </CardContent>
        </Card>

        {/* PASIVOS */}
        <Card className="border-destructive/20 hover:border-destructive/40 transition-all duration-300">
          <CardHeader>
             <CardTitle className="text-destructive">
               {t('dashboard.liabilities')}
             </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {/* Total principal */}
              <div className="p-4 rounded-lg bg-destructive/10 border-2 border-destructive/30">
                <div className="flex justify-between items-center">
                    <span className="font-semibold text-destructive">{t('dashboard.total_liabilities')}</span>
                    <span className="text-xl font-bold text-destructive">{formatCurrencyTotals(metrics.pasivos.total, 'MXN')}</span>
                </div>
              </div>

              {/* Desglose colapsable */}
              <Accordion 
                type="single" 
                collapsible 
                className="w-full"
                value={liabilitiesAccordionValue}
                onValueChange={setLiabilitiesAccordionValue}
              >
                <AccordionItem value="liabilities-detail" className="border-destructive/20">
                  <AccordionTrigger className="text-sm text-destructive hover:text-destructive/80 hover:no-underline">
                    Ver desglose de pasivos
                  </AccordionTrigger>
                  <AccordionContent forceMount>
                    <div className="data-[state=closed]:hidden">
                    <div className="space-y-3 pt-2">
                      {/* Mostrar categorías por moneda con cuentas individuales */}
                      {Object.entries(metrics.pasivosPorMoneda).map(([moneda, pasivos]) => {
                        const formatNumberOnly = (amount: number) => {
                          return new Intl.NumberFormat('es-MX', {
                            minimumFractionDigits: 0,
                            maximumFractionDigits: 0,
                          }).format(amount);
                        };

                        // Filtrar cuentas por moneda (incluyendo tarjetas con saldo positivo)
                        const tarjetasCredito = accounts.filter(cuenta => 
                          cuenta.tipo === 'Tarjeta de Crédito' && 
                          cuenta.divisa === moneda
                        );

                        const cuentasHipoteca = accounts.filter(cuenta => 
                          cuenta.tipo === 'Hipoteca' && 
                          cuenta.divisa === moneda &&
                          cuenta.saldoActual < 0
                        );

                        const hasLiabilities = tarjetasCredito.length > 0 || cuentasHipoteca.length > 0;
                        
                        if (!hasLiabilities) return null;

                        return (
                          <div key={moneda} className="space-y-3">
                            {/* Tarjetas de Crédito */}
                            {tarjetasCredito.length > 0 && (
                              <Collapsible 
                                open={collapsibleStates[`tarjetas-${moneda}`] || false}
                                onOpenChange={() => toggleCollapsible(`tarjetas-${moneda}`)}
                                className="rounded-lg bg-destructive/5 border border-destructive/20"
                              >
                                <CollapsibleTrigger className="group w-full p-4 flex justify-between items-center cursor-pointer text-left">
                                  <div className="flex items-center gap-2">
                                    <ChevronDown className="h-4 w-4 text-destructive transition-transform duration-200 group-data-[state=open]:rotate-180" />
                                    <div className="text-left">
                                      <div className="text-sm font-semibold text-muted-foreground">Tarjetas de Crédito</div>
                                      <div className="text-xs text-muted-foreground mt-1">Deuda de tarjetas activas</div>
                                    </div>
                                  </div>
                                  <span className="font-bold text-destructive">
                                    {formatNumberOnly(tarjetasCredito.filter(c => c.saldoActual < 0).reduce((sum, c) => sum + Math.abs(c.saldoActual), 0))} {moneda}
                                  </span>
                                </CollapsibleTrigger>
                                <CollapsibleContent className="px-4 pb-4">
                                   <div className="space-y-2 pl-3 border-l-2 border-destructive/30">
                                     {tarjetasCredito.map(cuenta => (
                                       <div key={cuenta.id} className="flex justify-between items-center text-xs py-1">
                                         <span className="text-muted-foreground">
                                           • {cuenta.nombre} {cuenta.divisa}
                                           {cuenta.saldoActual >= 0 && <span className="ml-2 text-success">(Saldo a favor)</span>}
                                         </span>
                                         <span className={`font-medium ${cuenta.saldoActual >= 0 ? 'text-success' : 'text-destructive'}`}>
                                           {formatNumberOnly(Math.abs(cuenta.saldoActual))} {moneda}
                                         </span>
                                       </div>
                                     ))}
                                   </div>
                                </CollapsibleContent>
                              </Collapsible>
                            )}

                            {/* Hipotecas */}
                            {cuentasHipoteca.length > 0 && (
                              <Collapsible 
                                open={collapsibleStates[`hipoteca-${moneda}`] || false}
                                onOpenChange={() => toggleCollapsible(`hipoteca-${moneda}`)}
                                className="rounded-lg bg-warning/5 border border-warning/20"
                              >
                                 <CollapsibleTrigger className="group w-full p-4 flex justify-between items-center cursor-pointer text-left">
                                   <div className="flex items-center gap-2">
                                     <ChevronDown className="h-4 w-4 text-destructive transition-transform duration-200 group-data-[state=open]:rotate-180" />
                                    <div className="text-left">
                                      <div className="text-sm font-semibold text-muted-foreground">Hipoteca</div>
                                      <div className="text-xs text-muted-foreground mt-1">Saldo pendiente del préstamo hipotecario</div>
                                    </div>
                                  </div>
                                  <span className="font-bold text-destructive">
                                    {formatNumberOnly(cuentasHipoteca.reduce((sum, c) => sum + Math.abs(c.saldoActual), 0))} {moneda}
                                  </span>
                                </CollapsibleTrigger>
                                <CollapsibleContent className="px-4 pb-4">
                                  <div className="space-y-2 pl-3 border-l-2 border-destructive/30">
                                        {cuentasHipoteca.map(cuenta => (
                                          <div key={cuenta.id} className="flex justify-between items-center text-xs py-1">
                                            <span className="text-muted-foreground">• {cuenta.nombre} {cuenta.divisa}</span>
                                            <span className="font-medium text-destructive">{formatNumberOnly(Math.abs(cuenta.saldoActual))} {moneda}</span>
                                          </div>
                                        ))}
                                  </div>
                                </CollapsibleContent>
                              </Collapsible>
                            )}
                          </div>
                         );
                       })}
                    </div>
                    </div>
                  </AccordionContent>
                </AccordionItem>
              </Accordion>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* SCORE DE SALUD FINANCIERA */}
      <Card className="border-primary/20 hover:border-primary/40 transition-all duration-300">
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              {t('dashboard.financial_health')}
            </CardTitle>
            <div className="flex items-center gap-3">
              <span className={`text-3xl font-bold ${getSaludColor(metrics.saludFinanciera.nivel)}`}>
                {metrics.saludFinanciera.score}
              </span>
              <Badge variant={metrics.saludFinanciera.nivel === 'Excelente' ? 'default' : 
                              metrics.saludFinanciera.nivel === 'Buena' ? 'secondary' : 'destructive'}>
                {metrics.saludFinanciera.nivel}
              </Badge>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <Accordion type="single" collapsible className="w-full">
            <AccordionItem value="financial-health-details" className="border-none">
              <AccordionTrigger className="hover:no-underline py-2">
                <span className="text-sm text-muted-foreground">Ver análisis detallado</span>
              </AccordionTrigger>
              <AccordionContent className="space-y-4 pt-4">
                <p className="text-sm text-muted-foreground">{metrics.saludFinanciera.descripcion}</p>
                
                {/* Desglose de factores */}
                {metrics.saludFinanciera.detalles && (
                  <div className="space-y-3">
                    <h4 className="text-sm font-semibold text-foreground flex items-center gap-2">
                      <Info className="h-4 w-4" />
                      Factores Ponderados
                    </h4>
                    
                    {/* Liquidez */}
                    <div className="space-y-2">
                      <div className="flex justify-between text-xs">
                        <span className="text-muted-foreground">💧 Liquidez ({metrics.saludFinanciera.detalles.liquidez.mesesCobertura} meses de gastos)</span>
                        <span className="font-medium">{metrics.saludFinanciera.detalles.liquidez.puntos}/{metrics.saludFinanciera.detalles.liquidez.maxPuntos}</span>
                      </div>
                      <Progress value={(metrics.saludFinanciera.detalles.liquidez.puntos / metrics.saludFinanciera.detalles.liquidez.maxPuntos) * 100} />
                    </div>

                    {/* Ahorro */}
                    <div className="space-y-2">
                      <div className="flex justify-between text-xs">
                        <span className="text-muted-foreground">💰 Ahorro ({metrics.saludFinanciera.detalles.ahorro.porcentaje}% del objetivo)</span>
                        <span className="font-medium">{metrics.saludFinanciera.detalles.ahorro.puntos}/{metrics.saludFinanciera.detalles.ahorro.maxPuntos}</span>
                      </div>
                      <Progress value={(metrics.saludFinanciera.detalles.ahorro.puntos / metrics.saludFinanciera.detalles.ahorro.maxPuntos) * 100} className="[&>div]:bg-success" />
                    </div>

                    {/* Endeudamiento */}
                    <div className="space-y-2">
                      <div className="flex justify-between text-xs">
                        <span className="text-muted-foreground">📊 Endeudamiento ({metrics.saludFinanciera.detalles.endeudamiento.porcentaje}% deuda)</span>
                        <span className="font-medium">{metrics.saludFinanciera.detalles.endeudamiento.puntos}/{metrics.saludFinanciera.detalles.endeudamiento.maxPuntos}</span>
                      </div>
                      <Progress value={(metrics.saludFinanciera.detalles.endeudamiento.puntos / metrics.saludFinanciera.detalles.endeudamiento.maxPuntos) * 100} className="[&>div]:bg-warning" />
                    </div>

                    {/* Rendimiento Inversiones */}
                    <div className="space-y-2">
                      <div className="flex justify-between text-xs">
                        <span className="text-muted-foreground">📈 Rendimiento ({metrics.saludFinanciera.detalles.rendimientoInversiones.porcentaje}% anual)</span>
                        <span className="font-medium">{metrics.saludFinanciera.detalles.rendimientoInversiones.puntos}/{metrics.saludFinanciera.detalles.rendimientoInversiones.maxPuntos}</span>
                      </div>
                      <Progress value={(metrics.saludFinanciera.detalles.rendimientoInversiones.puntos / metrics.saludFinanciera.detalles.rendimientoInversiones.maxPuntos) * 100} className="[&>div]:bg-accent" />
                    </div>

                    {/* Diversificación */}
                    <div className="space-y-2">
                      <div className="flex justify-between text-xs">
                        <span className="text-muted-foreground">🎯 Diversificación ({metrics.saludFinanciera.detalles.diversificacion.tiposActivos.length} tipos)</span>
                        <span className="font-medium">{metrics.saludFinanciera.detalles.diversificacion.puntos}/{metrics.saludFinanciera.detalles.diversificacion.maxPuntos}</span>
                      </div>
                      <Progress value={(metrics.saludFinanciera.detalles.diversificacion.puntos / metrics.saludFinanciera.detalles.diversificacion.maxPuntos) * 100} className="[&>div]:bg-secondary" />
                    </div>
                  </div>
                )}
                
                {/* Comparativa con promedios de referencia */}
                <div className="p-3 bg-muted/30 border border-muted rounded-lg">
                  <h4 className="text-sm font-semibold text-foreground mb-2">📊 Referencias Recomendadas</h4>
                  <div className="space-y-1 text-xs text-muted-foreground">
                    <p>• <strong>Liquidez:</strong> 3-6 meses de gastos (ideal)</p>
                    <p>• <strong>Ahorro:</strong> 20-30% de ingresos mensuales</p>
                    <p>• <strong>Endeudamiento:</strong> Máximo 30% de activos</p>
                    <p>• <strong>Rendimiento:</strong> 7-10% anual (largo plazo)</p>
                    <p>• <strong>Diversificación:</strong> Mínimo 3 tipos de activos</p>
                  </div>
                </div>
                
                {/* Consejo financiero */}
                <div className="p-3 bg-primary/5 border border-primary/20 rounded-lg">
                  <h4 className="text-sm font-semibold text-primary mb-2">💡 {t('dashboard.advice_title')}</h4>
                  <p className="text-xs text-muted-foreground">
                    {getFinancialAdvice(metrics.saludFinanciera.nivel, metrics.saludFinanciera.score)}
                  </p>
                </div>
              </AccordionContent>
            </AccordionItem>
          </Accordion>
        </CardContent>
      </Card>

      {/* BOTONES DE SELECCIÓN DE MONEDA */}
      <div className="flex justify-center mb-6">
        <div className="flex rounded-lg bg-muted p-1">
          {(['MXN', 'USD', 'EUR'] as const).map((currency) => (
            <Button
              key={currency}
              variant={selectedCurrency === currency ? "default" : "ghost"}
              size="sm"
              onClick={() => setSelectedCurrency(currency)}
              className="px-4 py-2"
            >
              {currency}
            </Button>
          ))}
        </div>
      </div>

      {/* GRÁFICA DE INGRESOS VS GASTOS - ÚLTIMOS 12 MESES */}
      <Card className="border-primary/20 hover:border-primary/40 transition-all duration-300">
        <CardHeader>
          <CardTitle className="text-center">{t('dashboard.income_vs_expenses')} <strong>{selectedCurrency}</strong></CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-80">
            <ResponsiveContainer width="100%" height="100%">
              <ComposedChart 
                data={filteredMetrics.tendenciaMensual}
                margin={{ top: 20, right: 30, left: 0, bottom: 5 }}
              >
                <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
                <XAxis 
                  dataKey="mes" 
                  tick={{ fontSize: 12 }}
                  className="text-muted-foreground"
                />
                <YAxis 
                  tick={false}
                  className="text-muted-foreground"
                  width={0}
                />
                <Tooltip 
                  formatter={(value: any, name: string) => [
                    formatCurrencyConsistent(Number(value), selectedCurrency), 
                    name === 'ingresos' ? t('transactions.income') : name === 'gastos' ? t('transactions.expense') : 'Balance'
                  ]}
                  labelStyle={{ color: 'hsl(var(--foreground))' }}
                  contentStyle={{ 
                    backgroundColor: 'hsl(var(--background))', 
                    border: '1px solid hsl(var(--border))',
                    borderRadius: '6px'
                  }}
                />
                <Bar 
                  dataKey="ingresos" 
                  fill="hsl(var(--success))" 
                  radius={[2, 2, 0, 0]}
                  name="ingresos"
                />
                <Bar 
                  dataKey="gastos" 
                  fill="hsl(var(--destructive))" 
                  radius={[2, 2, 0, 0]}
                  name="gastos"
                />
                <Line 
                  type="monotone" 
                  dataKey="balance" 
                  stroke="hsl(var(--primary))" 
                  strokeWidth={3}
                  dot={{ fill: 'hsl(var(--primary))', strokeWidth: 2, r: 4 }}
                  name="Balance"
                />
              </ComposedChart>
            </ResponsiveContainer>
          </div>
          <div className="flex justify-center gap-6 mt-4 text-sm">
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 rounded" style={{ backgroundColor: 'hsl(var(--success))' }}></div>
              <span>{t('transactions.income')}</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 rounded" style={{ backgroundColor: 'hsl(var(--destructive))' }}></div>
              <span>{t('transactions.expense')}</span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Nota explicativa de la gráfica */}
      <Card className="bg-muted/30 border-muted -mt-2">
        <CardContent className="pt-4 pb-3">
          <div className="flex gap-2">
            <Info className="h-4 w-4 text-muted-foreground flex-shrink-0 mt-0.5" />
            <p className="text-xs text-muted-foreground leading-relaxed">
              <strong>Nota:</strong> La gráfica no incluye reembolsos en ingresos, pero el mismo monto está descontado de gastos. 
              La categoría "Compra Venta Inmuebles" tampoco está incluida.
            </p>
          </div>
        </CardContent>
      </Card>

      {/* RESUMEN MENSUAL */}
      <div className="mb-4">
        <h2 className="text-xl font-semibold text-center">{t('dashboard.summary_month')} ({new Date(new Date().getFullYear(), new Date().getMonth() - 1, 1).toLocaleDateString('es-MX', { month: 'long', year: 'numeric' })})</h2>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
        {/* Resultado del mes */}
        <Card className="border-2 border-primary/50 bg-primary/5 transition-all duration-300">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-primary">{t('dashboard.monthly_result')}</CardTitle>
            {getTrendIcon(cambioBalanceMes)}
          </CardHeader>
          <CardContent>
            <div className={`text-2xl font-bold ${getBalanceColor(filteredMetrics.balanceMes)}`}>
              {formatCurrencyConsistent(filteredMetrics.balanceMes, selectedCurrency)}
            </div>
            <p className={`text-xs ${getTrendColor(cambioBalanceMes)}`}>
              {cambioBalanceMes > 0 ? '+' : ''}{cambioBalanceMes.toFixed(1)}% vs mes anterior
            </p>
          </CardContent>
        </Card>

        {/* Ingresos del mes */}
        <Card className="border-success/20 hover:border-success/40 transition-all duration-300">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">{t('dashboard.monthly_income_label')}</CardTitle>
            {getTrendIcon(filteredMetrics.cambioIngresosMes)}
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-success">
              {formatCurrencyConsistent(filteredMetrics.ingresosMes, selectedCurrency)}
            </div>
            <p className={`text-xs ${getTrendColor(filteredMetrics.cambioIngresosMes)}`}>
              {filteredMetrics.cambioIngresosMes > 0 ? '+' : ''}{filteredMetrics.cambioIngresosMes.toFixed(1)}% vs mes anterior
            </p>
          </CardContent>
        </Card>

        {/* Gastos del mes */}
        <Card className="border-destructive/20 hover:border-destructive/40 transition-all duration-300">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">{t('dashboard.monthly_expenses_label')}</CardTitle>
            {getTrendIcon(filteredMetrics.cambioGastosMes)}
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-destructive">
              {formatCurrencyConsistent(filteredMetrics.gastosMes, selectedCurrency)}
            </div>
            <p className={`text-xs ${getTrendColor(filteredMetrics.cambioGastosMes)}`}>
              {filteredMetrics.cambioGastosMes > 0 ? '+' : ''}{filteredMetrics.cambioGastosMes.toFixed(1)}% vs mes anterior
            </p>
          </CardContent>
        </Card>
      </div>

      {/* DISTRIBUCIÓN DE GASTOS E INGRESOS MENSUAL */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Distribución de Gastos */}
        <Card className="border-destructive/20 hover:border-destructive/40 transition-all duration-300">
          <CardHeader>
            <CardTitle className="text-center">{t('dashboard.expenses_distribution')}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-80">
              <ResponsiveContainer width="100%" height="100%">
                <RechartsPieChart>
                  <Pie
                    data={pieDataGastosMesAnterior}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={100}
                    paddingAngle={5}
                    dataKey="value"
                  >
                    {pieDataGastosMesAnterior.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                   <Tooltip 
                     formatter={(value: any) => [
                       formatCurrencyConsistent(Number(value), selectedCurrency), 
                       'Monto'
                     ]}
                   />
                </RechartsPieChart>
              </ResponsiveContainer>
            </div>
            <div className="mt-4 space-y-2">
              {pieDataGastosMesAnterior.map((entry, index) => (
                <div key={index} className="flex items-center justify-between text-sm">
                  <div className="flex items-center space-x-2">
                    <div 
                      className="w-3 h-3 rounded-full" 
                      style={{ backgroundColor: entry.color }}
                    />
                    <span>{entry.name}</span>
                  </div>
                  <span className="font-medium">
                    {formatCurrencyConsistent(entry.value, selectedCurrency)}
                  </span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Distribución de Ingresos */}
        <Card className="border-success/20 hover:border-success/40 transition-all duration-300">
          <CardHeader>
            <CardTitle className="text-center">{t('dashboard.income_distribution')}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-80">
              <ResponsiveContainer width="100%" height="100%">
                <RechartsPieChart>
                  <Pie
                    data={pieDataIngresosMesAnterior}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={100}
                    paddingAngle={5}
                    dataKey="value"
                  >
                    {pieDataIngresosMesAnterior.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip 
                    formatter={(value: any) => [
                      formatCurrencyConsistent(Number(value), selectedCurrency), 
                      'Monto'
                    ]}
                  />
                </RechartsPieChart>
              </ResponsiveContainer>
            </div>
            <div className="mt-4 space-y-2">
              {pieDataIngresosMesAnterior.map((entry, index) => (
                <div key={index} className="flex items-center justify-between text-sm">
                  <div className="flex items-center space-x-2">
                    <div 
                      className="w-3 h-3 rounded-full" 
                      style={{ backgroundColor: entry.color }}
                    />
                    <span>{entry.name}</span>
                  </div>
                  <span className="font-medium">
                    {formatCurrencyConsistent(entry.value, selectedCurrency)}
                  </span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* RESUMEN ANUAL */}
      <div className="mb-4">
        <h2 className="text-xl font-semibold text-center">{t('dashboard.summary_year')} {new Date().getFullYear()}</h2>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
        {/* Resultado anual */}
        <Card className="border-2 border-primary/50 bg-primary/5 transition-all duration-300">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-primary">{t('dashboard.annual_result')}</CardTitle>
            {getTrendIcon(cambioBalanceAnio)}
          </CardHeader>
          <CardContent>
            <div className={`text-2xl font-bold ${getBalanceColor(filteredMetrics.balanceAnio)}`}>
              {formatCurrencyConsistent(filteredMetrics.balanceAnio, selectedCurrency)}
            </div>
            <p className={`text-xs ${getTrendColor(cambioBalanceAnio)}`}>
              {cambioBalanceAnio > 0 ? '+' : ''}{cambioBalanceAnio.toFixed(1)}% vs año anterior
            </p>
          </CardContent>
        </Card>

        {/* Ingresos anuales */}
        <Card className="border-success/20 hover:border-success/40 transition-all duration-300">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">{t('dashboard.annual_income_label')}</CardTitle>
            {getTrendIcon(filteredMetrics.cambioIngresosAnio)}
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-success">
              {formatCurrencyConsistent(filteredMetrics.ingresosAnio, selectedCurrency)}
            </div>
            <p className={`text-xs ${getTrendColor(filteredMetrics.cambioIngresosAnio)}`}>
              {filteredMetrics.cambioIngresosAnio > 0 ? '+' : ''}{filteredMetrics.cambioIngresosAnio.toFixed(1)}% vs año anterior
            </p>
          </CardContent>
        </Card>

        {/* Gastos anuales */}
        <Card className="border-destructive/20 hover:border-destructive/40 transition-all duration-300">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">{t('dashboard.annual_expenses_label')}</CardTitle>
            {getTrendIcon(filteredMetrics.cambioGastosAnio)}
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-destructive">
              {formatCurrencyConsistent(filteredMetrics.gastosAnio, selectedCurrency)}
            </div>
            <p className={`text-xs ${getTrendColor(filteredMetrics.cambioGastosAnio)}`}>
              {filteredMetrics.cambioGastosAnio > 0 ? '+' : ''}{filteredMetrics.cambioGastosAnio.toFixed(1)}% vs año anterior
            </p>
          </CardContent>
        </Card>
      </div>

      {/* DISTRIBUCIÓN DE GASTOS E INGRESOS ANUAL */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Distribución de Gastos Anual */}
        <Card className="border-destructive/20 hover:border-destructive/40 transition-all duration-300">
          <CardHeader>
            <CardTitle className="text-center">{t('dashboard.expenses_distribution')}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-80">
              <ResponsiveContainer width="100%" height="100%">
                <RechartsPieChart>
                  <Pie
                    data={pieDataGastosAnual}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={100}
                    paddingAngle={5}
                    dataKey="value"
                  >
                    {pieDataGastosAnual.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip 
                    formatter={(value: any) => [
                      formatCurrencyConsistent(Number(value), selectedCurrency), 
                      'Monto'
                    ]}
                  />
                </RechartsPieChart>
              </ResponsiveContainer>
            </div>
            <div className="mt-4 space-y-2">
              {pieDataGastosAnual.map((entry, index) => (
                <div key={index} className="flex items-center justify-between text-sm">
                  <div className="flex items-center space-x-2">
                    <div 
                      className="w-3 h-3 rounded-full" 
                      style={{ backgroundColor: entry.color }}
                    />
                    <span>{entry.name}</span>
                  </div>
                   <span className="font-medium">
                     {formatCurrencyConsistent(entry.value, selectedCurrency)}
                   </span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Distribución de Ingresos Anual */}
        <Card className="border-success/20 hover:border-success/40 transition-all duration-300">
          <CardHeader>
            <CardTitle className="text-center">{t('dashboard.income_distribution')}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-80">
              <ResponsiveContainer width="100%" height="100%">
                <RechartsPieChart>
                  <Pie
                    data={pieDataIngresosAnual}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={100}
                    paddingAngle={5}
                    dataKey="value"
                  >
                    {pieDataIngresosAnual.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                   <Tooltip 
                     formatter={(value: any) => [
                       formatCurrencyConsistent(Number(value), selectedCurrency), 
                       'Monto'
                     ]}
                   />
                </RechartsPieChart>
              </ResponsiveContainer>
            </div>
            <div className="mt-4 space-y-2">
              {pieDataIngresosAnual.map((entry, index) => (
                <div key={index} className="flex items-center justify-between text-sm">
                  <div className="flex items-center space-x-2">
                    <div 
                      className="w-3 h-3 rounded-full" 
                      style={{ backgroundColor: entry.color }}
                    />
                    <span>{entry.name}</span>
                  </div>
                    <span className="font-medium">
                      {formatCurrencyConsistent(entry.value, selectedCurrency)}
                    </span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>


    </div>
  );
};