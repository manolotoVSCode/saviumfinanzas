import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Tooltip as UITooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { DashboardMetrics } from '@/types/finance';
import { TrendingUp, TrendingDown, Info } from 'lucide-react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart as RechartsPieChart, Pie, Cell, BarChart, Bar, ComposedChart } from 'recharts';
import { useState } from 'react';
import { useLanguage } from '@/contexts/LanguageContext';


interface DashboardProps {
  metrics: DashboardMetrics;
  formatCurrency: (amount: number) => string;
  currencyCode?: string;
  transactions?: any[]; // Agregamos las transacciones para filtrar
  accounts?: any[]; // Agregamos las cuentas para filtrar
}

export const Dashboard = ({ metrics, formatCurrency, currencyCode = 'MXN', transactions = [], accounts = [] }: DashboardProps) => {
  const [selectedCurrency, setSelectedCurrency] = useState<'MXN' | 'USD' | 'EUR'>('MXN');
  const { t } = useLanguage();

  // Función para filtrar métricas por moneda
  const getFilteredMetrics = (currency: 'MXN' | 'USD' | 'EUR') => {
    // Filtrar transacciones por moneda seleccionada
    const filteredTransactions = transactions.filter(t => t.divisa === currency);
    
    console.log("=== DEBUG DASHBOARD TRANSACTIONS ===");
    console.log("Currency:", currency);
    console.log("Total transactions:", filteredTransactions.length);
    console.log("Sample transaction:", filteredTransactions[0]);
    console.log("Transaction types:", [...new Set(filteredTransactions.map(t => t.tipo))]);
    console.log("Has ingreso field:", filteredTransactions.some(t => t.ingreso !== undefined));
    console.log("Has gasto field:", filteredTransactions.some(t => t.gasto !== undefined));
    
    // Debug para agosto 2025 específicamente
    const agostoTransactions = filteredTransactions.filter(t => {
      const tDate = new Date(t.fecha);
      return tDate.getMonth() === 7 && tDate.getFullYear() === 2025; // Agosto = mes 7
    });
    
    console.log("=== AGOSTO 2025 TRANSACTIONS ===");
    console.log("Total agosto:", agostoTransactions.length);
    
    const ingresosAgosto = agostoTransactions.filter(t => t.tipo === 'Ingreso');
    const gastosAgosto = agostoTransactions.filter(t => t.tipo === 'Gastos');
    
    console.log("Ingresos agosto:", ingresosAgosto.length);
    console.log("Gastos agosto:", gastosAgosto.length);
    
    const sumaIngresos = ingresosAgosto.reduce((sum, t) => sum + t.ingreso, 0);
    const sumaGastos = gastosAgosto.reduce((sum, t) => sum + t.gasto, 0);
    
    console.log("Suma ingresos agosto:", sumaIngresos);
    console.log("Suma gastos agosto:", sumaGastos);
    console.log("Sample ingreso transaction:", ingresosAgosto[0]);
    console.log("Sample gasto transaction:", gastosAgosto[0]);
    
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
      const adjustedDate = new Date(t.fecha.getTime() + t.fecha.getTimezoneOffset() * 60000);
      return adjustedDate >= startOfLastMonth && adjustedDate <= endOfLastMonth;
    });
    
    // Transacciones de dos meses atrás
    const twoMonthsAgoTransactions = filteredTransactions.filter(t => {
      const adjustedDate = new Date(t.fecha.getTime() + t.fecha.getTimezoneOffset() * 60000);
      return adjustedDate >= startOfTwoMonthsAgo && adjustedDate <= endOfTwoMonthsAgo;
    });
    
    // Transacciones del año actual
    const yearTransactions = filteredTransactions.filter(t => {
      const adjustedDate = new Date(t.fecha.getTime() + t.fecha.getTimezoneOffset() * 60000);
      return adjustedDate >= startOfYear;
    });
    
    // Transacciones del año anterior
    const lastYearTransactions = filteredTransactions.filter(t => {
      const adjustedDate = new Date(t.fecha.getTime() + t.fecha.getTimezoneOffset() * 60000);
      return adjustedDate >= startOfLastYear && adjustedDate <= endOfLastYear;
    });
    
    // Cálculos del mes anterior (excluyendo aportaciones de ingresos y retiros de gastos)
    const ingresosMes = lastMonthTransactions
      .filter(t => t.tipo === 'Ingreso')
      .reduce((sum, t) => sum + t.ingreso, 0);
    const gastosMes = lastMonthTransactions
      .filter(t => t.tipo === 'Gastos')
      .reduce((sum, t) => sum + t.gasto, 0);
    
    // Cálculos de dos meses atrás (para comparativo - excluyendo aportaciones y retiros)
    const ingresosMesAnterior = twoMonthsAgoTransactions
      .filter(t => t.tipo === 'Ingreso')
      .reduce((sum, t) => sum + t.ingreso, 0);
    const gastosMesAnterior = twoMonthsAgoTransactions
      .filter(t => t.tipo === 'Gastos')
      .reduce((sum, t) => sum + t.gasto, 0);
    
    // Cálculos del año actual (excluyendo aportaciones de ingresos y retiros de gastos)
    const ingresosAnio = yearTransactions
      .filter(t => t.tipo === 'Ingreso')
      .reduce((sum, t) => sum + t.ingreso, 0);
    const gastosAnio = yearTransactions
      .filter(t => t.tipo === 'Gastos')
      .reduce((sum, t) => sum + t.gasto, 0);
    
    // Cálculos del año anterior (para comparativo - excluyendo aportaciones y retiros)
    const ingresosAnioAnterior = lastYearTransactions
      .filter(t => t.tipo === 'Ingreso')
      .reduce((sum, t) => sum + t.ingreso, 0);
    const gastosAnioAnterior = lastYearTransactions
      .filter(t => t.tipo === 'Gastos')
      .reduce((sum, t) => sum + t.gasto, 0);
    
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
      
      const ingresos = monthTrans
        .filter(t => t.tipo === 'Ingreso')
        .reduce((sum, t) => sum + t.ingreso, 0);
      const gastos = Math.abs(monthTrans
        .filter(t => t.tipo === 'Gastos')
        .reduce((sum, t) => sum + t.gasto, 0));
      
      // Crear etiqueta del mes de forma más consistente
      const monthNames = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'];
      const mesLabel = `${monthNames[targetDate.getMonth()]} ${targetDate.getFullYear().toString().slice(-2)}`;
      
      tendenciaMensual.push({
        mes: mesLabel,
        ingresos,
        gastos,
        balance: ingresos - gastos
      });
    }
    
    return {
      // Datos del mes anterior (resumen del mes)
      ingresosMes,
      gastosMes,
      balanceMes: ingresosMes - gastosMes,
      
      // Datos del año actual (resumen del año)
      ingresosAnio,
      gastosAnio,
      balanceAnio: ingresosAnio - gastosAnio,
      
      // Comparativos
      cambioIngresosMes: ingresosMesAnterior > 0 ? ((ingresosMes - ingresosMesAnterior) / ingresosMesAnterior) * 100 : 0,
      cambioGastosMes: gastosMesAnterior > 0 ? ((gastosMes - gastosMesAnterior) / gastosMesAnterior) * 100 : 0,
      cambioIngresosAnio: ingresosAnioAnterior > 0 ? ((ingresosAnio - ingresosAnioAnterior) / ingresosAnioAnterior) * 100 : 0,
      cambioGastosAnio: gastosAnioAnterior > 0 ? ((gastosAnio - gastosAnioAnterior) / gastosAnioAnterior) * 100 : 0,
      
      // Comparativos de balance
      balanceMesAnterior: ingresosMesAnterior - gastosMesAnterior,
      balanceAnioAnterior: ingresosAnioAnterior - gastosAnioAnterior,
      
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
              {/* Mostrar categorías por moneda - solo Efectivo/Bancos e Inversiones */}
              {Object.entries(metrics.activosPorMoneda).map(([moneda, activos]) => {
                const formatNumberOnly = (amount: number) => {
                  return new Intl.NumberFormat('es-MX', {
                    minimumFractionDigits: 0,
                    maximumFractionDigits: 0,
                  }).format(amount);
                };

                const hasAssets = activos.efectivoBancos > 0 || activos.inversiones > 0 || activos.bienRaiz > 0;
                
                if (!hasAssets) return null;

                return (
                   <div key={moneda} className="space-y-3">
                     {activos.efectivoBancos > 0 && (
                        <div className="p-4 rounded-lg bg-success/5 border border-success/20">
                          <div className="flex justify-between items-center mb-2">
                             <span className="text-sm text-muted-foreground">{t('dashboard.cash_banks')}</span>
                             <span className="font-bold text-success">{formatNumberOnly(activos.efectivoBancos)} {moneda}</span>
                          </div>
                          <div className="text-xs text-muted-foreground">
                            {t('dashboard.available_immediately')}
                          </div>
                       </div>
                     )}
                     
                     {activos.inversiones > 0 && (
                        <div className="p-4 rounded-lg bg-primary/5 border border-primary/20">
                          <div className="flex justify-between items-center mb-2">
                             <span className="text-sm text-muted-foreground">{t('dashboard.investments_label')}</span>
                             <span className="font-bold text-primary">{formatNumberOnly(activos.inversiones)} {moneda}</span>
                          </div>
                          <div className="text-xs text-muted-foreground">
                            {t('dashboard.funds_stocks_etfs')}
                          </div>
                       </div>
                      )}
                      
                      {activos.bienRaiz > 0 && (
                         <div className="p-4 rounded-lg bg-warning/5 border border-warning/20">
                           <div className="flex justify-between items-center mb-2">
                              <span className="text-sm text-muted-foreground">Bienes Raíces</span>
                              <span className="font-bold text-warning">{formatNumberOnly(activos.bienRaiz)} {moneda}</span>
                           </div>
                           <div className="text-xs text-muted-foreground">
                             Propiedades y terrenos
                           </div>
                        </div>
                      )}
                      
                    </div>
                );
              })}
              
              <div className="p-4 rounded-lg bg-success/10 border-2 border-success/30">
                <div className="flex justify-between items-center">
                    <span className="font-semibold text-success">{t('dashboard.total_assets')}</span>
                    <span className="text-xl font-bold text-success">{formatCurrencyTotals(metrics.activos.total, 'MXN')}</span>
                </div>
              </div>

              {/* Empresas Privadas después del total */}
              {metrics.activos.empresasPrivadas > 0 && (
                 <div className="p-4 rounded-lg bg-accent/5 border border-accent/20">
                   <div className="flex justify-between items-center mb-2">
                      <span className="text-sm text-muted-foreground">Empresas Privadas</span>
                      <span className="font-bold text-primary">{new Intl.NumberFormat('es-MX', { minimumFractionDigits: 0, maximumFractionDigits: 0 }).format(metrics.activos.empresasPrivadas)} MXN</span>
                  </div>
                  <div className="text-xs text-muted-foreground">
                    Participaciones en empresas propias
                  </div>
                </div>
              )}
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
               {/* Mostrar categorías por moneda - separando cada cuenta */}
               {Object.entries(metrics.pasivosPorMoneda).map(([moneda, pasivos]) => {
                 const formatNumberOnly = (amount: number) => {
                   return new Intl.NumberFormat('es-MX', {
                     minimumFractionDigits: 0,
                     maximumFractionDigits: 0,
                   }).format(amount);
                 };

                 // Filtrar cuentas de tarjetas de crédito por moneda
                 const tarjetasCredito = accounts.filter(cuenta => 
                   cuenta.tipo === 'Tarjeta de Crédito' && cuenta.divisa === moneda
                 );

                 const hasLiabilities = tarjetasCredito.length > 0 || pasivos.hipoteca > 0;
                 
                 if (!hasLiabilities) return null;

                 return (
                   <div key={moneda} className="space-y-3">
                     {/* Mostrar cada tarjeta de crédito por separado */}
                     {tarjetasCredito.map(cuenta => (
                        <div key={cuenta.id} className="p-4 rounded-lg bg-destructive/5 border border-destructive/20">
                           <div className="flex justify-between items-center mb-2">
                              <span className="text-sm text-muted-foreground">{cuenta.nombre}</span>
                              <span className="font-bold text-destructive">{formatNumberOnly(Math.abs(cuenta.saldoActual))} {moneda}</span>
                          </div>
                         <div className="text-xs text-muted-foreground">
                           Tarjeta de Crédito
                         </div>
                       </div>
                     ))}
                    
                    {pasivos.hipoteca > 0 && (
                       <div className="p-4 rounded-lg bg-destructive/5 border border-destructive/20">
                         <div className="flex justify-between items-center mb-2">
                            <span className="text-sm text-muted-foreground">Hipoteca</span>
                            <span className="font-bold text-destructive">{formatNumberOnly(pasivos.hipoteca)} {moneda}</span>
                        </div>
                        <div className="text-xs text-muted-foreground">
                          Saldo pendiente del préstamo hipotecario
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
              
              <div className="p-4 rounded-lg bg-destructive/10 border-2 border-destructive/30">
                <div className="flex justify-between items-center">
                    <span className="font-semibold text-destructive">{t('dashboard.total_liabilities')}</span>
                    <span className="text-xl font-bold text-destructive">{formatCurrencyTotals(metrics.pasivos.total, 'MXN')}</span>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* SCORE DE SALUD FINANCIERA */}
      <Card className="border-primary/20 hover:border-primary/40 transition-all duration-300">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            {t('dashboard.financial_health')}
            <TooltipProvider>
              <UITooltip>
                <TooltipTrigger>
                  <Info className="h-4 w-4 text-muted-foreground hover:text-primary cursor-help" />
                </TooltipTrigger>
                <TooltipContent className="max-w-sm p-3">
                  <div className="space-y-2 text-xs">
                    <p><strong>Cálculo del Score:</strong></p>
                    <p>• Ratio de Deuda = Pasivos / Activos</p>
                    <p>• Balance mensual = Ingresos - Gastos</p>
                    <p>• Se reduce según nivel de deuda y capacidad de ahorro</p>
                  </div>
                </TooltipContent>
              </UITooltip>
            </TooltipProvider>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between mb-4">
            <span className={`text-4xl font-bold ${getSaludColor(metrics.saludFinanciera.nivel)}`}>
              {metrics.saludFinanciera.score}
            </span>
            <Badge variant={metrics.saludFinanciera.nivel === 'Excelente' ? 'default' : 
                            metrics.saludFinanciera.nivel === 'Buena' ? 'secondary' : 'destructive'}>
              {metrics.saludFinanciera.nivel}
            </Badge>
          </div>
          <p className="text-sm text-muted-foreground mb-4">{metrics.saludFinanciera.descripcion}</p>
          
          {/* Consejo financiero */}
          <div className="mt-4 p-3 bg-primary/5 border border-primary/20 rounded-lg">
            <h4 className="text-sm font-semibold text-primary mb-2">💡 {t('dashboard.advice_title')}</h4>
            <p className="text-xs text-muted-foreground">
              {getFinancialAdvice(metrics.saludFinanciera.nivel, metrics.saludFinanciera.score)}
            </p>
          </div>
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