import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';

import Layout from '@/components/Layout';
import { useFinanceData } from '@/hooks/useFinanceData';
import { useAppConfig } from '@/hooks/useAppConfig';
import { TrendingUp, TrendingDown, DollarSign } from 'lucide-react';

const Inversiones = () => {
  const { dashboardMetrics, accounts } = useFinanceData();
  const { formatCurrency } = useAppConfig();

  const inversionesResumen = dashboardMetrics.inversionesResumen;
  const cuentasInversion = accounts.filter(acc => acc.tipo === 'Inversiones');

  const getRendimientoColor = (rendimiento: number) => {
    if (rendimiento > 0) return 'text-success';
    if (rendimiento < 0) return 'text-destructive';
    return 'text-muted-foreground';
  };

  const getRendimientoIcon = (rendimiento: number) => {
    return rendimiento >= 0 ? TrendingUp : TrendingDown;
  };

  return (
    <Layout>
      <div className="space-y-6 animate-fade-in">
      {/* RESUMEN GENERAL */}
      <Card className="hover-scale border-primary/20 hover:border-primary/40 transition-all duration-300">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <DollarSign className="h-5 w-5 text-primary" />
            Resumen de Inversiones
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="text-center">
              <div className="text-2xl font-bold text-primary">{formatCurrency(inversionesResumen.totalInversiones)}</div>
              <div className="text-sm text-muted-foreground">Total Invertido</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-success">{formatCurrency(inversionesResumen.aportacionesMes)}</div>
              <div className="text-sm text-muted-foreground">Aportaciones Este Mes</div>
            </div>
            <div className="text-center">
              <div className={`text-2xl font-bold ${
                inversionesResumen.variacionAportaciones >= 0 ? 'text-success' : 'text-destructive'
              }`}>
                {inversionesResumen.variacionAportaciones >= 0 ? '+' : ''}{inversionesResumen.variacionAportaciones.toFixed(1)}%
              </div>
              <div className="text-sm text-muted-foreground">vs Mes Anterior</div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* DETALLE POR CUENTA */}
      <div className="grid grid-cols-1 gap-6">
        {cuentasInversion.map((cuenta) => {
          const valorActual = cuenta.valorMercado || cuenta.saldoActual;
          const totalAportado = cuenta.saldoActual; // El saldoActual representa lo aportado
          const rendimiento = valorActual - totalAportado;
          const rendimientoPorcentaje = totalAportado !== 0 ? (rendimiento / totalAportado) * 100 : 0;
          const IconComponent = getRendimientoIcon(rendimiento);

          return (
            <Card key={cuenta.id} className="hover-scale border-secondary/20 hover:border-secondary/40 transition-all duration-300">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-lg">{cuenta.nombre}</CardTitle>
                <Badge variant={rendimiento >= 0 ? 'default' : 'destructive'}>
                  <IconComponent className="h-3 w-3 mr-1" />
                  {rendimiento >= 0 ? '+' : ''}{rendimientoPorcentaje.toFixed(2)}%
                </Badge>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-muted-foreground">Valor Actual de Mercado</span>
                    <span className="text-xl font-bold text-primary">{formatCurrency(valorActual)}</span>
                  </div>
                  
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-muted-foreground">Total Aportado</span>
                    <span className="text-sm font-medium">{formatCurrency(totalAportado)}</span>
                  </div>
                  
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-muted-foreground">Ganancia/Pérdida</span>
                    <span className={`text-sm font-medium ${getRendimientoColor(rendimiento)}`}>
                      {rendimiento >= 0 ? '+' : ''}{formatCurrency(rendimiento)}
                    </span>
                  </div>

                  <div className="flex justify-between items-center">
                    <span className="text-sm text-muted-foreground">Rendimiento</span>
                    <span className={`text-lg font-bold ${getRendimientoColor(rendimiento)}`}>
                      {rendimientoPorcentaje > 0 ? '+' : ''}{rendimientoPorcentaje.toFixed(2)}%
                    </span>
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
    </Layout>
  );
};

export default Inversiones;