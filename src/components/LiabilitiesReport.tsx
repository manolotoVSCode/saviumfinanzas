import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { DashboardMetrics, Account } from '@/types/finance';
import { AlertTriangle, CreditCard, Home, Calendar, TrendingDown, DollarSign, Shield, Info } from 'lucide-react';
import { Progress } from '@/components/ui/progress';

interface LiabilitiesReportProps {
  metrics: DashboardMetrics;
  formatCurrency: (amount: number) => string;
  accounts: Account[];
}

export const LiabilitiesReport = ({ metrics, formatCurrency, accounts }: LiabilitiesReportProps) => {
  
  // Filtrar cuentas de pasivos
  const liabilityAccounts = accounts.filter(account => 
    ['Tarjeta de Crédito', 'Hipoteca'].includes(account.tipo)
  );

  // Agrupar por tipo de pasivo
  const groupedLiabilities = {
    creditCards: liabilityAccounts.filter(a => a.tipo === 'Tarjeta de Crédito'),
    mortgage: liabilityAccounts.filter(a => a.tipo === 'Hipoteca')
  };

  // Calcular totales por categoría (valores absolutos)
  const totales = {
    creditCards: Math.abs(groupedLiabilities.creditCards.reduce((sum, a) => sum + a.saldoActual, 0)),
    mortgage: Math.abs(groupedLiabilities.mortgage.reduce((sum, a) => sum + a.saldoActual, 0))
  };

  const totalPasivos = Object.values(totales).reduce((sum, amount) => sum + amount, 0);

  // Calcular activos totales para ratios
  const totalActivos = metrics.activos.total;

  // Calcular porcentajes de distribución
  const calcularPorcentaje = (amount: number) => totalPasivos > 0 ? (amount / totalPasivos) * 100 : 0;

  // Calcular ratios importantes
  const ratioDeuda = totalPasivos > 0 && totalActivos > 0 ? (totalPasivos / totalActivos) * 100 : 0;
  const patrimonioNeto = totalActivos - totalPasivos;

  const getLiabilityIcon = (tipo: string) => {
    switch (tipo) {
      case 'Tarjeta de Crédito':
        return <CreditCard className="h-5 w-5" />;
      case 'Hipoteca':
        return <Home className="h-5 w-5" />;
      default:
        return <CreditCard className="h-5 w-5" />;
    }
  };

  const getRiskLevel = (ratio: number) => {
    if (ratio > 40) return { level: 'Alto', color: 'destructive', icon: AlertTriangle };
    if (ratio > 20) return { level: 'Moderado', color: 'warning', icon: AlertTriangle };
    return { level: 'Bajo', color: 'success', icon: Shield };
  };

  const riskInfo = getRiskLevel(ratioDeuda);

  return (
    <div className="space-y-6">
      {/* Resumen General de Pasivos */}
      <Card className="border-destructive/20 hover:border-destructive/40 transition-all duration-300">
        <CardHeader>
          <CardTitle className="text-destructive flex items-center gap-2">
            <AlertTriangle className="h-5 w-5" />
            Resumen de Pasivos
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
            <div className="text-center p-4 rounded-lg bg-destructive/5">
              <CreditCard className="h-8 w-8 mx-auto mb-2 text-destructive" />
              <p className="text-sm text-muted-foreground">Tarjetas de Crédito</p>
              <p className="text-xl font-bold text-destructive">{formatCurrency(totales.creditCards)}</p>
              <p className="text-xs text-muted-foreground">{calcularPorcentaje(totales.creditCards).toFixed(1)}% del total</p>
            </div>
            <div className="text-center p-4 rounded-lg bg-warning/5">
              <Home className="h-8 w-8 mx-auto mb-2 text-warning" />
              <p className="text-sm text-muted-foreground">Hipoteca</p>
              <p className="text-xl font-bold text-warning">{formatCurrency(totales.mortgage)}</p>
              <p className="text-xs text-muted-foreground">{calcularPorcentaje(totales.mortgage).toFixed(1)}% del total</p>
            </div>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="p-4 rounded-lg bg-destructive/10 border-2 border-destructive/30">
              <div className="flex justify-between items-center">
                <span className="font-semibold text-destructive">Total de Pasivos</span>
                <span className="text-2xl font-bold text-destructive">{formatCurrency(totalPasivos)}</span>
              </div>
            </div>
            
            <div className="p-4 rounded-lg bg-primary/10 border-2 border-primary/30">
              <div className="flex justify-between items-center">
                <span className="font-semibold text-primary">Patrimonio Neto</span>
                <span className={`text-2xl font-bold ${patrimonioNeto >= 0 ? 'text-success' : 'text-destructive'}`}>
                  {formatCurrency(patrimonioNeto)}
                </span>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Indicadores de Riesgo */}
      <Card className={`border-${riskInfo.color}/20 hover:border-${riskInfo.color}/40 transition-all duration-300`}>
        <CardHeader>
          <CardTitle className={`text-${riskInfo.color} flex items-center gap-2`}>
            <riskInfo.icon className="h-5 w-5" />
            Análisis de Riesgo
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className={`p-4 rounded-lg bg-${riskInfo.color}/5 border border-${riskInfo.color}/20`}>
              <h4 className="font-semibold mb-2">Ratio de Endeudamiento</h4>
              <div className={`text-3xl font-bold text-${riskInfo.color} mb-2`}>
                {ratioDeuda.toFixed(2)}%
              </div>
              <Progress value={Math.min(ratioDeuda, 100)} className="h-2 mb-2" />
              <Badge variant={riskInfo.color === 'success' ? 'default' : 'destructive'} className="text-xs">
                Riesgo {riskInfo.level}
              </Badge>
              <p className="text-xs text-muted-foreground mt-2">
                Pasivos como % de activos totales
              </p>
            </div>
            
            <div className="p-4 rounded-lg bg-info/5 border border-info/20">
              <h4 className="font-semibold mb-2">Capacidad de Pago</h4>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span>Activos totales:</span>
                  <span className="font-medium">{formatCurrency(totalActivos)}</span>
                </div>
                <div className="flex justify-between">
                  <span>Pasivos totales:</span>
                  <span className="font-medium">{formatCurrency(totalPasivos)}</span>
                </div>
                <div className="flex justify-between border-t pt-2">
                  <span>Cobertura:</span>
                  <span className={`font-bold ${totalActivos > totalPasivos ? 'text-success' : 'text-destructive'}`}>
                    {totalPasivos > 0 ? `${(totalActivos / totalPasivos).toFixed(2)}x` : '∞'}
                  </span>
                </div>
              </div>
            </div>
            
            <div className="p-4 rounded-lg bg-accent/5 border border-accent/20">
              <h4 className="font-semibold mb-2">Distribución de Deuda</h4>
              <div className="space-y-2 text-sm">
                {totales.creditCards > 0 && (
                  <div className="flex justify-between">
                    <span>Tarjetas:</span>
                    <span>{calcularPorcentaje(totales.creditCards).toFixed(2)}%</span>
                  </div>
                )}
                {totales.mortgage > 0 && (
                  <div className="flex justify-between">
                    <span>Hipoteca:</span>
                    <span>{calcularPorcentaje(totales.mortgage).toFixed(2)}%</span>
                  </div>
                )}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Detalle por Categoría de Pasivos */}
      {Object.entries(groupedLiabilities).map(([categoria, cuentas]) => {
        if (cuentas.length === 0) return null;
        
        const categoriaInfo = {
          creditCards: { 
            nombre: 'Tarjetas de Crédito', 
            color: 'destructive', 
            description: 'Deuda de alto costo, priorizar para pago',
            icon: CreditCard
          },
          mortgage: { 
            nombre: 'Hipoteca', 
            color: 'warning', 
            description: 'Deuda garantizada con bienes inmuebles',
            icon: Home
          }
        };

        const info = categoriaInfo[categoria as keyof typeof categoriaInfo];
        const total = totales[categoria as keyof typeof totales];

        return (
          <Card key={categoria} className={`border-${info.color}/20 hover:border-${info.color}/40 transition-all duration-300`}>
            <CardHeader>
              <CardTitle className={`text-${info.color} flex items-center gap-2`}>
                <info.icon className="h-5 w-5" />
                {info.nombre}
              </CardTitle>
              <p className="text-sm text-muted-foreground">{info.description}</p>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Resumen de la categoría */}
              <div className={`p-3 rounded-lg bg-${info.color}/5 border border-${info.color}/20`}>
                <div className="flex justify-between items-center mb-2">
                  <span className="text-sm text-muted-foreground">Total adeudado</span>
                  <span className={`font-bold text-${info.color} text-lg`}>{formatCurrency(total)}</span>
                </div>
                <Progress value={calcularPorcentaje(total)} className="h-2" />
                <p className="text-xs text-muted-foreground mt-1">
                  {calcularPorcentaje(total).toFixed(2)}% de todos los pasivos
                </p>
              </div>

              {/* Detalle de cada cuenta */}
              <div className="space-y-3">
                {cuentas.map(cuenta => {
                  const saldo = Math.abs(cuenta.saldoActual);
                  const porcentajeCategoria = total > 0 ? (saldo / total) * 100 : 0;
                  const utilizacion = cuenta.tipo === 'Tarjeta de Crédito' && cuenta.saldoInicial > 0 
                    ? (saldo / Math.abs(cuenta.saldoInicial)) * 100 : null;
                  
                  return (
                    <div key={cuenta.id} className="p-3 rounded-lg border bg-card hover:bg-muted/5 transition-colors">
                      <div className="flex justify-between items-start mb-2">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            <h4 className="font-medium">{cuenta.nombre}</h4>
                            <Badge variant="outline" className="text-xs">
                              {cuenta.tipo}
                            </Badge>
                            {cuenta.divisa && cuenta.divisa !== 'MXN' && (
                              <Badge variant="secondary" className="text-xs">
                                {cuenta.divisa}
                              </Badge>
                            )}
                            {utilizacion && utilizacion > 80 && (
                              <Badge variant="destructive" className="text-xs">
                                Alto uso
                              </Badge>
                            )}
                          </div>
                          <div className="text-sm text-muted-foreground">
                            Saldo adeudado: <span className="font-medium text-destructive">{formatCurrency(saldo)}</span>
                          </div>
                          {utilizacion && (
                            <div className="text-sm mt-1">
                              <span className="text-muted-foreground">Utilización:</span>
                              <span className={`ml-1 font-medium ${utilizacion > 80 ? 'text-destructive' : utilizacion > 50 ? 'text-warning' : 'text-success'}`}>
                                {utilizacion.toFixed(2)}%
                              </span>
                            </div>
                          )}
                        </div>
                        <div className="text-right">
                          <div className="text-sm text-muted-foreground mb-1">
                            {porcentajeCategoria.toFixed(2)}% de {info.nombre.toLowerCase()}
                          </div>
                        </div>
                      </div>
                      
                      <Progress value={porcentajeCategoria} className="h-1" />
                      
                      {/* Información adicional */}
                      {cuenta.tipo === 'Tarjeta de Crédito' && (
                        <div className="grid grid-cols-2 gap-4 mt-3 pt-3 border-t text-xs">
                          <div>
                            <span className="text-muted-foreground">Límite disponible:</span>
                            <div className="font-medium text-success">
                              {formatCurrency(Math.abs(cuenta.saldoInicial) - saldo)}
                            </div>
                          </div>
                          <div>
                            <span className="text-muted-foreground">Límite total:</span>
                            <div className="font-medium">{formatCurrency(Math.abs(cuenta.saldoInicial))}</div>
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        );
      })}

      {/* Recomendaciones de Gestión de Deuda */}
      <Card className="border-info/20 hover:border-info/40 transition-all duration-300">
        <CardHeader>
          <CardTitle className="text-info flex items-center gap-2">
            <Info className="h-5 w-5" />
            Estrategias de Gestión de Deuda
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="p-4 rounded-lg bg-warning/5 border border-warning/20">
              <h4 className="font-semibold mb-2">Prioridades de Pago</h4>
              <ul className="text-sm space-y-1">
                {totales.creditCards > 0 && (
                  <li className="flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full bg-destructive"></div>
                    <strong>1. Tarjetas de Crédito</strong> - Mayor tasa de interés
                  </li>
                )}
                {totales.mortgage > 0 && (
                  <li className="flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full bg-warning"></div>
                    <strong>2. Hipoteca</strong> - Menor tasa, garantizada
                  </li>
                )}
              </ul>
            </div>
            
            <div className="p-4 rounded-lg bg-success/5 border border-success/20">
              <h4 className="font-semibold mb-2">Recomendaciones</h4>
              <ul className="text-sm space-y-1">
                {ratioDeuda > 40 && (
                  <li className="flex items-center gap-2">
                    <AlertTriangle className="w-4 h-4 text-destructive" />
                    Ratio de deuda alto - considera consolidación
                  </li>
                )}
                {totales.creditCards > 0 && (
                  <li className="flex items-center gap-2">
                    <CreditCard className="w-4 h-4 text-primary" />
                    Paga más del mínimo en tarjetas de crédito
                  </li>
                )}
                <li className="flex items-center gap-2">
                  <Calendar className="w-4 h-4 text-success" />
                  Programa pagos automáticos para evitar cargos por mora
                </li>
                <li className="flex items-center gap-2">
                  <TrendingDown className="w-4 h-4 text-info" />
                  Considera refinanciar deudas de alto costo
                </li>
              </ul>
            </div>
          </div>

          {totalPasivos === 0 && (
            <div className="p-4 rounded-lg bg-success/10 border-2 border-success/30 text-center">
              <Shield className="h-12 w-12 mx-auto mb-4 text-success" />
              <h4 className="font-semibold text-success mb-2">¡Excelente gestión financiera!</h4>
              <p className="text-sm text-muted-foreground">
                No tienes pasivos registrados. Mantén este estado evitando deudas innecesarias
                y usando el crédito de manera responsable cuando sea necesario.
              </p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};