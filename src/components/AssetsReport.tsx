import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { DashboardMetrics, Account } from '@/types/finance';
import { TrendingUp, TrendingDown, DollarSign, Building, Wallet, PieChart, Info, CheckCircle, XCircle } from 'lucide-react';
import { Progress } from '@/components/ui/progress';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface AssetsReportProps {
  metrics: DashboardMetrics;
  formatCurrency: (amount: number) => string;
  accounts: Account[];
  onAccountUpdate?: () => void;
}

export const AssetsReport = ({ metrics, formatCurrency, accounts, onAccountUpdate }: AssetsReportProps) => {
  
  const handleToggleVendida = async (accountId: string, currentStatus: boolean, currentBalance: number) => {
    try {
      const newStatus = !currentStatus;
      const updatedData = {
        vendida: newStatus,
        saldo_actual: newStatus ? 0 : currentBalance // Si se marca como vendida, saldo a 0
      };

      const { error } = await supabase
        .from('cuentas')
        .update(updatedData)
        .eq('id', accountId);

      if (error) throw error;

      toast.success(
        newStatus ? 'Propiedad/Empresa marcada como vendida' : 'Propiedad/Empresa marcada como activa'
      );
      
      if (onAccountUpdate) {
        onAccountUpdate();
      }
    } catch (error) {
      // Error updating property/business status
      toast.error('Error al actualizar el estado');
    }
  };
  
  // Filtrar cuentas de activos
  const assetAccounts = accounts.filter(account => 
    ['Efectivo', 'Banco', 'Ahorros', 'Inversiones', 'Bien Raíz', 'Empresa Propia'].includes(account.tipo)
  );

  // Agrupar por tipo de activo
  const groupedAssets = {
    liquidez: assetAccounts.filter(a => ['Efectivo', 'Banco', 'Ahorros'].includes(a.tipo)),
    inversiones: assetAccounts.filter(a => a.tipo === 'Inversiones'),
    bienRaiz: assetAccounts.filter(a => a.tipo === 'Bien Raíz'),
    empresas: assetAccounts.filter(a => a.tipo === 'Empresa Propia')
  };

  // Calcular totales por categoría
  const totales = {
    liquidez: groupedAssets.liquidez.reduce((sum, a) => sum + a.saldoActual, 0),
    inversiones: groupedAssets.inversiones.reduce((sum, a) => sum + a.saldoActual, 0),
    bienRaiz: groupedAssets.bienRaiz.reduce((sum, a) => sum + a.saldoActual, 0),
    empresas: groupedAssets.empresas.reduce((sum, a) => sum + a.saldoActual, 0)
  };

  const totalActivos = Object.values(totales).reduce((sum, amount) => sum + amount, 0);

  // Calcular porcentajes de distribución
  const calcularPorcentaje = (amount: number) => totalActivos > 0 ? (amount / totalActivos) * 100 : 0;

  // Determinar el rendimiento de inversiones
  const rendimientoInversiones = groupedAssets.inversiones.map(account => ({
    ...account,
    rendimiento: account.saldoActual - account.saldoInicial,
    rendimientoPorcentaje: account.saldoInicial > 0 ? ((account.saldoActual - account.saldoInicial) / account.saldoInicial) * 100 : 0
  }));

  const getTrendIcon = (amount: number) => {
    if (amount > 0) return <TrendingUp className="h-4 w-4 text-success" />;
    if (amount < 0) return <TrendingDown className="h-4 w-4 text-destructive" />;
    return null;
  };

  const getTrendColor = (amount: number) => {
    if (amount > 0) return 'text-success';
    if (amount < 0) return 'text-destructive';
    return 'text-muted-foreground';
  };

  const getAssetIcon = (tipo: string) => {
    switch (tipo) {
      case 'Efectivo':
      case 'Banco':
      case 'Ahorros':
        return <Wallet className="h-5 w-5" />;
      case 'Inversiones':
        return <PieChart className="h-5 w-5" />;
      case 'Bien Raíz':
        return <Building className="h-5 w-5" />;
      case 'Empresa Propia':
        return <DollarSign className="h-5 w-5" />;
      default:
        return <Wallet className="h-5 w-5" />;
    }
  };

  return (
    <div className="space-y-6">
      {/* Resumen General de Activos */}
      <Card className="border-success/20 hover:border-success/40 transition-all duration-300">
        <CardHeader>
          <CardTitle className="text-success flex items-center gap-2">
            <DollarSign className="h-5 w-5" />
            Resumen de Activos
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
            <div className="text-center p-4 rounded-lg bg-success/5">
              <Wallet className="h-8 w-8 mx-auto mb-2 text-success" />
              <p className="text-sm text-muted-foreground">Liquidez Inmediata</p>
              <p className="text-xl font-bold text-success">{formatCurrency(totales.liquidez)}</p>
              <p className="text-xs text-muted-foreground">{calcularPorcentaje(totales.liquidez).toFixed(1)}% del total</p>
            </div>
            <div className="text-center p-4 rounded-lg bg-primary/5">
              <PieChart className="h-8 w-8 mx-auto mb-2 text-primary" />
              <p className="text-sm text-muted-foreground">Inversiones</p>
              <p className="text-xl font-bold text-primary">{formatCurrency(totales.inversiones)}</p>
              <p className="text-xs text-muted-foreground">{calcularPorcentaje(totales.inversiones).toFixed(1)}% del total</p>
            </div>
            <div className="text-center p-4 rounded-lg bg-warning/5">
              <Building className="h-8 w-8 mx-auto mb-2 text-warning" />
              <p className="text-sm text-muted-foreground">Bienes Raíces</p>
              <p className="text-xl font-bold text-warning">{formatCurrency(totales.bienRaiz)}</p>
              <p className="text-xs text-muted-foreground">{calcularPorcentaje(totales.bienRaiz).toFixed(1)}% del total</p>
            </div>
            <div className="text-center p-4 rounded-lg bg-accent/5">
              <DollarSign className="h-8 w-8 mx-auto mb-2 text-accent" />
              <p className="text-sm text-muted-foreground">Empresas Propias</p>
              <p className="text-xl font-bold text-accent">{formatCurrency(totales.empresas)}</p>
              <p className="text-xs text-muted-foreground">{calcularPorcentaje(totales.empresas).toFixed(1)}% del total</p>
            </div>
          </div>
          
          <div className="p-4 rounded-lg bg-success/10 border-2 border-success/30">
            <div className="flex justify-between items-center">
              <span className="font-semibold text-success">Total de Activos</span>
              <span className="text-2xl font-bold text-success">{formatCurrency(totalActivos)}</span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Detalle por Categoría de Activos */}
      {Object.entries(groupedAssets).map(([categoria, cuentas]) => {
        if (cuentas.length === 0) return null;
        
        const categoriaInfo = {
          liquidez: { nombre: 'Liquidez Inmediata', color: 'success', description: 'Dinero disponible de inmediato' },
          inversiones: { nombre: 'Inversiones', color: 'primary', description: 'Activos financieros que generan rendimientos' },
          bienRaiz: { nombre: 'Bienes Raíces', color: 'warning', description: 'Propiedades y terrenos' },
          empresas: { nombre: 'Empresas Propias', color: 'accent', description: 'Participaciones en empresas propias' }
        };

        const info = categoriaInfo[categoria as keyof typeof categoriaInfo];
        const total = totales[categoria as keyof typeof totales];

        return (
          <Card key={categoria} className={`border-${info.color}/20 hover:border-${info.color}/40 transition-all duration-300`}>
            <CardHeader>
              <CardTitle className={`text-${info.color} flex items-center gap-2`}>
                {getAssetIcon(cuentas[0].tipo)}
                {info.nombre}
              </CardTitle>
              <p className="text-sm text-muted-foreground">{info.description}</p>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Resumen de la categoría */}
              <div className={`p-3 rounded-lg bg-${info.color}/5 border border-${info.color}/20`}>
                <div className="flex justify-between items-center mb-2">
                  <span className="text-sm text-muted-foreground">Total de la categoría</span>
                  <span className={`font-bold text-${info.color} text-lg`}>{formatCurrency(total)}</span>
                </div>
                <Progress value={calcularPorcentaje(total)} className="h-2" />
                <p className="text-xs text-muted-foreground mt-1">
                  {calcularPorcentaje(total).toFixed(1)}% de todos los activos
                </p>
              </div>

              {/* Detalle de cada cuenta */}
              <div className="space-y-3">
                 {cuentas.map(cuenta => {
                   const porcentajeCategoria = total > 0 ? (cuenta.saldoActual / total) * 100 : 0;
                   const rendimiento = cuenta.saldoActual - cuenta.saldoInicial;
                   const isVendida = (cuenta as any).vendida;
                   
                    return (
                      <div key={cuenta.id} className={`p-3 rounded-lg border bg-card hover:bg-muted/5 transition-colors ${isVendida ? 'opacity-60' : ''}`}>
                        <div className="flex justify-between items-start mb-2">
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-1">
                              <h4 className={`font-medium ${isVendida ? 'line-through text-muted-foreground' : ''}`}>
                                {cuenta.nombre}
                              </h4>
                              <Badge variant="outline" className="text-xs">
                                {cuenta.tipo}
                              </Badge>
                              {cuenta.divisa && cuenta.divisa !== 'MXN' && (
                                <Badge variant="secondary" className="text-xs">
                                  {cuenta.divisa}
                                </Badge>
                              )}
                              {isVendida && (
                                <Badge variant="destructive" className="text-xs">
                                  Vendida
                                </Badge>
                              )}
                            </div>
                           <div className="text-sm text-muted-foreground">
                             Balance actual: <span className="font-medium text-foreground">{formatCurrency(cuenta.saldoActual)}</span>
                           </div>
                           {cuenta.saldoInicial !== cuenta.saldoActual && (
                             <div className="text-sm flex items-center gap-1 mt-1">
                               <span className="text-muted-foreground">Cambio:</span>
                               <span className={getTrendColor(rendimiento)}>
                                 {formatCurrency(Math.abs(rendimiento))}
                               </span>
                               {getTrendIcon(rendimiento)}
                             </div>
                           )}
                         </div>
                         <div className="text-right">
                           <div className="text-sm text-muted-foreground mb-1">
                             {porcentajeCategoria.toFixed(1)}% de {info.nombre.toLowerCase()}
                           </div>
                           {categoria === 'inversiones' && rendimiento !== 0 && (
                             <div className={`text-xs ${getTrendColor(rendimiento)}`}>
                               {rendimiento > 0 ? '+' : ''}{((rendimiento / cuenta.saldoInicial) * 100).toFixed(1)}%
                             </div>
                           )}
                         </div>
                       </div>
                       
                        <Progress value={porcentajeCategoria} className="h-1" />
                        
                        {/* Información adicional para inversiones */}
                        {categoria === 'inversiones' && (
                         <div className="grid grid-cols-2 gap-4 mt-3 pt-3 border-t text-xs">
                           <div>
                             <span className="text-muted-foreground">Balance inicial:</span>
                             <div className="font-medium">{formatCurrency(cuenta.saldoInicial)}</div>
                           </div>
                           <div>
                             <span className="text-muted-foreground">Rendimiento:</span>
                             <div className={`font-medium ${getTrendColor(rendimiento)}`}>
                               {formatCurrency(rendimiento)}
                             </div>
                           </div>
                         </div>
                       )}

                        {/* Botón para marcar como vendida/activa en bienes raíces y empresas propias */}
                        {(categoria === 'bienRaiz' || categoria === 'empresas') && (
                          <div className="flex justify-end mt-3">
                            <Button
                              size="sm"
                              variant={isVendida ? "outline" : "destructive"}
                              onClick={() => handleToggleVendida(cuenta.id, isVendida, cuenta.saldoInicial)}
                              className="text-xs"
                            >
                              {isVendida ? (
                                <>
                                  <XCircle className="h-3 w-3 mr-1" />
                                  Marcar como Activa
                                </>
                              ) : (
                                <>
                                  <CheckCircle className="h-3 w-3 mr-1" />
                                  Marcar como Vendida
                                </>
                              )}
                            </Button>
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

      {/* Análisis y Recomendaciones */}
      <Card className="border-info/20 hover:border-info/40 transition-all duration-300">
        <CardHeader>
          <CardTitle className="text-info flex items-center gap-2">
            <Info className="h-5 w-5" />
            Análisis de Activos
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="p-4 rounded-lg bg-info/5 border border-info/20">
              <h4 className="font-semibold mb-2">Diversificación de Activos</h4>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span>Liquidez:</span>
                  <span>{calcularPorcentaje(totales.liquidez).toFixed(1)}%</span>
                </div>
                <div className="flex justify-between">
                  <span>Inversiones:</span>
                  <span>{calcularPorcentaje(totales.inversiones).toFixed(1)}%</span>
                </div>
                <div className="flex justify-between">
                  <span>Bienes Raíces:</span>
                  <span>{calcularPorcentaje(totales.bienRaiz).toFixed(1)}%</span>
                </div>
                <div className="flex justify-between">
                  <span>Empresas:</span>
                  <span>{calcularPorcentaje(totales.empresas).toFixed(1)}%</span>
                </div>
              </div>
            </div>
            
            <div className="p-4 rounded-lg bg-warning/5 border border-warning/20">
              <h4 className="font-semibold mb-2">Salud Financiera</h4>
              <div className="space-y-2 text-sm">
                <div className="flex items-center gap-2">
                  <Wallet className="h-4 w-4" />
                  <span>
                    {totales.liquidez > 50000 ? 'Excelente liquidez' : 
                     totales.liquidez > 20000 ? 'Buena liquidez' : 'Liquidez limitada'}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <PieChart className="h-4 w-4" />
                  <span>
                    {calcularPorcentaje(totales.inversiones) > 20 ? 'Bien diversificado' : 
                     calcularPorcentaje(totales.inversiones) > 10 ? 'Moderadamente diversificado' : 'Baja diversificación'}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <Building className="h-4 w-4" />
                  <span>
                    {totales.bienRaiz > 0 ? 'Con activos inmobiliarios' : 'Sin activos inmobiliarios'}
                  </span>
                </div>
              </div>
            </div>
          </div>

          <div className="p-4 rounded-lg bg-accent/5 border border-accent/20">
            <h4 className="font-semibold mb-2">Recomendaciones</h4>
            <ul className="text-sm space-y-1">
              {totales.liquidez < 20000 && (
                <li className="flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full bg-warning"></div>
                  Considera mantener más liquidez para emergencias (3-6 meses de gastos)
                </li>
              )}
              {calcularPorcentaje(totales.inversiones) < 15 && (
                <li className="flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full bg-primary"></div>
                  Considera aumentar tu portafolio de inversiones para hacer crecer tu patrimonio
                </li>
              )}
              {calcularPorcentaje(totales.liquidez) > 50 && (
                <li className="flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full bg-success"></div>
                  Tienes mucha liquidez, considera diversificar en inversiones o bienes raíces
                </li>
              )}
              <li className="flex items-center gap-2">
                <div className="w-2 h-2 rounded-full bg-info"></div>
                Revisa periódicamente el rendimiento de tus inversiones y rebalancea si es necesario
              </li>
            </ul>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};