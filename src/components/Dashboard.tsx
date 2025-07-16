import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Tooltip as UITooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { DashboardMetrics } from '@/types/finance';
import { TrendingUp, TrendingDown, Info } from 'lucide-react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart as RechartsPieChart, Pie, Cell, BarChart, Bar, ComposedChart } from 'recharts';
import { useState } from 'react';

interface DashboardProps {
  metrics: DashboardMetrics;
  formatCurrency: (amount: number) => string;
  currencyCode?: string;
  transactions?: any[]; // Agregamos las transacciones para filtrar
  accounts?: any[]; // Agregamos las cuentas para filtrar
}

export const Dashboard = ({ metrics, formatCurrency, currencyCode = 'MXN', transactions = [], accounts = [] }: DashboardProps) => {
  const [selectedCurrency, setSelectedCurrency] = useState<'MXN' | 'USD' | 'EUR'>('MXN');

  // Función para filtrar métricas por moneda
  const getFilteredMetrics = (currency: 'MXN' | 'USD' | 'EUR') => {
    // Filtrar transacciones por moneda seleccionada
    const filteredTransactions = transactions.filter(t => t.divisa === currency);
    
    // Calcular métricas básicas para la moneda seleccionada
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0);
    const startOfYear = new Date(now.getFullYear(), 0, 1);
    
    const monthTransactions = filteredTransactions.filter(t => 
      new Date(t.fecha) >= startOfMonth && new Date(t.fecha) <= endOfMonth
    );
    const yearTransactions = filteredTransactions.filter(t => 
      new Date(t.fecha) >= startOfYear
    );
    
    const ingresosMes = monthTransactions.filter(t => t.tipo === 'Ingreso').reduce((sum, t) => sum + t.ingreso, 0);
    const gastosMes = monthTransactions.filter(t => t.tipo === 'Gastos').reduce((sum, t) => sum + t.gasto, 0);
    const ingresosAnio = yearTransactions.filter(t => t.tipo === 'Ingreso').reduce((sum, t) => sum + t.ingreso, 0);
    const gastosAnio = yearTransactions.filter(t => t.tipo === 'Gastos').reduce((sum, t) => sum + t.gasto, 0);
    
    // Generar datos de tendencia mensual para la moneda seleccionada
    const tendenciaMensual = [];
    for (let i = 11; i >= 0; i--) {
      const date = new Date();
      date.setMonth(date.getMonth() - i);
      const monthStart = new Date(date.getFullYear(), date.getMonth(), 1);
      const monthEnd = new Date(date.getFullYear(), date.getMonth() + 1, 0);
      
      const monthTrans = filteredTransactions.filter(t => {
        const tDate = new Date(t.fecha);
        return tDate >= monthStart && tDate <= monthEnd;
      });
      
      const ingresos = monthTrans.filter(t => t.tipo === 'Ingreso').reduce((sum, t) => sum + t.ingreso, 0);
      const gastos = monthTrans.filter(t => t.tipo === 'Gastos').reduce((sum, t) => sum + t.gasto, 0);
      
      tendenciaMensual.push({
        mes: date.toLocaleDateString('es-MX', { month: 'short', year: '2-digit' }),
        ingresos,
        gastos
      });
    }
    
    return {
      ingresosMes,
      gastosMes,
      ingresosAnio,
      gastosAnio,
      balanceMes: ingresosMes - gastosMes,
      balanceAnio: ingresosAnio - gastosAnio,
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

  // Preparar datos para gráficos
  const pieDataGastosMesAnterior = metrics.topCategoriasGastosMesAnterior.map((cat, index) => ({
    name: cat.categoria,
    value: Math.abs(cat.monto),
    color: COLORS[index % COLORS.length]
  }));

  const pieDataGastosAnual = metrics.topCategoriasGastosAnual.map((cat, index) => ({
    name: cat.categoria,
    value: Math.abs(cat.monto),
    color: COLORS[index % COLORS.length]
  }));

  const pieDataIngresosMesAnterior = metrics.topCategoriasIngresosMesAnterior.map((cat, index) => ({
    name: cat.categoria,
    value: Math.abs(cat.monto),
    color: COLORS[index % COLORS.length]
  }));

  const pieDataIngresosAnual = metrics.topCategoriasIngresosAnual.map((cat, index) => ({
    name: cat.categoria,
    value: Math.abs(cat.monto),
    color: COLORS[index % COLORS.length]
  }));

  const activosData = metrics.distribucionActivos.map((activo, index) => ({
    name: activo.categoria,
    value: activo.monto,
    porcentaje: activo.porcentaje,
    color: COLORS[index % COLORS.length]
  }));

  const pasivosData = [
    {
      name: 'Tarjetas de Crédito',
      value: metrics.pasivos.tarjetasCredito,
      porcentaje: metrics.pasivos.total > 0 ? (metrics.pasivos.tarjetasCredito / metrics.pasivos.total) * 100 : 0,
      color: COLORS[0]
    },
    {
      name: 'Hipoteca',
      value: metrics.pasivos.hipoteca,
      porcentaje: metrics.pasivos.total > 0 ? (metrics.pasivos.hipoteca / metrics.pasivos.total) * 100 : 0,
      color: COLORS[1]
    }
  ].filter(item => item.value > 0);

  const lineData = metrics.tendenciaMensual.map(mes => ({
    name: mes.mes,
    ingresos: mes.ingresos,
    gastos: mes.gastos,
    balance: mes.ingresos - mes.gastos
  }));

  // Datos para el gráfico de barras de últimos 12 meses
  const barChartData = metrics.tendenciaMensual.map(mes => ({
    mes: mes.mes,
    ingresos: mes.ingresos,
    gastos: Math.abs(mes.gastos) // Convertir a positivo para mejor visualización
  }));

  // Calcular líneas de tendencia usando regresión lineal
  const calculateTrendLine = (data: number[]) => {
    const n = data.length;
    const sumX = data.reduce((sum, _, i) => sum + i, 0);
    const sumY = data.reduce((sum, val) => sum + val, 0);
    const sumXY = data.reduce((sum, val, i) => sum + i * val, 0);
    const sumXX = data.reduce((sum, _, i) => sum + i * i, 0);
    
    const slope = (n * sumXY - sumX * sumY) / (n * sumXX - sumX * sumX);
    const intercept = (sumY - slope * sumX) / n;
    
    return data.map((_, i) => slope * i + intercept);
  };

  const ingresosValues = barChartData.map(d => d.ingresos);
  const gastosValues = barChartData.map(d => d.gastos);
  
  const trendIngresos = calculateTrendLine(ingresosValues);
  const trendGastos = calculateTrendLine(gastosValues);

  // Combinar datos con líneas de tendencia
  const chartDataWithTrend = barChartData.map((data, index) => ({
    ...data,
    tendenciaIngresos: trendIngresos[index],
    tendenciaGastos: trendGastos[index]
  }));

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

  return (
    <div className="space-y-6 animate-fade-in">
      {/* BALANCE GENERAL - Activos y Pasivos */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* ACTIVOS */}
        <Card className="hover-scale border-success/20 hover:border-success/40 transition-all duration-300">
          <CardHeader>
            <CardTitle className="text-success">
              ACTIVOS
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

                const hasAssets = activos.efectivoBancos > 0 || activos.inversiones > 0;
                
                if (!hasAssets) return null;

                return (
                  <div key={moneda} className="space-y-3">
                    {activos.efectivoBancos > 0 && (
                       <div className="p-4 rounded-lg bg-success/5 border border-success/20">
                         <div className="flex justify-between items-center mb-2">
                           <span className="text-sm text-muted-foreground">Efectivo y Bancos <strong>{moneda}</strong></span>
                           <span className="font-bold text-success">{formatNumberOnly(activos.efectivoBancos)}</span>
                        </div>
                        <div className="text-xs text-muted-foreground">
                          Dinero disponible inmediatamente
                        </div>
                      </div>
                    )}
                    
                    {activos.inversiones > 0 && (
                       <div className="p-4 rounded-lg bg-primary/5 border border-primary/20">
                         <div className="flex justify-between items-center mb-2">
                           <span className="text-sm text-muted-foreground">Inversiones <strong>{moneda}</strong></span>
                           <span className="font-bold text-primary">{formatNumberOnly(activos.inversiones)}</span>
                        </div>
                        <div className="text-xs text-muted-foreground">
                          Fondos, acciones y ETFs
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
              
              <div className="p-4 rounded-lg bg-success/10 border-2 border-success/30">
                <div className="flex justify-between items-center">
                  <span className="font-semibold text-success">TOTAL ACTIVOS MXN</span>
                  <span className="text-xl font-bold text-success">{formatCurrency(metrics.activos.total)}</span>
                </div>
              </div>

              {/* Empresas Privadas después del total */}
              {metrics.activos.empresasPrivadas > 0 && (
                 <div className="p-4 rounded-lg bg-accent/5 border border-accent/20">
                   <div className="flex justify-between items-center mb-2">
                     <span className="text-sm text-muted-foreground">Empresas Privadas <strong>MXN</strong></span>
                     <span className="font-bold text-primary">{new Intl.NumberFormat('es-MX', { minimumFractionDigits: 0, maximumFractionDigits: 0 }).format(metrics.activos.empresasPrivadas)}</span>
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
        <Card className="hover-scale border-destructive/20 hover:border-destructive/40 transition-all duration-300">
          <CardHeader>
            <CardTitle className="text-destructive">
              PASIVOS
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {/* Mostrar categorías por moneda */}
              {Object.entries(metrics.pasivosPorMoneda).map(([moneda, pasivos]) => {
                const formatNumberOnly = (amount: number) => {
                  return new Intl.NumberFormat('es-MX', {
                    minimumFractionDigits: 0,
                    maximumFractionDigits: 0,
                  }).format(amount);
                };

                const hasLiabilities = pasivos.tarjetasCredito > 0 || pasivos.hipoteca > 0;
                
                if (!hasLiabilities) return null;

                return (
                  <div key={moneda} className="space-y-3">
                    {pasivos.tarjetasCredito > 0 && (
                       <div className="p-4 rounded-lg bg-destructive/5 border border-destructive/20">
                         <div className="flex justify-between items-center mb-2">
                           <span className="text-sm text-muted-foreground">Tarjetas de Crédito <strong>{moneda}</strong></span>
                           <span className="font-bold text-destructive">{formatNumberOnly(pasivos.tarjetasCredito)}</span>
                        </div>
                        <div className="text-xs text-muted-foreground">
                          Saldo pendiente por pagar
                        </div>
                      </div>
                    )}
                    
                    {pasivos.hipoteca > 0 && (
                       <div className="p-4 rounded-lg bg-destructive/5 border border-destructive/20">
                         <div className="flex justify-between items-center mb-2">
                           <span className="text-sm text-muted-foreground">Hipoteca <strong>{moneda}</strong></span>
                           <span className="font-bold text-destructive">{formatNumberOnly(pasivos.hipoteca)}</span>
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
                  <span className="font-semibold text-destructive">TOTAL PASIVOS <strong>MXN</strong></span>
                  <span className="text-xl font-bold text-destructive">{formatCurrency(metrics.pasivos.total)}</span>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* SCORE DE SALUD FINANCIERA */}
      <Card className="hover-scale border-primary/20 hover:border-primary/40 transition-all duration-300">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            Salud Financiera
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
          <p className="text-sm text-muted-foreground">{metrics.saludFinanciera.descripcion}</p>
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

      {/* RESUMEN MENSUAL */}
      <div className="mb-4">
        <h2 className="text-xl font-semibold text-center">Resumen del Mes <strong>{selectedCurrency}</strong></h2>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
        {/* Resultado del mes */}
        <Card className="hover-scale border-2 border-primary/50 bg-primary/5 transition-all duration-300">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-primary">Resultado del Mes <strong>{selectedCurrency}</strong></CardTitle>
          </CardHeader>
          <CardContent>
            <div className={`text-2xl font-bold ${getBalanceColor(filteredMetrics.balanceMes)}`}>
              {selectedCurrency === 'MXN' ? formatCurrency(filteredMetrics.balanceMes) : 
               `${filteredMetrics.balanceMes.toLocaleString('es-MX', {minimumFractionDigits: 2})} ${selectedCurrency}`}
            </div>
          </CardContent>
        </Card>

        {/* Ingresos del mes */}
        <Card className="hover-scale border-success/20 hover:border-success/40 transition-all duration-300">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Ingresos del Mes <strong>{selectedCurrency}</strong></CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-success">
              {selectedCurrency === 'MXN' ? formatCurrency(filteredMetrics.ingresosMes) : 
               `${filteredMetrics.ingresosMes.toLocaleString('es-MX', {minimumFractionDigits: 2})} ${selectedCurrency}`}
            </div>
          </CardContent>
        </Card>

        {/* Gastos del mes */}
        <Card className="hover-scale border-destructive/20 hover:border-destructive/40 transition-all duration-300">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Gastos del Mes <strong>{selectedCurrency}</strong></CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-destructive">
              {selectedCurrency === 'MXN' ? formatCurrency(filteredMetrics.gastosMes) : 
               `${filteredMetrics.gastosMes.toLocaleString('es-MX', {minimumFractionDigits: 2})} ${selectedCurrency}`}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* DISTRIBUCIÓN DE GASTOS E INGRESOS MENSUAL */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Distribución de Gastos */}
        <Card className="hover-scale border-destructive/20 hover:border-destructive/40 transition-all duration-300">
          <CardHeader>
            <CardTitle className="text-center">Distribución Gastos <strong>{selectedCurrency}</strong></CardTitle>
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
                    formatter={(value: any) => [formatCurrency(Number(value)), 'Monto']}
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
                  <span className="font-medium">{formatCurrency(entry.value)}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Distribución de Ingresos */}
        <Card className="hover-scale border-success/20 hover:border-success/40 transition-all duration-300">
          <CardHeader>
            <CardTitle className="text-center">Distribución Ingresos <strong>{selectedCurrency}</strong></CardTitle>
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
                    formatter={(value: any) => [formatCurrency(Number(value)), 'Monto']}
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
                  <span className="font-medium">{formatCurrency(entry.value)}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* RESUMEN ANUAL */}
      <div className="mb-4">
        <h2 className="text-xl font-semibold text-center">Resumen del Año <strong>{selectedCurrency}</strong></h2>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
        {/* Resultado anual */}
        <Card className="hover-scale border-2 border-primary/50 bg-primary/5 transition-all duration-300">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-primary">Resultado del Año <strong>{selectedCurrency}</strong></CardTitle>
          </CardHeader>
          <CardContent>
            <div className={`text-2xl font-bold ${getBalanceColor(filteredMetrics.balanceAnio)}`}>
              {selectedCurrency === 'MXN' ? formatCurrency(filteredMetrics.balanceAnio) : 
               `${filteredMetrics.balanceAnio.toLocaleString('es-MX', {minimumFractionDigits: 2})} ${selectedCurrency}`}
            </div>
          </CardContent>
        </Card>

        {/* Ingresos anuales */}
        <Card className="hover-scale border-success/20 hover:border-success/40 transition-all duration-300">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Ingresos del Año <strong>{selectedCurrency}</strong></CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-success">
              {selectedCurrency === 'MXN' ? formatCurrency(filteredMetrics.ingresosAnio) : 
               `${filteredMetrics.ingresosAnio.toLocaleString('es-MX', {minimumFractionDigits: 2})} ${selectedCurrency}`}
            </div>
          </CardContent>
        </Card>

        {/* Gastos anuales */}
        <Card className="hover-scale border-destructive/20 hover:border-destructive/40 transition-all duration-300">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Gastos del Año <strong>{selectedCurrency}</strong></CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-destructive">
              {selectedCurrency === 'MXN' ? formatCurrency(filteredMetrics.gastosAnio) : 
               `${filteredMetrics.gastosAnio.toLocaleString('es-MX', {minimumFractionDigits: 2})} ${selectedCurrency}`}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* DISTRIBUCIÓN DE GASTOS E INGRESOS ANUAL */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Distribución de Gastos Anual */}
        <Card className="hover-scale border-destructive/20 hover:border-destructive/40 transition-all duration-300">
          <CardHeader>
            <CardTitle className="text-center">Distribución Gastos <strong>{selectedCurrency}</strong></CardTitle>
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
                       new Intl.NumberFormat('es-MX', { minimumFractionDigits: 0, maximumFractionDigits: 0 }).format(Number(value)), 
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
                   <span className="font-medium">{new Intl.NumberFormat('es-MX', { minimumFractionDigits: 0, maximumFractionDigits: 0 }).format(entry.value)}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Distribución de Ingresos Anual */}
        <Card className="hover-scale border-success/20 hover:border-success/40 transition-all duration-300">
          <CardHeader>
            <CardTitle className="text-center">Distribución Ingresos <strong>{selectedCurrency}</strong></CardTitle>
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
                       new Intl.NumberFormat('es-MX', { minimumFractionDigits: 0, maximumFractionDigits: 0 }).format(Number(value)), 
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
                   <span className="font-medium">{new Intl.NumberFormat('es-MX', { minimumFractionDigits: 0, maximumFractionDigits: 0 }).format(entry.value)}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* GRÁFICOS */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Distribución de activos */}
        <Card className="hover-scale border-success/20 hover:border-success/40 transition-all duration-300">
          <CardHeader>
            <CardTitle>Distribución de Activos <strong>MXN</strong></CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-80">
              <ResponsiveContainer width="100%" height="100%">
                <RechartsPieChart>
                  <Pie
                    data={activosData}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={100}
                    paddingAngle={5}
                    dataKey="value"
                  >
                    {activosData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                   <Tooltip 
                     formatter={(value: any, name: any, props: any) => [
                       new Intl.NumberFormat('es-MX', { minimumFractionDigits: 0, maximumFractionDigits: 0 }).format(Number(value)), 
                       `${props.payload.porcentaje.toFixed(1)}%`
                     ]}
                   />
                </RechartsPieChart>
              </ResponsiveContainer>
            </div>
            <div className="mt-4 space-y-2">
              {activosData.map((entry, index) => (
                <div key={index} className="flex items-center justify-between text-sm">
                  <div className="flex items-center space-x-2">
                    <div 
                      className="w-3 h-3 rounded-full" 
                      style={{ backgroundColor: entry.color }}
                    />
                    <span>{entry.name}</span>
                  </div>
                  <div className="text-right">
                     <div className="font-medium">{new Intl.NumberFormat('es-MX', { minimumFractionDigits: 0, maximumFractionDigits: 0 }).format(entry.value)}</div>
                    <div className="text-xs text-muted-foreground">{entry.porcentaje.toFixed(1)}%</div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Distribución de pasivos */}
        <Card className="hover-scale border-destructive/20 hover:border-destructive/40 transition-all duration-300">
          <CardHeader>
            <CardTitle>Distribución de Pasivos <strong>MXN</strong></CardTitle>
          </CardHeader>
          <CardContent>
            {pasivosData.length > 0 ? (
              <>
                <div className="h-80">
                  <ResponsiveContainer width="100%" height="100%">
                    <RechartsPieChart>
                      <Pie
                        data={pasivosData}
                        cx="50%"
                        cy="50%"
                        innerRadius={60}
                        outerRadius={100}
                        paddingAngle={5}
                        dataKey="value"
                      >
                        {pasivosData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.color} />
                        ))}
                      </Pie>
                       <Tooltip 
                         formatter={(value: any, name: any, props: any) => [
                           new Intl.NumberFormat('es-MX', { minimumFractionDigits: 0, maximumFractionDigits: 0 }).format(Number(value)), 
                           `${props.payload.porcentaje.toFixed(1)}%`
                         ]}
                       />
                    </RechartsPieChart>
                  </ResponsiveContainer>
                </div>
                <div className="mt-4 space-y-2">
                  {pasivosData.map((entry, index) => (
                    <div key={index} className="flex items-center justify-between text-sm">
                      <div className="flex items-center space-x-2">
                        <div 
                          className="w-3 h-3 rounded-full" 
                          style={{ backgroundColor: entry.color }}
                        />
                        <span>{entry.name}</span>
                      </div>
                      <div className="text-right">
                        <div className="font-medium">{new Intl.NumberFormat('es-MX', { minimumFractionDigits: 0, maximumFractionDigits: 0 }).format(entry.value)}</div>
                        <div className="text-xs text-muted-foreground">{entry.porcentaje.toFixed(1)}%</div>
                      </div>
                    </div>
                  ))}
                </div>
              </>
            ) : (
              <div className="h-80 flex items-center justify-center">
                <div className="text-center text-muted-foreground">
                  <p className="text-lg font-medium">🎉 ¡Sin pasivos!</p>
                  <p className="text-sm">No tienes deudas registradas</p>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

    </div>
  );
};