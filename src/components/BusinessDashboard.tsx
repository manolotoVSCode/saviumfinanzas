import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tooltip as UITooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { useBusinessDashboard, PeriodFilter, BusinessDashboardMetrics } from '@/hooks/useBusinessDashboard';
import { useAppConfig } from '@/hooks/useAppConfig';
import { 
  Banknote, 
  TrendingUp, 
  TrendingDown, 
  Receipt, 
  FileText, 
  Clock, 
  AlertTriangle,
  CheckCircle,
  XCircle,
  Calendar,
  PieChart,
  BarChart3,
  Info,
  RefreshCw
} from 'lucide-react';
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer, 
  PieChart as RechartsPieChart, 
  Pie, 
  Cell,
  ComposedChart,
  Line,
  Legend
} from 'recharts';

const COLORS = ['#10b981', '#3b82f6', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899', '#06b6d4', '#84cc16'];

const AGING_COLORS: Record<string, string> = {
  '0-30': '#10b981', // green
  '1-30': '#f59e0b', // yellow
  '31-60': '#f97316', // orange
  '61-90': '#ef4444', // red
  '+90': '#991b1b', // dark red
  'vigente': '#10b981',
  '1-30 vencido': '#f59e0b',
  '31-60 vencido': '#f97316',
  '+60 vencido': '#ef4444',
};

interface StatusBadgeProps {
  value: number;
  thresholds: { green: number; yellow: number };
  inverse?: boolean;
}

const StatusBadge = ({ value, thresholds, inverse = false }: StatusBadgeProps) => {
  let color: 'default' | 'destructive' | 'secondary' = 'default';
  let Icon = CheckCircle;
  
  const isGreen = inverse ? value <= thresholds.green : value >= thresholds.green;
  const isYellow = inverse 
    ? value > thresholds.green && value <= thresholds.yellow 
    : value >= thresholds.yellow && value < thresholds.green;
  
  if (isGreen) {
    color = 'default';
    Icon = CheckCircle;
  } else if (isYellow) {
    color = 'secondary';
    Icon = AlertTriangle;
  } else {
    color = 'destructive';
    Icon = XCircle;
  }
  
  return (
    <Badge variant={color} className="ml-2">
      <Icon className="h-3 w-3 mr-1" />
      {value.toFixed(1)}%
    </Badge>
  );
};

export const BusinessDashboard = () => {
  const [period, setPeriod] = useState<PeriodFilter>('month');
  const { metrics, loading, error, refetch, dateRange } = useBusinessDashboard({ period });
  const { formatCurrency, config } = useAppConfig();

  if (loading) {
    return (
      <div className="animate-fade-in flex items-center justify-center h-64">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p>Cargando datos empresariales...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center py-12">
        <AlertTriangle className="h-12 w-12 text-destructive mx-auto mb-4" />
        <p className="text-destructive">{error}</p>
        <Button onClick={refetch} variant="outline" className="mt-4">
          <RefreshCw className="h-4 w-4 mr-2" />
          Reintentar
        </Button>
      </div>
    );
  }

  if (!metrics) {
    return (
      <div className="text-center py-12">
        <p className="text-muted-foreground">No hay datos disponibles</p>
      </div>
    );
  }

  const agingData = Object.entries(metrics.cxc_aging || {}).map(([bucket, total]) => ({
    name: bucket,
    value: Number(total),
    color: AGING_COLORS[bucket] || '#6b7280',
  }));

  const cxpAgingData = Object.entries(metrics.cxp_aging || {}).map(([bucket, total]) => ({
    name: bucket,
    value: Number(total),
    color: AGING_COLORS[bucket] || '#6b7280',
  }));

  const gastosData = (metrics.gastos_categoria || []).map((item, index) => ({
    name: item.categoria,
    value: Number(item.total),
    color: COLORS[index % COLORS.length],
  }));

  const monthlyData = (metrics.monthly_comparison || []).map(item => ({
    mes: new Date(item.mes).toLocaleDateString('es-MX', { month: 'short' }),
    ingresos: Number(item.ingresos),
    gastos: Number(item.gastos),
    utilidad: Number(item.ingresos) - Number(item.gastos),
  }));

  // Calculate EBITDA approximation (without depreciation/amortization data, it's just operating income)
  const ebitda = metrics.utilidad_neta;
  const ebitdaMargin = metrics.ingresos_periodo > 0 
    ? (ebitda / metrics.ingresos_periodo) * 100 
    : 0;

  // Break-even calculation (simplified - assumes fixed costs are 60% of total expenses)
  const fixedCostsRatio = 0.6;
  const variableCostsRatio = 0.4;
  const contributionMargin = metrics.ingresos_periodo > 0 
    ? (metrics.ingresos_periodo - (metrics.gastos_periodo * variableCostsRatio)) / metrics.ingresos_periodo
    : 0;
  const breakEvenRevenue = contributionMargin > 0 
    ? (metrics.gastos_periodo * fixedCostsRatio) / contributionMargin 
    : 0;
  const breakEvenProgress = metrics.ingresos_periodo > 0 && breakEvenRevenue > 0
    ? Math.min(100, (metrics.ingresos_periodo / breakEvenRevenue) * 100)
    : 0;

  return (
    <div className="space-y-6">
      {/* Header with Period Selector */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold">Dashboard Empresarial</h1>
          <p className="text-muted-foreground text-sm">
            {new Date(dateRange.startDate).toLocaleDateString('es-MX', { day: 'numeric', month: 'long', year: 'numeric' })}
            {' - '}
            {new Date(dateRange.endDate).toLocaleDateString('es-MX', { day: 'numeric', month: 'long', year: 'numeric' })}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Select value={period} onValueChange={(v) => setPeriod(v as PeriodFilter)}>
            <SelectTrigger className="w-[140px]">
              <Calendar className="h-4 w-4 mr-2" />
              <SelectValue placeholder="Período" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="today">Hoy</SelectItem>
              <SelectItem value="month">Este Mes</SelectItem>
              <SelectItem value="quarter">Trimestre</SelectItem>
              <SelectItem value="year">Año</SelectItem>
            </SelectContent>
          </Select>
          <Button variant="outline" size="icon" onClick={refetch}>
            <RefreshCw className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Section 1: Liquidity Indicators */}
      <div className="space-y-4">
        <h2 className="text-lg font-semibold flex items-center gap-2">
          <Banknote className="h-5 w-5 text-primary" />
          Indicadores de Liquidez
        </h2>
        <div className="grid gap-4 md:grid-cols-3">
          {/* Bank Balances */}
          <Card className="border-primary/20">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Saldo en Bancos
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className={`text-2xl font-bold ${metrics.saldo_bancos >= 0 ? 'text-primary' : 'text-destructive'}`}>
                {formatCurrency(metrics.saldo_bancos)}
              </p>
            </CardContent>
          </Card>

          {/* Accounts Receivable */}
          <Card className="border-green-500/20">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                Cuentas por Cobrar
                <TooltipProvider>
                  <UITooltip>
                    <TooltipTrigger>
                      <Info className="h-3.5 w-3.5" />
                    </TooltipTrigger>
                    <TooltipContent>
                      <p>Total pendiente de cobro de facturas emitidas</p>
                    </TooltipContent>
                  </UITooltip>
                </TooltipProvider>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-bold text-green-600">
                {formatCurrency(metrics.cxc_total)}
              </p>
              {agingData.length > 0 && (
                <div className="mt-3 h-32">
                  <ResponsiveContainer width="100%" height="100%">
                    <RechartsPieChart>
                      <Pie
                        data={agingData}
                        cx="50%"
                        cy="50%"
                        innerRadius={25}
                        outerRadius={45}
                        dataKey="value"
                        paddingAngle={2}
                      >
                        {agingData.map((entry, index) => (
                          <Cell key={index} fill={entry.color} />
                        ))}
                      </Pie>
                      <Tooltip 
                        formatter={(value: number) => formatCurrency(value)}
                        labelFormatter={(label) => `${label} días`}
                      />
                    </RechartsPieChart>
                  </ResponsiveContainer>
                  <div className="flex flex-wrap gap-2 justify-center text-xs">
                    {agingData.map((item) => (
                      <div key={item.name} className="flex items-center gap-1">
                        <div className="w-2 h-2 rounded-full" style={{ backgroundColor: item.color }} />
                        <span>{item.name}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Accounts Payable */}
          <Card className="border-red-500/20">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                Cuentas por Pagar
                <TooltipProvider>
                  <UITooltip>
                    <TooltipTrigger>
                      <Info className="h-3.5 w-3.5" />
                    </TooltipTrigger>
                    <TooltipContent>
                      <p>Total pendiente de pago a proveedores</p>
                    </TooltipContent>
                  </UITooltip>
                </TooltipProvider>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-bold text-red-600">
                {formatCurrency(metrics.cxp_total)}
              </p>
              {cxpAgingData.length > 0 && (
                <div className="mt-3 h-32">
                  <ResponsiveContainer width="100%" height="100%">
                    <RechartsPieChart>
                      <Pie
                        data={cxpAgingData}
                        cx="50%"
                        cy="50%"
                        innerRadius={25}
                        outerRadius={45}
                        dataKey="value"
                        paddingAngle={2}
                      >
                        {cxpAgingData.map((entry, index) => (
                          <Cell key={index} fill={entry.color} />
                        ))}
                      </Pie>
                      <Tooltip 
                        formatter={(value: number) => formatCurrency(value)}
                      />
                    </RechartsPieChart>
                  </ResponsiveContainer>
                  <div className="flex flex-wrap gap-2 justify-center text-xs">
                    {cxpAgingData.map((item) => (
                      <div key={item.name} className="flex items-center gap-1">
                        <div className="w-2 h-2 rounded-full" style={{ backgroundColor: item.color }} />
                        <span>{item.name}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Section 2: Profit & Loss */}
      <div className="space-y-4">
        <h2 className="text-lg font-semibold flex items-center gap-2">
          <BarChart3 className="h-5 w-5 text-primary" />
          Estado de Resultados
        </h2>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Ingresos</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-bold text-green-600 flex items-center">
                <TrendingUp className="h-5 w-5 mr-2" />
                {formatCurrency(metrics.ingresos_periodo)}
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Gastos</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-bold text-red-600 flex items-center">
                <TrendingDown className="h-5 w-5 mr-2" />
                {formatCurrency(metrics.gastos_periodo)}
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Utilidad Neta</CardTitle>
            </CardHeader>
            <CardContent>
              <p className={`text-2xl font-bold ${metrics.utilidad_neta >= 0 ? 'text-primary' : 'text-destructive'}`}>
                {formatCurrency(metrics.utilidad_neta)}
              </p>
              <StatusBadge value={metrics.margen_neto} thresholds={{ green: 15, yellow: 5 }} />
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">EBITDA</CardTitle>
            </CardHeader>
            <CardContent>
              <p className={`text-2xl font-bold ${ebitda >= 0 ? 'text-primary' : 'text-destructive'}`}>
                {formatCurrency(ebitda)}
              </p>
              <p className="text-xs text-muted-foreground mt-1">
                Margen: {ebitdaMargin.toFixed(1)}%
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Monthly Comparison Chart */}
        {monthlyData.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle className="text-sm font-medium">Evolución Mensual</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <ComposedChart data={monthlyData}>
                    <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                    <XAxis dataKey="mes" className="text-xs" />
                    <YAxis 
                      tickFormatter={(value) => formatCurrency(value).replace(/[^\d,.-]/g, '')} 
                      className="text-xs"
                    />
                    <Tooltip 
                      formatter={(value: number) => formatCurrency(value)}
                      contentStyle={{ backgroundColor: 'hsl(var(--card))', border: '1px solid hsl(var(--border))' }}
                    />
                    <Legend />
                    <Bar dataKey="ingresos" name="Ingresos" fill="#10b981" radius={[4, 4, 0, 0]} />
                    <Bar dataKey="gastos" name="Gastos" fill="#ef4444" radius={[4, 4, 0, 0]} />
                    <Line type="monotone" dataKey="utilidad" name="Utilidad" stroke="#3b82f6" strokeWidth={2} />
                  </ComposedChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Section 3: Expense Control */}
      <div className="space-y-4">
        <h2 className="text-lg font-semibold flex items-center gap-2">
          <PieChart className="h-5 w-5 text-primary" />
          Control de Gastos
        </h2>
        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium">Gastos por Categoría</CardTitle>
          </CardHeader>
          <CardContent>
            {gastosData.length > 0 ? (
              <div className="flex flex-col lg:flex-row items-center gap-6">
                <div className="h-64 w-full lg:w-1/2">
                  <ResponsiveContainer width="100%" height="100%">
                    <RechartsPieChart>
                      <Pie
                        data={gastosData}
                        cx="50%"
                        cy="50%"
                        innerRadius={50}
                        outerRadius={90}
                        dataKey="value"
                        paddingAngle={2}
                        label={({ name, percent }) => `${name} (${(percent * 100).toFixed(0)}%)`}
                        labelLine={false}
                      >
                        {gastosData.map((entry, index) => (
                          <Cell key={index} fill={entry.color} />
                        ))}
                      </Pie>
                      <Tooltip formatter={(value: number) => formatCurrency(value)} />
                    </RechartsPieChart>
                  </ResponsiveContainer>
                </div>
                <div className="w-full lg:w-1/2 space-y-2">
                  {gastosData.map((item, index) => (
                    <div key={item.name} className="flex items-center justify-between p-2 rounded-lg hover:bg-muted/50 transition-colors">
                      <div className="flex items-center gap-2">
                        <div className="w-3 h-3 rounded-full" style={{ backgroundColor: item.color }} />
                        <span className="font-medium text-sm">{item.name}</span>
                      </div>
                      <span className="text-sm font-bold text-destructive">{formatCurrency(item.value)}</span>
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <p className="text-center text-muted-foreground py-8">No hay gastos registrados en este período</p>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Section 4: Tax Obligations */}
      <div className="space-y-4">
        <h2 className="text-lg font-semibold flex items-center gap-2">
          <Receipt className="h-5 w-5 text-primary" />
          Obligaciones Fiscales
        </h2>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">IVA por Pagar</CardTitle>
            </CardHeader>
            <CardContent>
              <p className={`text-2xl font-bold ${metrics.iva_por_pagar > 0 ? 'text-amber-600' : 'text-muted-foreground'}`}>
                {formatCurrency(metrics.iva_por_pagar)}
              </p>
              <p className="text-xs text-muted-foreground mt-1">Estimación del período</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">ISR Retenido</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-bold text-amber-600">
                {formatCurrency(metrics.isr_retenido)}
              </p>
              <p className="text-xs text-muted-foreground mt-1">Acumulado del período</p>
            </CardContent>
          </Card>

          <Card className="md:col-span-2">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                <FileText className="h-4 w-4" />
                Estatus de Facturación
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex justify-around items-center gap-4">
                <div className="text-center">
                  <p className="text-2xl font-bold text-primary">{metrics.facturas_emitidas}</p>
                  <p className="text-xs text-muted-foreground">Emitidas</p>
                </div>
                <div className="text-center">
                  <p className="text-2xl font-bold text-amber-600">{metrics.facturas_pendientes}</p>
                  <p className="text-xs text-muted-foreground">Pendientes</p>
                </div>
                <div className="text-center">
                  <p className="text-2xl font-bold text-destructive">{metrics.facturas_canceladas}</p>
                  <p className="text-xs text-muted-foreground">Canceladas</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Section 5: Operational KPIs */}
      <div className="space-y-4">
        <h2 className="text-lg font-semibold flex items-center gap-2">
          <Clock className="h-5 w-5 text-primary" />
          KPIs de Eficiencia Operativa
        </h2>
        <div className="grid gap-4 md:grid-cols-2">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                DSO (Días de Venta Pendientes)
                <TooltipProvider>
                  <UITooltip>
                    <TooltipTrigger>
                      <Info className="h-3.5 w-3.5" />
                    </TooltipTrigger>
                    <TooltipContent>
                      <p>Promedio de días que tarda un cliente en pagar</p>
                    </TooltipContent>
                  </UITooltip>
                </TooltipProvider>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-3xl font-bold">
                {metrics.dso.toFixed(1)} <span className="text-lg font-normal text-muted-foreground">días</span>
              </p>
              <StatusBadge value={metrics.dso} thresholds={{ green: 30, yellow: 45 }} inverse />
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                Punto de Equilibrio
                <TooltipProvider>
                  <UITooltip>
                    <TooltipTrigger>
                      <Info className="h-3.5 w-3.5" />
                    </TooltipTrigger>
                    <TooltipContent>
                      <p>Ingresos necesarios para cubrir todos los costos</p>
                    </TooltipContent>
                  </UITooltip>
                </TooltipProvider>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-xl font-bold mb-2">
                {formatCurrency(breakEvenRevenue)}
              </p>
              <div className="relative w-full h-4 bg-muted rounded-full overflow-hidden">
                <div 
                  className={`absolute left-0 top-0 h-full rounded-full transition-all duration-500 ${
                    breakEvenProgress >= 100 ? 'bg-green-500' : breakEvenProgress >= 75 ? 'bg-amber-500' : 'bg-red-500'
                  }`}
                  style={{ width: `${Math.min(breakEvenProgress, 100)}%` }}
                />
              </div>
              <p className="text-xs text-muted-foreground mt-2">
                {breakEvenProgress >= 100 
                  ? '✓ Punto de equilibrio alcanzado' 
                  : `${breakEvenProgress.toFixed(0)}% del punto de equilibrio`}
              </p>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};
