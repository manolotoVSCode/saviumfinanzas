import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { DashboardMetrics } from '@/types/finance';
import { TrendingUp, TrendingDown, DollarSign, CreditCard } from 'lucide-react';

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
    if (amount > 0) return 'text-green-600';
    if (amount < 0) return 'text-red-600';
    return 'text-muted-foreground';
  };

  return (
    <div className="space-y-6">
      {/* Métricas principales */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Balance Total</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className={`text-2xl font-bold ${getBalanceColor(metrics.balanceTotal)}`}>
              {formatCurrency(metrics.balanceTotal)}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Ingresos del Mes</CardTitle>
            <TrendingUp className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">
              {formatCurrency(metrics.ingresosMes)}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Gastos del Mes</CardTitle>
            <TrendingDown className="h-4 w-4 text-red-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">
              {formatCurrency(metrics.gastosMes)}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Balance del Mes</CardTitle>
            <CreditCard className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className={`text-2xl font-bold ${getBalanceColor(metrics.balanceMes)}`}>
              {formatCurrency(metrics.balanceMes)}
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Top Categorías */}
        <Card>
          <CardHeader>
            <CardTitle>Top Categorías</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {metrics.topCategorias.map((cat, index) => (
                <div key={index} className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <Badge variant={cat.tipo === 'Ingreso' ? 'default' : 'destructive'}>
                      {cat.tipo}
                    </Badge>
                    <span className="font-medium">{cat.categoria}</span>
                  </div>
                  <span className={`font-bold ${cat.tipo === 'Ingreso' ? 'text-green-600' : 'text-red-600'}`}>
                    {formatCurrency(cat.monto)}
                  </span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Resumen de Cuentas */}
        <Card>
          <CardHeader>
            <CardTitle>Resumen de Cuentas</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {metrics.cuentasResumen.map((cuenta, index) => (
                <div key={index} className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <Badge variant="outline">{cuenta.tipo}</Badge>
                    <span className="font-medium">{cuenta.cuenta}</span>
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

      {/* Tendencia Mensual */}
      <Card>
        <CardHeader>
          <CardTitle>Tendencia de los Últimos 6 Meses</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {metrics.tendenciaMensual.map((mes, index) => (
              <div key={index} className="grid grid-cols-4 gap-4 items-center">
                <span className="font-medium">{mes.mes}</span>
                <span className="text-green-600 font-medium">
                  {formatCurrency(mes.ingresos)}
                </span>
                <span className="text-red-600 font-medium">
                  {formatCurrency(mes.gastos)}
                </span>
                <span className={`font-bold ${getBalanceColor(mes.ingresos - mes.gastos)}`}>
                  {formatCurrency(mes.ingresos - mes.gastos)}
                </span>
              </div>
            ))}
            <div className="grid grid-cols-4 gap-4 text-sm text-muted-foreground border-t pt-2">
              <span>Mes</span>
              <span>Ingresos</span>
              <span>Gastos</span>
              <span>Balance</span>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};