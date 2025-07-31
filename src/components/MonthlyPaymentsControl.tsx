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
      const now = new Date();
      const data: PaymentData[] = [];

      targetCategories.forEach(categoria => {
        // Filtrar transacciones de esta categoría de tipo ingreso
        const categoryTransactions = transactions.filter(t => 
          t.subcategoria === categoria && t.tipo === 'Ingreso'
        );

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
    <Card className="border-primary/20 hover:border-primary/40 transition-all duration-300">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-primary">
          <CalendarDays className="h-5 w-5" />
          Control de Pagos Mensuales
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-6">
          {paymentsData.map((categoryData) => (
            <div key={categoryData.categoria} className="space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="font-semibold text-foreground">{categoryData.categoria}</h3>
                {categoryData.hayChangio && (
                  <Alert className="border-warning/50 bg-warning/5 w-auto py-1 px-3">
                    <AlertTriangle className="h-4 w-4 text-warning" />
                    <AlertDescription className="text-xs text-warning">
                      Cambio detectado
                    </AlertDescription>
                  </Alert>
                )}
              </div>

              {/* Información del último pago */}
              <div className="p-3 rounded-lg bg-accent/5 border border-accent/20">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm text-muted-foreground">Último pago:</span>
                  <div className="flex items-center gap-2">
                    <span className="font-bold">
                      {formatCurrency(categoryData.ultimoMonto)}
                    </span>
                    {getChangeIcon(categoryData.ultimoMonto, categoryData.montoPrevio)}
                  </div>
                </div>
                {categoryData.hayChangio && categoryData.montoPrevio > 0 && (
                  <div className="text-xs text-muted-foreground">
                    Anterior: {formatCurrency(categoryData.montoPrevio)} 
                    <span className={getChangeColor(categoryData.ultimoMonto, categoryData.montoPrevio)}>
                      {' '}({categoryData.ultimoMonto > categoryData.montoPrevio ? '+' : ''}
                      {formatCurrency(categoryData.ultimoMonto - categoryData.montoPrevio)})
                    </span>
                  </div>
                )}
              </div>

              {/* Timeline de pagos (últimos 6 meses) */}
              <div className="grid grid-cols-6 gap-2">
                {categoryData.pagos.slice(-6).map((pago, index) => (
                  <div key={index} className="text-center">
                    <div className="text-xs text-muted-foreground mb-1">{pago.mes}</div>
                    <div className={`p-2 rounded text-xs ${
                      pago.hayPago 
                        ? 'bg-success/10 border border-success/30 text-success' 
                        : 'bg-muted/50 border border-muted text-muted-foreground'
                    }`}>
                      {pago.hayPago ? (
                        <div>
                          <div className="font-semibold">
                            {new Intl.NumberFormat('es-MX', {
                              style: 'currency',
                              currency: 'MXN',
                              minimumFractionDigits: 0,
                              maximumFractionDigits: 0,
                            }).format(pago.monto)}
                          </div>
                          {pago.fecha && (
                            <div className="text-xs opacity-75">
                              {pago.fecha.getDate()}/{pago.fecha.getMonth() + 1}
                            </div>
                          )}
                        </div>
                      ) : (
                        <div className="font-semibold">Sin pago</div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}

          {paymentsData.length === 0 && (
            <div className="text-center text-muted-foreground py-6">
              No se encontraron pagos para las categorías monitoreadas
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
};