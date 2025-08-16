import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { CalendarDays, TrendingUp, TrendingDown, AlertTriangle } from 'lucide-react';
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
}

interface MonthlyPaymentsControlProps {
  transactions: Transaction[];
  formatCurrency: (amount: number) => string;
  categories?: any[]; // Añadimos categorías para hacer el match
}

export const MonthlyPaymentsControl = ({ transactions, formatCurrency }: MonthlyPaymentsControlProps) => {
  const [paymentsData, setPaymentsData] = useState<PaymentData[]>([]);

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

        // Calcular si hay cambio en la mensualidad
        const pagosConMonto = pagos.filter(p => p.hayPago && p.monto > 0);
        const ultimoMonto = pagosConMonto.length > 0 ? pagosConMonto[pagosConMonto.length - 1].monto : 0;
        const montoPrevio = pagosConMonto.length > 1 ? pagosConMonto[pagosConMonto.length - 2].monto : 0;
        const hayChangio = montoPrevio > 0 && Math.abs(ultimoMonto - montoPrevio) > 0.01;

        // Verificar si no hay pago en el mes anterior
        const pagoMesAnterior = pagos.find(p => p.esMesAnterior);
        const sinPagoMesAnterior = !pagoMesAnterior?.hayPago;

        data.push({
          categoria,
          pagos,
          ultimoMonto,
          montoPrevio,
          hayChangio,
          sinPagoMesAnterior
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

  return (
    <Card className="border-muted/30 hover:border-muted/50 transition-all duration-300 bg-muted/20">
      <CardHeader className="pb-2">
        <CardTitle className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
          <CalendarDays className="h-4 w-4" />
          Control de Pagos Mensuales
        </CardTitle>
      </CardHeader>
      <CardContent className="pt-0">
        {/* Grid compacto para aprovechar todo el espacio */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-2">
          {paymentsData.map((categoryData) => (
            <div key={categoryData.categoria} className={`flex items-center justify-between p-2 rounded border ${
              categoryData.sinPagoMesAnterior 
                ? 'bg-destructive/5 border-destructive/30' 
                : 'bg-background/50 border-muted/20'
            }`}>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className={`text-sm font-medium truncate ${
                    categoryData.sinPagoMesAnterior ? 'text-destructive' : ''
                  }`}>
                    {categoryData.categoria}
                  </span>
                  {categoryData.hayChangio && (
                    <Badge variant="outline" className="text-xs h-4 px-1 border-warning/50 text-warning">
                      <AlertTriangle className="h-2 w-2" />
                    </Badge>
                  )}
                  {categoryData.sinPagoMesAnterior && (
                    <Badge variant="outline" className="text-xs h-4 px-1 border-destructive/50 text-destructive">
                      Sin pago
                    </Badge>
                  )}
                </div>
              </div>
              
              <div className="flex items-center gap-3 ml-2">
                {/* Último pago */}
                <div className="text-right min-w-[80px]">
                  <div className={`text-sm font-semibold ${
                    categoryData.sinPagoMesAnterior ? 'text-destructive' : ''
                  }`}>
                    {categoryData.ultimoMonto > 0 ? (
                      new Intl.NumberFormat('es-MX', {
                        style: 'currency',
                        currency: 'MXN',
                        minimumFractionDigits: 0,
                        maximumFractionDigits: 0,
                      }).format(categoryData.ultimoMonto)
                    ) : (
                      <span className={categoryData.sinPagoMesAnterior ? 'text-destructive' : 'text-muted-foreground'}>
                        $0
                      </span>
                    )}
                  </div>
                  {categoryData.ultimoMonto > 0 && (
                    <div className={`text-xs ${
                      categoryData.sinPagoMesAnterior ? 'text-destructive/70' : 'text-muted-foreground'
                    }`}>
                      {categoryData.pagos.filter(p => p.hayPago).slice(-1)[0]?.fecha && 
                        new Date(categoryData.pagos.filter(p => p.hayPago).slice(-1)[0].fecha!).toLocaleDateString('es-MX', { 
                          day: '2-digit', 
                          month: 'short' 
                        })
                      }
                    </div>
                  )}
                </div>

                {/* Indicadores compactos de últimos 6 meses */}
                <div className="flex gap-1">
                  {categoryData.pagos.slice(-6).map((pago, index) => (
                    <div
                      key={index}
                      className={`w-1.5 h-5 rounded-sm ${
                        pago.esMesAnterior && !pago.hayPago
                          ? 'bg-destructive/70' // Rojo para mes anterior sin pago
                          : pago.hayPago 
                            ? 'bg-success/70' 
                            : 'bg-muted/40'
                      }`}
                      title={`${pago.mes}: ${pago.hayPago ? formatCurrency(pago.monto) : 'Sin pago'}${pago.esMesAnterior ? ' (Mes anterior)' : ''}`}
                    />
                  ))}
                </div>

                {/* Icono de tendencia */}
                <div className="w-4 flex justify-center">
                  {getChangeIcon(categoryData.ultimoMonto, categoryData.montoPrevio)}
                </div>
              </div>
            </div>
          ))}
        </div>

        {paymentsData.length === 0 && (
          <div className="text-center text-muted-foreground py-3 text-sm">
            No se encontraron pagos para las categorías monitoreadas
            <div className="text-xs mt-1 text-muted-foreground/70">
              Revisa la consola (F12) para ver las subcategorías disponibles
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
};