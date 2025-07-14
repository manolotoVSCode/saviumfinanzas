import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { DashboardMetrics } from '@/types/finance';
import { TrendingUp, TrendingDown } from 'lucide-react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart as RechartsPieChart, Pie, Cell, BarChart, Bar } from 'recharts';

interface DashboardProps {
  metrics: DashboardMetrics;
  formatCurrency: (amount: number) => string;
}

export const Dashboard = ({ metrics, formatCurrency }: DashboardProps) => {

  const getBalanceColor = (amount: number) => {
    if (amount > 0) return 'text-success';
    if (amount < 0) return 'text-destructive';
    return 'text-muted-foreground';
  };

  const COLORS = ['hsl(var(--primary))', 'hsl(var(--secondary))', 'hsl(var(--accent))', 'hsl(var(--muted))'];

  // Preparar datos para gráficos
  const pieData = metrics.topCategorias.map((cat, index) => ({
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

  const lineData = metrics.tendenciaMensual.map(mes => ({
    name: mes.mes,
    ingresos: mes.ingresos,
    gastos: mes.gastos,
    balance: mes.ingresos - mes.gastos
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
      {/* PATRIMONIO NETO - Métrica principal */}
      <Card className="hover-scale border-primary/20 hover:border-primary/40 transition-all duration-300 col-span-full">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-lg font-semibold">Patrimonio Neto</CardTitle>
        </CardHeader>
        <CardContent>
          <div className={`text-4xl font-bold ${getBalanceColor(metrics.patrimonioNeto)} mb-2`}>
            {formatCurrency(metrics.patrimonioNeto)}
          </div>
          <div className="flex items-center space-x-2">
            <span className="text-sm text-muted-foreground">Total Activos - Total Pasivos</span>
            <span className={`text-sm font-medium ${
              metrics.variacionPatrimonio >= 0 ? 'text-success' : 'text-destructive'
            }`}>
              {Math.abs(metrics.variacionPatrimonio).toFixed(1)}%
            </span>
          </div>
        </CardContent>
      </Card>

      {/* SCORE DE SALUD FINANCIERA */}
      <Card className="hover-scale border-primary/20 hover:border-primary/40 transition-all duration-300">
        <CardHeader>
          <CardTitle>Salud Financiera</CardTitle>
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

      {/* BALANCE GENERAL - Activos y Pasivos */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* ACTIVOS */}
        <Card className="hover-scale border-success/20 hover:border-success/40 transition-all duration-300">
          <CardHeader>
            <CardTitle className="text-success">
              ACTIVOS (lo que tienes)
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
                  <span className="font-bold text-accent">{formatCurrency(metrics.activos.empresasPrivadas)}</span>
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
              PASIVOS (lo que debes)
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
            </div>
          </CardContent>
        </Card>
      </div>

      {/* MÉTRICAS PRINCIPALES */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
        {/* Resultado del mes */}
        <Card className="hover-scale border-primary/20 hover:border-primary/40 transition-all duration-300">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Resultado del Mes</CardTitle>
          </CardHeader>
          <CardContent>
            <div className={`text-2xl font-bold ${getBalanceColor(metrics.balanceMes)}`}>
              {formatCurrency(metrics.balanceMes)}
            </div>
            <div className="flex items-center space-x-2 text-xs text-muted-foreground mt-1">
              <span>vs mes anterior:</span>
              <span className={`font-medium ${
                (metrics.balanceMes - metrics.balanceMesAnterior) >= 0 ? 'text-success' : 'text-destructive'
              }`}>
                {formatCurrency(metrics.balanceMes - metrics.balanceMesAnterior)}
              </span>
            </div>
          </CardContent>
        </Card>

        {/* Ingresos del mes */}
        <Card className="hover-scale border-success/20 hover:border-success/40 transition-all duration-300">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Ingresos del Mes</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-success">
              {formatCurrency(metrics.ingresosMes)}
            </div>
            <div className="flex items-center space-x-2 text-xs text-muted-foreground mt-1">
              <span className={`${
                metrics.variacionIngresos >= 0 ? 'text-success' : 'text-destructive'
              }`}>
                {metrics.variacionIngresos >= 0 ? '↑' : '↓'} {Math.abs(metrics.variacionIngresos).toFixed(1)}%
              </span>
              <span>vs mes anterior</span>
            </div>
          </CardContent>
        </Card>

        {/* Gastos del mes */}
        <Card className="hover-scale border-destructive/20 hover:border-destructive/40 transition-all duration-300">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Gastos del Mes</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-destructive">
              {formatCurrency(metrics.gastosMes)}
            </div>
            <div className="flex items-center space-x-2 text-xs text-muted-foreground mt-1">
              <span className={`${
                metrics.variacionGastos >= 0 ? 'text-destructive' : 'text-success'
              }`}>
                {metrics.variacionGastos >= 0 ? '↑' : '↓'} {Math.abs(metrics.variacionGastos).toFixed(1)}%
              </span>
              <span>vs mes anterior</span>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* MÉTRICAS ANUALES */}
      <Card className="hover-scale border-accent/20 hover:border-accent/40 transition-all duration-300">
        <CardHeader>
          <CardTitle>Resumen Anual 2025</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="text-center">
              <div className="text-2xl font-bold text-success">{formatCurrency(metrics.ingresosAnio)}</div>
              <div className="text-sm text-muted-foreground">Total Ingresos</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-destructive">{formatCurrency(metrics.gastosAnio)}</div>
              <div className="text-sm text-muted-foreground">Total Gastos</div>
            </div>
            <div className="text-center">
              <div className={`text-2xl font-bold ${getBalanceColor(metrics.balanceAnio)}`}>
                {formatCurrency(metrics.balanceAnio)}
              </div>
              <div className="text-sm text-muted-foreground">Balance Anual</div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* GRÁFICOS */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Distribución de gastos */}
        <Card className="hover-scale border-secondary/20 hover:border-secondary/40 transition-all duration-300">
          <CardHeader>
            <CardTitle>Distribución de Gastos</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-80">
              <ResponsiveContainer width="100%" height="100%">
                <RechartsPieChart>
                  <Pie
                    data={pieData}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={100}
                    paddingAngle={5}
                    dataKey="value"
                  >
                    {pieData.map((entry, index) => (
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
              {pieData.map((entry, index) => (
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
      </div>

      {/* TENDENCIA MENSUAL */}
      <Card className="hover-scale border-primary/20 hover:border-primary/40 transition-all duration-300">
        <CardHeader>
          <CardTitle>Tendencia de los Últimos 6 Meses</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-80">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={lineData}>
                <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
                <XAxis 
                  dataKey="name" 
                  tick={{ fontSize: 12 }}
                  axisLine={false}
                  tickLine={false}
                />
                <YAxis 
                  tick={{ fontSize: 12 }}
                  axisLine={false}
                  tickLine={false}
                  tickFormatter={(value) => `$${(value / 1000).toFixed(0)}k`}
                />
                <Tooltip 
                  contentStyle={{
                    backgroundColor: 'hsl(var(--card))',
                    border: '1px solid hsl(var(--border))',
                    borderRadius: '8px'
                  }}
                  formatter={(value) => formatCurrency(Number(value))}
                />
                <Line 
                  type="monotone" 
                  dataKey="ingresos" 
                  stroke="hsl(var(--success))" 
                  strokeWidth={3}
                  dot={{ fill: 'hsl(var(--success))', strokeWidth: 2, r: 4 }}
                  name="Ingresos"
                />
                <Line 
                  type="monotone" 
                  dataKey="gastos" 
                  stroke="hsl(var(--destructive))" 
                  strokeWidth={3}
                  dot={{ fill: 'hsl(var(--destructive))', strokeWidth: 2, r: 4 }}
                  name="Gastos"
                />
                <Line 
                  type="monotone" 
                  dataKey="balance" 
                  stroke="hsl(var(--primary))" 
                  strokeWidth={3}
                  dot={{ fill: 'hsl(var(--primary))', strokeWidth: 2, r: 4 }}
                  name="Balance"
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};