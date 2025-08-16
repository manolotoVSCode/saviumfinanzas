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
  comentario: string;
  categoria: string;
  subcategoria: string;
  subcategoriaId: string; // Cambiado a camelCase para coincidir con la estructura real
  divisa: string;
  tipo: string;
}

interface PaymentData {
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
  categories?: any[]; // Añadimos categorías para hacer el match
}

export const MonthlyPaymentsControl = ({ transactions, formatCurrency }: MonthlyPaymentsControlProps) => {
  const [paymentsData, setPaymentsData] = useState<PaymentData[]>([]);
  const [expandedCategories, setExpandedCategories] = useState<Set<string>>(new Set());

  const targetCategories = [
    'Renta AO274',
    'Rendimiento Tortracs25', 
    'Rendimiento Tortracs13',
    'Rendimiento QUANT'
  ];

  useEffect(() => {
    const analyzePayments = () => {
      console.log('=== DEBUG PAGOS MENSUALES ===');
      console.log('Total transacciones:', transactions.length);
      console.log('Categorías objetivo:', targetCategories);
      
      // Verificar qué subcategorías existen
      const subcategorias = [...new Set(transactions.map(t => t.subcategoria))];
      console.log('Subcategorías disponibles:', subcategorias);
      
      const ingresoTransactions = transactions.filter(t => t.tipo === 'Ingreso');
      console.log('Transacciones de ingreso:', ingresoTransactions.length);
      
      const now = new Date();
      const data: PaymentData[] = [];

      targetCategories.forEach(categoria => {
        console.log(`\n--- Analizando ${categoria} ---`);
        
        // Debug: Ver todas las transacciones de tipo ingreso para esta categoría
        const allIngressTransactions = transactions.filter(t => t.tipo === 'Ingreso');
        console.log(`Total transacciones de ingreso:`, allIngressTransactions.length);
        
        // Debug: Ver las subcategorías exactas de las transacciones de ingreso
        allIngressTransactions.forEach(t => {
          console.log(`Transacción ingreso - subcategoria: "${t.subcategoria}", monto: ${t.ingreso}, fecha: ${t.fecha}`);
        });
        
        // Filtrar transacciones de esta categoría de tipo ingreso
        const categoryTransactions = transactions.filter(t => 
          t.subcategoria === categoria && t.tipo === 'Ingreso'
        );
        console.log(`Transacciones encontradas para ${categoria}:`, categoryTransactions.length);
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
          const monthEnd = new Date(targetDate.getFullYear(), targetDate.getMonth() + 1, 0);
          
          // Verificar si este mes es el mes anterior al actual
          const esMesAnterior = targetDate.getFullYear() === mesAnteriorDate.getFullYear() && 
                               targetDate.getMonth() === mesAnteriorDate.getMonth();
          
          // Buscar pagos en este mes
          const monthPayments = categoryTransactions.filter(t => {
            const transactionDate = new Date(t.fecha);
            return transactionDate >= monthStart && transactionDate <= monthEnd;
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

        // Calcular promedio y total del año
        const promedioPago = pagosConMonto.length > 0 
          ? pagosConMonto.reduce((sum, p) => sum + p.monto, 0) / pagosConMonto.length 
          : 0;
        const totalAnio = pagosConMonto.reduce((sum, p) => sum + p.monto, 0);
        
        // Calcular variación respecto al promedio
        const variacion = promedioPago > 0 && ultimoMonto > 0 
          ? ((ultimoMonto - promedioPago) / promedioPago) * 100 
          : 0;

        // Verificar si no hay pago en el mes anterior
        const pagoMesAnterior = pagos.find(p => p.esMesAnterior);
        const sinPagoMesAnterior = !pagoMesAnterior?.hayPago;

        data.push({
          categoria,
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
    };

    analyzePayments();
  }, [transactions]);

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
              key={categoryData.categoria}
              open={expandedCategories.has(categoryData.categoria)}
              onOpenChange={() => toggleCategoryExpansion(categoryData.categoria)}
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
                        expandedCategories.has(categoryData.categoria) ? 'rotate-180' : ''
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
                            {categoryData.variacion > 0 ? '+' : ''}{categoryData.variacion.toFixed(1)}%
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
                                      {pago.fecha.toLocaleDateString('es-MX', { 
                                        day: '2-digit', 
                                        month: 'short' 
                                      })}
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
            <p className="text-xs">Revisa la consola (F12) para ver las subcategorías disponibles</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
};