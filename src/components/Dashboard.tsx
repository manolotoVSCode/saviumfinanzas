import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { DashboardMetrics } from '@/types/finance';
import { TrendingUp, TrendingDown, DollarSign, CreditCard, PieChart, BarChart3 } from 'lucide-react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart as RechartsPieChart, Pie, Cell, BarChart, Bar } from 'recharts';

interface DashboardProps {
  metrics: DashboardMetrics;
}

export const Dashboard = ({ metrics }: DashboardProps) => {
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('es-MX', {
      style: 'currency',
      currency: 'MXN'
    }).format(amount);
  };

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

  const lineData = metrics.tendenciaMensual.map(mes => ({
    name: mes.mes,
    ingresos: mes.ingresos,
    gastos: mes.gastos,
    balance: mes.ingresos - mes.gastos
  }));

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Métricas principales */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="hover-scale border-primary/20 hover:border-primary/40 transition-all duration-300">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Balance Total</CardTitle>
            <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center">
              <DollarSign className="h-4 w-4 text-primary" />
            </div>
          </CardHeader>
          <CardContent>
            <div className={`text-2xl font-bold ${getBalanceColor(metrics.balanceTotal)}`}>
              {formatCurrency(metrics.balanceTotal)}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              Total en todas las cuentas
            </p>
          </CardContent>
        </Card>

        <Card className="hover-scale border-success/20 hover:border-success/40 transition-all duration-300">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Ingresos del Mes</CardTitle>
            <div className="h-8 w-8 rounded-full bg-success/10 flex items-center justify-center">
              <TrendingUp className="h-4 w-4 text-success" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-success">
              {formatCurrency(metrics.ingresosMes)}
            </div>
            <div className="flex items-center space-x-2 mt-2">
              <span className="text-xs text-muted-foreground">vs mes anterior:</span>
              <span className={`text-xs font-medium flex items-center ${
                metrics.variacionIngresos >= 0 ? 'text-success' : 'text-destructive'
              }`}>
                {metrics.variacionIngresos >= 0 ? <TrendingUp className="h-3 w-3 mr-1" /> : <TrendingDown className="h-3 w-3 mr-1" />}
                {Math.abs(metrics.variacionIngresos).toFixed(1)}%
              </span>
            </div>
          </CardContent>
        </Card>

        <Card className="hover-scale border-destructive/20 hover:border-destructive/40 transition-all duration-300">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Gastos del Mes</CardTitle>
            <div className="h-8 w-8 rounded-full bg-destructive/10 flex items-center justify-center">
              <TrendingDown className="h-4 w-4 text-destructive" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-destructive">
              {formatCurrency(metrics.gastosMes)}
            </div>
            <div className="flex items-center space-x-2 mt-2">
              <span className="text-xs text-muted-foreground">vs mes anterior:</span>
              <span className={`text-xs font-medium flex items-center ${
                metrics.variacionGastos <= 0 ? 'text-success' : 'text-destructive'
              }`}>
                {metrics.variacionGastos <= 0 ? <TrendingDown className="h-3 w-3 mr-1" /> : <TrendingUp className="h-3 w-3 mr-1" />}
                {Math.abs(metrics.variacionGastos).toFixed(1)}%
              </span>
            </div>
          </CardContent>
        </Card>

        <Card className="hover-scale border-accent/20 hover:border-accent/40 transition-all duration-300">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Balance del Mes</CardTitle>
            <div className="h-8 w-8 rounded-full bg-accent/10 flex items-center justify-center">
              <CreditCard className="h-4 w-4 text-accent" />
            </div>
          </CardHeader>
          <CardContent>
            <div className={`text-2xl font-bold ${getBalanceColor(metrics.balanceMes)}`}>
              {formatCurrency(metrics.balanceMes)}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              {metrics.balanceMes >= 0 ? 'Ahorro' : 'Déficit'} del mes
            </p>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Top Categorías con Gráfico */}
        <Card className="lg:col-span-2">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="flex items-center gap-2">
              <PieChart className="h-5 w-5 text-primary" />
              Distribución de Gastos por Categoría
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="h-[200px]">
                <ResponsiveContainer width="100%" height="100%">
                  <RechartsPieChart>
                    <Pie
                      data={pieData}
                      cx="50%"
                      cy="50%"
                      innerRadius={40}
                      outerRadius={80}
                      paddingAngle={5}
                      dataKey="value"
                    >
                      {pieData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip formatter={(value) => formatCurrency(Number(value))} />
                  </RechartsPieChart>
                </ResponsiveContainer>
              </div>
              <div className="space-y-3">
                {metrics.topCategorias.map((cat, index) => (
                  <div key={index} className="flex items-center justify-between p-3 rounded-lg bg-muted/30 hover:bg-muted/50 transition-colors">
                    <div className="flex items-center space-x-3">
                      <div 
                        className="w-3 h-3 rounded-full" 
                        style={{ backgroundColor: COLORS[index % COLORS.length] }}
                      />
                      <div>
                        <Badge variant="destructive" className="mb-1">
                          Gasto
                        </Badge>
                        <p className="font-medium text-sm">{cat.categoria}</p>
                      </div>
                    </div>
                    <span className="font-bold text-destructive">
                      {formatCurrency(cat.monto)}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Resumen de Cuentas */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <CreditCard className="h-5 w-5 text-accent" />
              Mis Cuentas
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {metrics.cuentasResumen.map((cuenta, index) => (
                <div key={index} className="flex items-center justify-between p-3 rounded-lg bg-muted/30 hover:bg-muted/50 transition-colors">
                  <div className="flex items-center space-x-3">
                    <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center">
                      <DollarSign className="h-4 w-4 text-primary" />
                    </div>
                    <div>
                      <Badge variant="outline" className="mb-1">{cuenta.tipo}</Badge>
                      <p className="font-medium text-sm">{cuenta.cuenta}</p>
                    </div>
                  </div>
                  <span className={`font-bold ${getBalanceColor(cuenta.saldo)}`}>
                    {formatCurrency(cuenta.saldo)}
                  </span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Tendencia Mensual con Gráfico */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <BarChart3 className="h-5 w-5 text-primary" />
            Tendencia de los Últimos 6 Meses
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-[300px] mb-6">
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
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-6">
            {metrics.tendenciaMensual.slice(-3).map((mes, index) => (
              <div key={index} className="p-4 rounded-lg bg-muted/30">
                <h4 className="font-semibold text-center mb-3">{mes.mes}</h4>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Ingresos:</span>
                    <span className="text-success font-medium">{formatCurrency(mes.ingresos)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Gastos:</span>
                    <span className="text-destructive font-medium">{formatCurrency(mes.gastos)}</span>
                  </div>
                  <div className="flex justify-between border-t pt-2">
                    <span className="text-muted-foreground">Balance:</span>
                    <span className={`font-bold ${getBalanceColor(mes.ingresos - mes.gastos)}`}>
                      {formatCurrency(mes.ingresos - mes.gastos)}
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};