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
  }[];
  ultimoMonto: number;
  montoPrevio: number;
  hayChangio: boolean;
}

interface MonthlyPaymentsControlProps {
  transactions: Transaction[];
  formatCurrency: (amount: number) => string;
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
        // Filtrar transacciones de esta categoría de tipo ingreso
        const categoryTransactions = transactions.filter(t => 
          t.subcategoria === categoria && t.tipo === 'Ingreso'
        );
        console.log(`Transacciones encontradas para ${categoria}:`, categoryTransactions.length);
        if (categoryTransactions.length > 0) {
          console.log('Primeras transacciones:', categoryTransactions.slice(0, 3));
        }

        // Generar datos para los últimos 12 meses
        const pagos = [];
        const monthNames = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'];
        
        for (let i = 11; i >= 0; i--) {
          const targetDate = new Date(now.getFullYear(), now.getMonth() - i, 1);
          const monthStart = new Date(targetDate.getFullYear(), targetDate.getMonth(), 1);
          const monthEnd = new Date(targetDate.getFullYear(), targetDate.getMonth() + 1, 0);
          
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
            hayPago: totalMonto > 0
          });
        }

        // Calcular si hay cambio en la mensualidad
        const pagosConMonto = pagos.filter(p => p.hayPago && p.monto > 0);
        const ultimoMonto = pagosConMonto.length > 0 ? pagosConMonto[pagosConMonto.length - 1].monto : 0;
        const montoPrevio = pagosConMonto.length > 1 ? pagosConMonto[pagosConMonto.length - 2].monto : 0;
        const hayChangio = montoPrevio > 0 && Math.abs(ultimoMonto - montoPrevio) > 0.01;

        data.push({
          categoria,
          pagos,
          ultimoMonto,
          montoPrevio,
          hayChangio
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
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
          <CalendarDays className="h-4 w-4" />
          Control de Pagos Mensuales
        </CardTitle>
      </CardHeader>
      <CardContent className="pt-0">
        <div className="space-y-3">
          {paymentsData.map((categoryData) => (
            <div key={categoryData.categoria} className="flex items-center justify-between p-2 rounded bg-background/50">
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium">{categoryData.categoria}</span>
                  {categoryData.hayChangio && (
                    <Badge variant="outline" className="text-xs h-5 border-warning/50 text-warning">
                      <AlertTriangle className="h-3 w-3 mr-1" />
                      Cambio
                    </Badge>
                  )}
                </div>
              </div>
              
              <div className="flex items-center gap-4">
                {/* Último pago */}
                <div className="text-right">
                  <div className="text-sm font-semibold">
                    {formatCurrency(categoryData.ultimoMonto)}
                  </div>
                  {categoryData.ultimoMonto > 0 && (
                    <div className="text-xs text-muted-foreground">
                      {categoryData.pagos.filter(p => p.hayPago).slice(-1)[0]?.fecha && 
                        new Date(categoryData.pagos.filter(p => p.hayPago).slice(-1)[0].fecha!).toLocaleDateString('es-MX', { 
                          day: '2-digit', 
                          month: 'short' 
                        })
                      }
                    </div>
                  )}
                </div>

                {/* Indicadores de últimos 6 meses (muy compacto) */}
                <div className="flex gap-1">
                  {categoryData.pagos.slice(-6).map((pago, index) => (
                    <div
                      key={index}
                      className={`w-2 h-6 rounded-sm ${
                        pago.hayPago 
                          ? 'bg-success/60' 
                          : 'bg-muted/40'
                      }`}
                      title={`${pago.mes}: ${pago.hayPago ? formatCurrency(pago.monto) : 'Sin pago'}`}
                    />
                  ))}
                </div>

                {/* Icono de tendencia */}
                <div className="w-4">
                  {getChangeIcon(categoryData.ultimoMonto, categoryData.montoPrevio)}
                </div>
              </div>
            </div>
          ))}

          {paymentsData.length === 0 && (
            <div className="text-center text-muted-foreground py-3 text-sm">
              No se encontraron pagos para las categorías monitoreadas
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
};