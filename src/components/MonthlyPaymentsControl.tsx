import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { CalendarDays, TrendingUp, TrendingDown, AlertTriangle, ChevronDown, Calculator, DollarSign, Calendar, TrendingUp as TrendIcon } from 'lucide-react';
import { useEffect, useState } from 'react';

interface Transaction {
  id: string;
  fecha: Date;
  ingreso: number;
  gasto?: number;
  comentario: string;
  subcategoriaId?: string;
  divisa: string;
}


interface PaymentData {
  id: string;
  categoria: string;
  pagos: {
    mes: string;
    fecha: Date | null;
    monto: number;
    hayPago: boolean;
    esMesAnterior: boolean; // Marcar si es el mes anterior al actual
  }[];
  ultimoMonto: number;
  montoPrevio: number;
  hayChangio: boolean;
  sinPagoMesAnterior: boolean; // Indicador si falta pago en mes anterior
  promedioPago: number;
  totalAnio: number;
  variacion: number; // Porcentaje de variación respecto al promedio
}


interface MonthlyPaymentsControlProps {
  transactions: Transaction[];
  formatCurrency: (amount: number) => string;
  categories?: any[]; // Agregamos categorías para obtener las marcadas para seguimiento
}

export const MonthlyPaymentsControl = ({ transactions, formatCurrency, categories = [] }: MonthlyPaymentsControlProps) => {
  const [paymentsData, setPaymentsData] = useState<PaymentData[]>([]);
  const [expandedCategories, setExpandedCategories] = useState<Set<string>>(new Set());

  // Obtener categorías marcadas para seguimiento de pago
  const getTrackedCategories = () => {
    return categories
      .filter((cat: any) => cat.seguimiento_pago === true)
      .map((cat: any) => cat.id);
  };

  useEffect(() => {
    const analyzePayments = () => {
      const targetCategories = getTrackedCategories();
      
      console.log('=== DEBUG PAGOS MENSUALES ===');
      console.log('Total transacciones:', transactions.length);
      console.log('Categorías con seguimiento:', targetCategories);
      
      if (targetCategories.length === 0) {
        console.log('No hay categorías marcadas para seguimiento');
        setPaymentsData([]);
        return;
      }
      
      // Verificar qué subcategorías existen
      const subcategorias = [...new Set(transactions.map(t => t.subcategoriaId).filter(Boolean))];
      console.log('Subcategorías disponibles (IDs):', subcategorias);
      
      const ingresoTransactions = transactions.filter(t => Number(t.ingreso) > 0);
      console.log('Transacciones de ingreso:', ingresoTransactions.length);
      
      const now = new Date();
      const data: PaymentData[] = [];

        targetCategories.forEach(categoriaId => {
          const catInfo = categories.find((c: any) => c.id === categoriaId);
          const categoriaLabel = catInfo?.subcategoria || '(Sin subcategoría)';
          
          console.log(`\n--- Analizando ${categoriaLabel} (${categoriaId}) ---`);
          
          // Debug: Buscar específicamente el pago de hipoteca
          const hipotecaTransactions = transactions.filter(t => 
            t.comentario.toLowerCase().includes('hipoteca') || 
            t.comentario.toLowerCase().includes('aportación')
          );
          
          if (hipotecaTransactions.length > 0) {
            console.log('🏠 Transacciones relacionadas con hipoteca/aportación encontradas:');
            hipotecaTransactions.forEach(t => {
              const catInfo = categories.find(c => c.id === t.subcategoriaId);
              console.log(`- Comentario: "${t.comentario}"`, 
                         `Subcategoría: "${catInfo?.subcategoria || 'No encontrada'}" (${t.subcategoriaId})`, 
                         `Seguimiento: ${catInfo?.seguimiento_pago}`,
                         `Monto: ${t.ingreso || t.gasto}`,
                         `Fecha: ${t.fecha}`);
            });
          }
          
          // Filtrar transacciones de esta categoría de tipo ingreso
          const categoryTransactions = transactions.filter(t => 
            t.subcategoriaId === categoriaId && Number(t.ingreso) > 0
          );
          console.log(`Transacciones encontradas para ${categoriaLabel}:`, categoryTransactions.length);
          if (categoryTransactions.length > 0) {
            console.log('Transacciones encontradas:', categoryTransactions);
          }

        // Generar datos para los últimos 12 meses
        const pagos = [];
        const monthNames = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'];
        
        // Calcular el mes anterior al actual (ej: si estamos en julio 2025, mes anterior es junio 2025)
        const mesAnteriorDate = new Date(now.getFullYear(), now.getMonth() - 1, 1);
        
        for (let i = 11; i >= 0; i--) {
          const targetDate = new Date(now.getFullYear(), now.getMonth() - i, 1);
          const monthStart = new Date(targetDate.getFullYear(), targetDate.getMonth(), 1);
          const monthEnd = new Date(targetDate.getFullYear(), targetDate.getMonth() + 1, 0, 23, 59, 59, 999);
          
          // Verificar si este mes es el mes anterior al actual
          const esMesAnterior = targetDate.getFullYear() === mesAnteriorDate.getFullYear() && 
                               targetDate.getMonth() === mesAnteriorDate.getMonth();
          
          // Buscar pagos en este mes (comparación por mes/año en UTC para evitar problemas de zona horaria)
          const targetUTCStart = new Date(Date.UTC(targetDate.getFullYear(), targetDate.getMonth(), 1));
          const targetUTCYear = targetUTCStart.getUTCFullYear();
          const targetUTCMonth = targetUTCStart.getUTCMonth();

          const monthPayments = categoryTransactions.filter(t => {
            const d = new Date(t.fecha);
            return d.getUTCFullYear() === targetUTCYear && d.getUTCMonth() === targetUTCMonth;
          });

          const totalMonto = monthPayments.reduce((sum, t) => sum + t.ingreso, 0);
          const latestPayment = monthPayments.sort((a, b) => 
            new Date(b.fecha).getTime() - new Date(a.fecha).getTime()
          )[0];

          const mesLabel = `${monthNames[targetDate.getMonth()]} ${targetDate.getFullYear().toString().slice(-2)}`;
          
          pagos.push({
            mes: mesLabel,
            fecha: latestPayment ? new Date(latestPayment.fecha) : null,
            monto: totalMonto,
            hayPago: totalMonto > 0,
            esMesAnterior
          });
        }

        // Calcular estadísticas adicionales
        const pagosConMonto = pagos.filter(p => p.hayPago && p.monto > 0);
        const ultimoMonto = pagosConMonto.length > 0 ? pagosConMonto[pagosConMonto.length - 1].monto : 0;
        const montoPrevio = pagosConMonto.length > 1 ? pagosConMonto[pagosConMonto.length - 2].monto : 0;
        const hayChangio = montoPrevio > 0 && Math.abs(ultimoMonto - montoPrevio) > 0.01;

        // Calcular promedio de los últimos 3 meses completos (excluyendo el mes actual)
        // Obtener los últimos 3 meses (posiciones 8, 9, 10 en el array de pagos que va de más antiguo a más reciente)
        const ultimos3Meses = pagos.slice(-4, -1); // Excluimos el último mes (actual) y tomamos los 3 anteriores
        const totalUltimos3Meses = ultimos3Meses.reduce((sum, p) => sum + p.monto, 0);
        const promedioPago = totalUltimos3Meses / 3; // Siempre dividimos entre 3 meses
        
        const totalAnio = pagosConMonto.reduce((sum, p) => sum + p.monto, 0);
        
        // Calcular variación respecto al promedio
        const variacion = promedioPago > 0 && ultimoMonto > 0 
          ? ((ultimoMonto - promedioPago) / promedioPago) * 100 
          : 0;

        // Verificar si no hay pago en el mes anterior
        const pagoMesAnterior = pagos.find(p => p.esMesAnterior);
        const sinPagoMesAnterior = !pagoMesAnterior?.hayPago;

        data.push({
          id: categoriaId,
          categoria: categoriaLabel,
          pagos,
          ultimoMonto,
          montoPrevio,
          hayChangio,
          sinPagoMesAnterior,
          promedioPago,
          totalAnio,
          variacion
        });
      });

      console.log('Datos finales:', data);
      setPaymentsData(data);
      
      // Expandir todas las categorías por defecto
      const allCategories = new Set(data.map(d => d.id));
      setExpandedCategories(allCategories);
    };

    analyzePayments();
  }, [transactions, categories]); // Agregamos categories como dependencia

  const getChangeIcon = (current: number, previous: number) => {
    if (previous === 0) return null;
    if (current > previous) return <TrendingUp className="h-4 w-4 text-success" />;
    if (current < previous) return <TrendingDown className="h-4 w-4 text-destructive" />;
    return null;
  };

  const getChangeColor = (current: number, previous: number) => {
    if (previous === 0) return 'text-muted-foreground';
    if (current > previous) return 'text-success';
    if (current < previous) return 'text-destructive';
    return 'text-muted-foreground';
  };

  const toggleCategoryExpansion = (categoria: string) => {
    const newExpanded = new Set(expandedCategories);
    if (newExpanded.has(categoria)) {
      newExpanded.delete(categoria);
    } else {
      newExpanded.add(categoria);
    }
    setExpandedCategories(newExpanded);
  };

  return (
    <Card className="border-muted/30 hover:border-muted/50 transition-all duration-300 bg-muted/20">
      <CardHeader className="pb-2">
        <CardTitle className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
          <CalendarDays className="h-4 w-4" />
          Control de Pagos Mensuales
        </CardTitle>
      </CardHeader>
      <CardContent className="pt-0">
        <div className="space-y-4">
          {paymentsData.map((categoryData) => (
            <Collapsible 
              key={categoryData.id}
              open={expandedCategories.has(categoryData.id)}
              onOpenChange={() => toggleCategoryExpansion(categoryData.id)}
            >
              <div className={`rounded-lg border p-4 ${
                categoryData.sinPagoMesAnterior 
                  ? 'bg-destructive/5 border-destructive/30' 
                  : 'bg-background/50 border-muted/20'
              }`}>
                <CollapsibleTrigger className="w-full">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <ChevronDown className={`h-4 w-4 transition-transform ${
                          expandedCategories.has(categoryData.id) ? 'rotate-180' : ''
                        }`} />
                      <div className="text-left">
                        <div className="flex items-center gap-2">
                          <h3 className={`font-semibold ${
                            categoryData.sinPagoMesAnterior ? 'text-destructive' : ''
                          }`}>
                            {categoryData.categoria}
                          </h3>
                          {categoryData.hayChangio && (
                            <Badge variant="outline" className="text-xs h-5 px-2 border-warning/50 text-warning">
                              <AlertTriangle className="h-3 w-3 mr-1" />
                              Variación
                            </Badge>
                          )}
                          {categoryData.sinPagoMesAnterior && (
                            <Badge variant="outline" className="text-xs h-5 px-2 border-destructive/50 text-destructive">
                              Sin pago
                            </Badge>
                          )}
                        </div>
                        <div className="flex items-center gap-4 text-sm text-muted-foreground mt-1">
                          <span>Último: {formatCurrency(categoryData.ultimoMonto)}</span>
                          <span>Promedio: {formatCurrency(categoryData.promedioPago)}</span>
                          <span>Total año: {formatCurrency(categoryData.totalAnio)}</span>
                        </div>
                      </div>
                    </div>
                    
                    <div className="flex items-center gap-4">
                      {/* Indicadores visuales compactos */}
                      <div className="flex gap-1">
                        {categoryData.pagos.slice(-6).map((pago, index) => (
                          <div
                            key={index}
                            className={`w-2 h-6 rounded-sm ${
                              pago.esMesAnterior && !pago.hayPago
                                ? 'bg-destructive/70'
                                : pago.hayPago 
                                  ? 'bg-success/70' 
                                  : 'bg-muted/40'
                            }`}
                            title={`${pago.mes}: ${pago.hayPago ? formatCurrency(pago.monto) : 'Sin pago'}${pago.esMesAnterior ? ' (Mes anterior)' : ''}`}
                          />
                        ))}
                      </div>
                      
                      {/* Icono de tendencia */}
                      <div className="w-5 flex justify-center">
                        {getChangeIcon(categoryData.ultimoMonto, categoryData.montoPrevio)}
                      </div>
                    </div>
                  </div>
                </CollapsibleTrigger>

                <CollapsibleContent className="mt-4">
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    {/* Estadísticas resumidas */}
                    <div className="space-y-3">
                      <h4 className="font-semibold text-sm flex items-center gap-2">
                        <Calculator className="h-4 w-4" />
                        Estadísticas
                      </h4>
                      <div className="grid grid-cols-2 gap-3">
                        <div className="bg-muted/30 rounded-lg p-3">
                          <div className="flex items-center gap-2 text-xs text-muted-foreground mb-1">
                            <DollarSign className="h-3 w-3" />
                            Total Año
                          </div>
                          <div className="font-semibold">{formatCurrency(categoryData.totalAnio)}</div>
                        </div>
                        <div className="bg-muted/30 rounded-lg p-3">
                          <div className="flex items-center gap-2 text-xs text-muted-foreground mb-1">
                            <TrendIcon className="h-3 w-3" />
                            Promedio
                          </div>
                          <div className="font-semibold">{formatCurrency(categoryData.promedioPago)}</div>
                        </div>
                        <div className="bg-muted/30 rounded-lg p-3">
                          <div className="flex items-center gap-2 text-xs text-muted-foreground mb-1">
                            <Calendar className="h-3 w-3" />
                            Pagos realizados
                          </div>
                          <div className="font-semibold">{categoryData.pagos.filter(p => p.hayPago).length}/12</div>
                        </div>
                        <div className="bg-muted/30 rounded-lg p-3">
                          <div className="flex items-center gap-2 text-xs text-muted-foreground mb-1">
                            <TrendingUp className="h-3 w-3" />
                            Variación
                          </div>
                          <div className={`font-semibold ${
                            categoryData.variacion > 0 ? 'text-success' : 
                            categoryData.variacion < 0 ? 'text-destructive' : ''
                          }`}>
                            {categoryData.variacion > 0 ? '+' : ''}{categoryData.variacion.toFixed(2)}%
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Historial detallado de los últimos 12 meses */}
                    <div className="space-y-3">
                      <h4 className="font-semibold text-sm flex items-center gap-2">
                        <Calendar className="h-4 w-4" />
                        Historial (últimos 12 meses)
                      </h4>
                      <div className="max-h-48 overflow-y-auto space-y-1">
                        {categoryData.pagos.slice().reverse().map((pago, index) => (
                          <div key={index} className={`flex justify-between items-center py-2 px-3 rounded text-sm ${
                            pago.hayPago ? 'bg-success/10' : 'bg-muted/20'
                          } ${pago.esMesAnterior && !pago.hayPago ? 'bg-destructive/10 border border-destructive/20' : ''}`}>
                            <div className="flex items-center gap-2">
                              <span className={`font-medium ${
                                pago.esMesAnterior && !pago.hayPago ? 'text-destructive' : ''
                              }`}>
                                {pago.mes}
                              </span>
                              {pago.esMesAnterior && !pago.hayPago && (
                                <Badge variant="outline" className="text-xs h-4 px-1 border-destructive/50 text-destructive">
                                  Faltante
                                </Badge>
                              )}
                            </div>
                            <div className="flex items-center gap-2">
                              {pago.hayPago ? (
                                <>
                                  <span className="font-semibold">{formatCurrency(pago.monto)}</span>
                                   {pago.fecha && (
                                     <span className="text-xs text-muted-foreground">
                                       {String(pago.fecha.getUTCDate()).padStart(2, '0')}-{
                                         ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 
                                          'jul', 'ago', 'sep', 'oct', 'nov', 'dic'][pago.fecha.getUTCMonth()]
                                       }
                                     </span>
                                   )}
                                </>
                              ) : (
                                <span className={`text-sm ${
                                  pago.esMesAnterior ? 'text-destructive' : 'text-muted-foreground'
                                }`}>
                                  Sin pago
                                </span>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                </CollapsibleContent>
              </div>
            </Collapsible>
          ))}
        </div>

        {paymentsData.length === 0 && (
          <div className="text-center text-muted-foreground py-8 text-sm">
            <CalendarDays className="h-12 w-12 mx-auto mb-4 opacity-50" />
            <p className="font-medium mb-2">No se encontraron pagos recurrentes</p>
            <p className="text-xs">
              Para ver datos aquí, marca categorías de ingreso para seguimiento en 
              <span className="font-semibold"> Configuración → Categorías</span>
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
};