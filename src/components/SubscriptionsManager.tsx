import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useFinanceDataSupabase } from '@/hooks/useFinanceDataSupabase';
import { useAppConfig } from '@/hooks/useAppConfig';
import { CreditCard, Calendar, TrendingUp } from 'lucide-react';
import { useMemo } from 'react';

interface SubscriptionData {
  subcategoria: string;
  categoria: string;
  montoMensual: number;
  frecuencia: number;
  ultimoPago: number;
}

export const SubscriptionsManager = () => {
  const { formatCurrency } = useAppConfig();
  const financeData = useFinanceDataSupabase();
  const { categories, transactions } = financeData;

  // Analizar transacciones de la subcategoría "Cuotas / Suscripciones"
  const subscriptions = useMemo(() => {
    // Validar que los datos estén cargados
    if (!transactions || !categories || transactions.length === 0 || categories.length === 0) {
      return [];
    }

    // Buscar la subcategoría "Cuotas / Suscripciones"
    const subscriptionCategory = categories.find(c => 
      c.subcategoria.toLowerCase().includes('cuotas') || 
      c.subcategoria.toLowerCase().includes('suscripciones') ||
      c.subcategoria.toLowerCase() === 'cuotas / suscripciones'
    );

    if (!subscriptionCategory) {
      return [];
    }

    // Obtener solo las transacciones de esa subcategoría
    const subscriptionTransactions = transactions.filter(t => 
      t.subcategoriaId === subscriptionCategory.id && t.gasto > 0
    );

    // Agrupar por comentario/descripción para identificar diferentes servicios
    const serviceGroups: { [key: string]: any[] } = {};
    
    subscriptionTransactions.forEach(transaction => {
      // Usar el comentario como identificador del servicio
      const serviceName = transaction.comentario || 'Servicio sin nombre';
      if (!serviceGroups[serviceName]) {
        serviceGroups[serviceName] = [];
      }
      serviceGroups[serviceName].push(transaction);
    });

    // Crear lista de suscripciones con estadísticas
    const subscriptionData: SubscriptionData[] = [];
    
    Object.entries(serviceGroups).forEach(([serviceName, serviceTransactions]) => {
      const totalAmount = serviceTransactions.reduce((sum, t) => sum + t.gasto, 0);
      const avgAmount = totalAmount / serviceTransactions.length;
      const lastTransaction = serviceTransactions.sort((a, b) => b.fecha.getTime() - a.fecha.getTime())[0];
      
      subscriptionData.push({
        subcategoria: serviceName,
        categoria: subscriptionCategory.categoria,
        montoMensual: avgAmount,
        frecuencia: serviceTransactions.length,
        ultimoPago: lastTransaction.gasto
      });
    });

    return subscriptionData.sort((a, b) => b.montoMensual - a.montoMensual);
  }, [transactions, categories]);

  const totalMensual = subscriptions.reduce((sum, sub) => sum + sub.montoMensual, 0);

  return (
    <Card className="hover-scale border-primary/20 hover:border-primary/40 transition-all duration-300">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <CreditCard className="h-5 w-5" />
          Suscripciones y Gastos Recurrentes
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex justify-between items-center">
          <p className="text-muted-foreground text-sm">
            Basado en tus transacciones de los últimos 3 meses
          </p>
          <Badge variant="outline" className="text-xs">
            {subscriptions.length} servicios detectados
          </Badge>
        </div>

        {subscriptions.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            <CreditCard className="h-12 w-12 mx-auto mb-4 opacity-50" />
            <p>No se detectaron gastos recurrentes</p>
            <p className="text-sm">Necesitas al menos 2 transacciones similares para detectar patrones</p>
          </div>
        ) : (
          <>
            <div className="space-y-3">
              {subscriptions.map((subscription, index) => (
                <div key={index} className="flex items-center justify-between p-3 rounded-lg border bg-card">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <h4 className="font-medium">{subscription.subcategoria}</h4>
                      <Badge variant="secondary" className="text-xs">
                        {subscription.categoria}
                      </Badge>
                    </div>
                    <div className="flex items-center gap-4 mt-2 text-sm">
                      <span className="text-muted-foreground">
                        Aparece {subscription.frecuencia} veces
                      </span>
                      <span className="text-primary font-medium flex items-center gap-1">
                        <TrendingUp className="h-3 w-3" />
                        Promedio: ${formatCurrency(subscription.montoMensual)}
                      </span>
                    </div>
                    <div className="text-xs text-muted-foreground mt-1">
                      Último pago: ${formatCurrency(subscription.ultimoPago)}
                    </div>
                  </div>
                </div>
              ))}
            </div>

            <div className="border-t pt-4">
              <div className="flex justify-between items-center p-4 bg-primary/5 rounded-lg">
                <div className="flex items-center gap-2">
                  <Calendar className="h-5 w-5 text-primary" />
                  <span className="font-medium">Total Mensual Estimado</span>
                </div>
                <span className="text-xl font-bold text-primary">
                  ${formatCurrency(totalMensual)}
                </span>
              </div>
              <p className="text-xs text-muted-foreground mt-2 text-center">
                Calculado basándose en patrones de gasto recurrentes detectados
              </p>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
};