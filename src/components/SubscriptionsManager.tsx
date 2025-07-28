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

  // Analizar transacciones para identificar suscripciones recurrentes
  const subscriptions = useMemo(() => {
    // Validar que los datos estén cargados
    if (!transactions || !categories || transactions.length === 0 || categories.length === 0) {
      return [];
    }

    const now = new Date();
    const threeMonthsAgo = new Date(now.getFullYear(), now.getMonth() - 3, 1);
    
    // Obtener transacciones de gastos de los últimos 3 meses
    const recentExpenses = transactions.filter(t => 
      t.gasto > 0 && 
      t.fecha >= threeMonthsAgo
    );

    // Enriquecer transacciones con información de categoría
    const enrichedExpenses = recentExpenses.map(transaction => {
      const category = categories.find(c => c.id === transaction.subcategoriaId);
      return {
        ...transaction,
        subcategoria: category?.subcategoria,
        categoria: category?.categoria
      };
    }).filter(t => t.subcategoria);

    // Agrupar por subcategoría y analizar patrones
    const subcategoryGroups: { [key: string]: any[] } = {};
    
    enrichedExpenses.forEach(transaction => {
      const key = transaction.subcategoria!;
      if (!subcategoryGroups[key]) {
        subcategoryGroups[key] = [];
      }
      subcategoryGroups[key].push(transaction);
    });

    // Identificar suscripciones (aparecen múltiples veces con montos similares)
    const potentialSubscriptions: SubscriptionData[] = [];
    
    Object.entries(subcategoryGroups).forEach(([subcategoria, transactionGroup]) => {
      if (transactionGroup.length >= 2) { // Al menos 2 transacciones
        // Calcular monto promedio
        const avgAmount = transactionGroup.reduce((sum, t) => sum + t.gasto, 0) / transactionGroup.length;
        
        // Verificar si los montos son similares (variación <30%)
        const amounts = transactionGroup.map(t => t.gasto);
        const maxAmount = Math.max(...amounts);
        const minAmount = Math.min(...amounts);
        const variation = (maxAmount - minAmount) / avgAmount;
        
        if (variation < 0.3) { // Variación menor al 30%
          const lastTransaction = transactionGroup.sort((a, b) => b.fecha.getTime() - a.fecha.getTime())[0];
          const category = categories.find(c => c.id === lastTransaction.subcategoriaId);
          
          potentialSubscriptions.push({
            subcategoria,
            categoria: category?.categoria || 'Sin categoría',
            montoMensual: avgAmount,
            frecuencia: transactionGroup.length,
            ultimoPago: lastTransaction.gasto
          });
        }
      }
    });

    return potentialSubscriptions.sort((a, b) => b.montoMensual - a.montoMensual);
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