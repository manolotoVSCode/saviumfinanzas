import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import Layout from '@/components/Layout';
import { useFinanceData } from '@/hooks/useFinanceData';
import { useUser } from '@/hooks/useUser';
import { TrendingUp, TrendingDown, DollarSign, Target } from 'lucide-react';

const Inversiones = () => {
  const { dashboardMetrics, accounts } = useFinanceData();
  const { formatCurrency } = useUser();

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
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {cuentasInversion.map((cuenta) => {
          const rendimiento = cuenta.saldoActual - cuenta.saldoInicial;
          const rendimientoPorcentaje = cuenta.saldoInicial !== 0 ? (rendimiento / cuenta.saldoInicial) * 100 : 0;
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
                    <span className="text-sm text-muted-foreground">Valor Actual</span>
                    <span className="text-lg font-bold">{formatCurrency(cuenta.saldoActual)}</span>
                  </div>
                  
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-muted-foreground">Inversión Inicial</span>
                    <span className="text-sm font-medium">{formatCurrency(cuenta.saldoInicial)}</span>
                  </div>
                  
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-muted-foreground">Rendimiento</span>
                    <span className={`text-sm font-medium ${getRendimientoColor(rendimiento)}`}>
                      {rendimiento >= 0 ? '+' : ''}{formatCurrency(rendimiento)}
                    </span>
                  </div>

                  <div className="space-y-2">
                    <div className="flex justify-between text-xs text-muted-foreground">
                      <span>Progreso</span>
                      <span>{rendimientoPorcentaje > 0 ? '+' : ''}{rendimientoPorcentaje.toFixed(1)}%</span>
                    </div>
                    <Progress 
                      value={Math.min(Math.abs(rendimientoPorcentaje), 100)} 
                      className="h-2"
                    />
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* OBJETIVOS Y METAS */}
      <Card className="hover-scale border-accent/20 hover:border-accent/40 transition-all duration-300">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Target className="h-5 w-5 text-accent" />
            Objetivos de Inversión
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="p-4 rounded-lg bg-accent/5 border border-accent/20">
              <div className="flex justify-between items-center mb-2">
                <span className="font-medium">Meta Anual de Inversión</span>
                <span className="text-sm text-muted-foreground">2025</span>
              </div>
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span>Progreso: {formatCurrency(inversionesResumen.aportacionesMes * 7)}</span>
                  <span>Meta: {formatCurrency(500000)}</span>
                </div>
                <Progress value={(inversionesResumen.aportacionesMes * 7 / 500000) * 100} className="h-2" />
                <div className="text-xs text-muted-foreground text-center">
                  {((inversionesResumen.aportacionesMes * 7 / 500000) * 100).toFixed(1)}% completado
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="p-3 rounded-lg bg-success/5 border border-success/20">
                <div className="text-sm text-muted-foreground">Diversificación</div>
                <div className="text-lg font-bold text-success">Buena</div>
                <div className="text-xs text-muted-foreground">ETFs y acciones individuales</div>
              </div>
              
              <div className="p-3 rounded-lg bg-primary/5 border border-primary/20">
                <div className="text-sm text-muted-foreground">Horizonte Temporal</div>
                <div className="text-lg font-bold text-primary">Largo Plazo</div>
                <div className="text-xs text-muted-foreground">5+ años</div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
    </Layout>
  );
};

export default Inversiones;