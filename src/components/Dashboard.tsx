import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tooltip as UITooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { DashboardMetrics } from '@/types/finance';
import { TrendingUp, TrendingDown, Info } from 'lucide-react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart as RechartsPieChart, Pie, Cell, BarChart, Bar, ComposedChart } from 'recharts';

interface DashboardProps {
  metrics: DashboardMetrics;
  formatCurrency: (amount: number) => string;
  currencyCode?: string;
}

export const Dashboard = ({ metrics, formatCurrency, currencyCode = 'MXN' }: DashboardProps) => {

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
  const pieDataMesAnterior = metrics.topCategoriasMesAnterior.map((cat, index) => ({
    name: cat.categoria,
    value: Math.abs(cat.monto),
    color: COLORS[index % COLORS.length]
  }));

  const pieDataAnual = metrics.topCategoriasAnual.map((cat, index) => ({
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
              ACTIVOS (lo que tienes) - {currencyCode}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="p-4 rounded-lg bg-success/5 border border-success/20">
                <div className="flex justify-between items-center mb-2">
                  <span className="text-sm text-muted-foreground">Efectivo y Bancos</span>
                  <span className="font-bold text-success">{formatCurrency(metrics.activos.efectivoBancos)}</span>
                </div>
                <div className="text-xs text-muted-foreground">
                  Dinero disponible inmediatamente
                </div>
              </div>
              
               <div className="p-4 rounded-lg bg-primary/5 border border-primary/20">
                <div className="flex justify-between items-center mb-2">
                  <span className="text-sm text-muted-foreground">Inversiones</span>
                  <span className="font-bold text-primary">{formatCurrency(metrics.activos.inversiones)}</span>
                </div>
                <div className="text-xs text-muted-foreground">
                  Fondos, acciones y ETFs
                </div>
              </div>
              
              <div className="p-4 rounded-lg bg-accent/5 border border-accent/20">
                <div className="flex justify-between items-center mb-2">
                  <span className="text-sm text-muted-foreground">Empresas Privadas</span>
                  <span className="font-bold text-primary">{formatCurrency(metrics.activos.empresasPrivadas)}</span>
                </div>
                <div className="text-xs text-muted-foreground">
                  Participaciones en empresas propias
                </div>
              </div>
              
              <div className="p-4 rounded-lg bg-success/10 border-2 border-success/30">
                <div className="flex justify-between items-center">
                  <span className="font-semibold text-success">TOTAL ACTIVOS</span>
                  <span className="text-xl font-bold text-success">{formatCurrency(metrics.activos.total)}</span>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* PASIVOS */}
        <Card className="hover-scale border-destructive/20 hover:border-destructive/40 transition-all duration-300">
          <CardHeader>
            <CardTitle className="text-destructive">
              PASIVOS (lo que debes) - {currencyCode}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="p-4 rounded-lg bg-destructive/5 border border-destructive/20">
                <div className="flex justify-between items-center mb-2">
                  <span className="text-sm text-muted-foreground">Tarjetas de Crédito</span>
                  <span className="font-bold text-destructive">{formatCurrency(metrics.pasivos.tarjetasCredito)}</span>
                </div>
                <div className="text-xs text-muted-foreground">
                  Saldo pendiente por pagar
                </div>
              </div>
              
              <div className="p-4 rounded-lg bg-destructive/5 border border-destructive/20">
                <div className="flex justify-between items-center mb-2">
                  <span className="text-sm text-muted-foreground">Hipoteca</span>
                  <span className="font-bold text-destructive">{formatCurrency(metrics.pasivos.hipoteca)}</span>
                </div>
                <div className="text-xs text-muted-foreground">
                  Saldo pendiente del préstamo hipotecario
                </div>
              </div>
              
              <div className="p-4 rounded-lg bg-destructive/10 border-2 border-destructive/30">
                <div className="flex justify-between items-center">
                  <span className="font-semibold text-destructive">TOTAL PASIVOS</span>
                  <span className="text-xl font-bold text-destructive">{formatCurrency(metrics.pasivos.total)}</span>
                </div>
              </div>

              {/* PATRIMONIO NETO CALCULADO */}
              <div className="p-4 rounded-lg bg-primary/10 border-2 border-primary/30 mt-4">
                <div className="flex justify-between items-center">
                  <span className="font-semibold text-primary">PATRIMONIO NETO</span>
                  <span className={`text-xl font-bold ${getBalanceColor(metrics.patrimonioNeto)}`}>
                    {formatCurrency(metrics.patrimonioNeto)}
                  </span>
                </div>
                <div className="text-xs text-muted-foreground mt-1">
                  Activos - Pasivos = Patrimonio neto
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* GRÁFICO DE BARRAS CON LÍNEAS DE TENDENCIA - INGRESOS VS GASTOS ÚLTIMOS 12 MESES */}
      <Card className="hover-scale border-primary/20 hover:border-primary/40 transition-all duration-300">
        <CardHeader>
          <CardTitle>Ingresos vs Gastos - Últimos 12 Meses ({currencyCode})</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-80">
            <ResponsiveContainer width="100%" height="100%">
              <ComposedChart data={chartDataWithTrend} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
                <XAxis 
                  dataKey="mes" 
                  tick={{ fontSize: 12 }}
                  axisLine={false}
                  tickLine={false}
                />
                <YAxis 
                  tick={{ fontSize: 12 }}
                  axisLine={false}
                  tickLine={false}
                  tickFormatter={(value) => `${currencyCode} ${(value / 1000).toFixed(0)}k`}
                />
                <Tooltip 
                  contentStyle={{
                    backgroundColor: 'hsl(var(--card))',
                    border: '1px solid hsl(var(--border))',
                    borderRadius: '8px'
                  }}
                  formatter={(value, name) => [
                    formatCurrency(Number(value)), 
                    name === 'ingresos' ? 'Ingresos' : name === 'gastos' ? 'Gastos' : name === 'tendenciaIngresos' ? 'Tendencia Ingresos' : 'Tendencia Gastos'
                  ]}
                />
                <Bar 
                  dataKey="ingresos" 
                  fill="hsl(var(--success))" 
                  radius={[4, 4, 0, 0]}
                  name="ingresos"
                />
                <Bar 
                  dataKey="gastos" 
                  fill="hsl(var(--destructive))" 
                  radius={[4, 4, 0, 0]}
                  name="gastos"
                />
                <Line 
                  type="monotone" 
                  dataKey="ingresos" 
                  stroke="hsl(var(--success))" 
                  strokeWidth={2}
                  dot={false}
                  name="tendenciaIngresos"
                />
                <Line 
                  type="monotone" 
                  dataKey="gastos" 
                  stroke="hsl(var(--destructive))" 
                  strokeWidth={2}
                  dot={false}
                  name="tendenciaGastos"
                />
              </ComposedChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>

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
                    <p>• Ratio de Ahorro = (Ingresos - Gastos) / Ingresos</p>
                    <p>• Score inicial: 10 puntos</p>
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

      {/* RESUMEN MENSUAL - MES ANTERIOR */}
      <div className="mb-4">
        <h2 className="text-xl font-semibold text-center">Resumen Junio</h2>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
        {/* Resultado del mes */}
         <Card className="hover-scale border-2 border-primary/50 bg-primary/5 transition-all duration-300">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-primary">Resultado del Mes Anterior</CardTitle>
          </CardHeader>
          <CardContent>
            <div className={`text-2xl font-bold ${getBalanceColor(metrics.balanceMesAnterior)}`}>
              {formatCurrency(metrics.balanceMesAnterior)}
            </div>
            <div className="flex items-center space-x-2 text-xs text-muted-foreground mt-1">
              <span>vs mes actual:</span>
              <div className="flex items-center space-x-1">
                {metrics.balanceMes >= metrics.balanceMesAnterior ? (
                  <TrendingUp className="h-3 w-3 text-success" />
                ) : (
                  <TrendingDown className="h-3 w-3 text-destructive" />
                )}
                <span className={`font-medium ${
                  metrics.balanceMes >= metrics.balanceMesAnterior ? 'text-success' : 'text-destructive'
                }`}>
                  {Math.abs(((metrics.balanceMes - metrics.balanceMesAnterior) / Math.abs(metrics.balanceMesAnterior || 1)) * 100).toFixed(1)}%
                </span>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Ingresos del mes */}
        <Card className="hover-scale border-success/20 hover:border-success/40 transition-all duration-300">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Ingresos del Mes Anterior</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-success">
              {formatCurrency(metrics.ingresosMesAnterior)}
            </div>
            <div className="flex items-center space-x-2 text-xs text-muted-foreground mt-1">
              <span>vs mes actual:</span>
              <div className="flex items-center space-x-1">
                {metrics.variacionIngresosMes >= 0 ? (
                  <TrendingUp className="h-3 w-3 text-success" />
                ) : (
                  <TrendingDown className="h-3 w-3 text-destructive" />
                )}
                <span className={`font-medium ${
                  metrics.variacionIngresosMes >= 0 ? 'text-success' : 'text-destructive'
                }`}>
                  {Math.abs(metrics.variacionIngresosMes).toFixed(1)}%
                </span>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Gastos del mes */}
        <Card className="hover-scale border-destructive/20 hover:border-destructive/40 transition-all duration-300">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Gastos del Mes Anterior</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-destructive">
              {formatCurrency(metrics.gastosMesAnterior)}
            </div>
            <div className="flex items-center space-x-2 text-xs text-muted-foreground mt-1">
              <span>vs mes actual:</span>
              <div className="flex items-center space-x-1">
                {metrics.variacionGastosMes <= 0 ? (
                  <TrendingDown className="h-3 w-3 text-success" />
                ) : (
                  <TrendingUp className="h-3 w-3 text-destructive" />
                )}
                <span className={`font-medium ${
                  metrics.variacionGastosMes <= 0 ? 'text-success' : 'text-destructive'
                }`}>
                  {Math.abs(metrics.variacionGastosMes).toFixed(1)}%
                </span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* DISTRIBUCIÓN DE GASTOS MENSUAL - MES ANTERIOR */}
      <Card className="hover-scale border-secondary/20 hover:border-secondary/40 transition-all duration-300">
        <CardHeader>
          <CardTitle className="text-center">Distribución Gastos</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-80">
            <ResponsiveContainer width="100%" height="100%">
              <RechartsPieChart>
                <Pie
                  data={pieDataMesAnterior}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={100}
                  paddingAngle={5}
                  dataKey="value"
                >
                  {pieDataMesAnterior.map((entry, index) => (
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
            {pieDataMesAnterior.map((entry, index) => (
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

      {/* RESUMEN ANUAL */}
      <div className="mb-4">
        <h2 className="text-xl font-semibold text-center">Resumen 2025</h2>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
        {/* Resultado anual */}
        <Card className="hover-scale border-2 border-primary/50 bg-primary/5 transition-all duration-300">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-primary">Resultado 2025</CardTitle>
          </CardHeader>
          <CardContent>
            <div className={`text-2xl font-bold ${getBalanceColor(metrics.balanceAnio)}`}>
              {formatCurrency(metrics.balanceAnio)}
            </div>
            <div className="flex items-center space-x-2 text-xs text-muted-foreground mt-1">
              <span>vs año anterior:</span>
              <div className="flex items-center space-x-1">
                {metrics.variacionBalanceAnual >= 0 ? (
                  <TrendingUp className="h-3 w-3 text-success" />
                ) : (
                  <TrendingDown className="h-3 w-3 text-destructive" />
                )}
                <span className={`font-medium ${
                  metrics.variacionBalanceAnual >= 0 ? 'text-success' : 'text-destructive'
                }`}>
                  {Math.abs(metrics.variacionBalanceAnual).toFixed(1)}%
                </span>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Ingresos anuales */}
        <Card className="hover-scale border-success/20 hover:border-success/40 transition-all duration-300">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Ingresos 2025</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-success">
              {formatCurrency(metrics.ingresosAnio)}
            </div>
            <div className="flex items-center space-x-2 text-xs text-muted-foreground mt-1">
              <span>vs año anterior:</span>
              <div className="flex items-center space-x-1">
                {metrics.variacionIngresosAnual >= 0 ? (
                  <TrendingUp className="h-3 w-3 text-success" />
                ) : (
                  <TrendingDown className="h-3 w-3 text-destructive" />
                )}
                <span className={`font-medium ${
                  metrics.variacionIngresosAnual >= 0 ? 'text-success' : 'text-destructive'
                }`}>
                  {Math.abs(metrics.variacionIngresosAnual).toFixed(1)}%
                </span>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Gastos anuales */}
        <Card className="hover-scale border-destructive/20 hover:border-destructive/40 transition-all duration-300">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Gastos 2025</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-destructive">
              {formatCurrency(metrics.gastosAnio)}
            </div>
            <div className="flex items-center space-x-2 text-xs text-muted-foreground mt-1">
              <span>vs año anterior:</span>
              <div className="flex items-center space-x-1">
                {metrics.variacionGastosAnual <= 0 ? (
                  <TrendingDown className="h-3 w-3 text-success" />
                ) : (
                  <TrendingUp className="h-3 w-3 text-destructive" />
                )}
                <span className={`font-medium ${
                  metrics.variacionGastosAnual <= 0 ? 'text-success' : 'text-destructive'
                }`}>
                  {Math.abs(metrics.variacionGastosAnual).toFixed(1)}%
                </span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* DISTRIBUCIÓN DE GASTOS ANUAL */}
      <Card className="hover-scale border-secondary/20 hover:border-secondary/40 transition-all duration-300">
        <CardHeader>
          <CardTitle className="text-center">Distribución Gastos</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-80">
            <ResponsiveContainer width="100%" height="100%">
              <RechartsPieChart>
                <Pie
                  data={pieDataAnual}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={100}
                  paddingAngle={5}
                  dataKey="value"
                >
                  {pieDataAnual.map((entry, index) => (
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
            {pieDataAnual.map((entry, index) => (
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

      {/* GRÁFICOS */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Distribución de activos */}
        <Card className="hover-scale border-success/20 hover:border-success/40 transition-all duration-300">
          <CardHeader>
            <CardTitle>Distribución de Activos</CardTitle>
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
                      formatCurrency(Number(value)), 
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
                    <div className="font-medium">{formatCurrency(entry.value)}</div>
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
            <CardTitle>Distribución de Pasivos</CardTitle>
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
                          formatCurrency(Number(value)), 
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
                        <div className="font-medium">{formatCurrency(entry.value)}</div>
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