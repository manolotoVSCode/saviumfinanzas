import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useFinanceDataSupabase } from '@/hooks/useFinanceDataSupabase';
import { useAppConfig } from '@/hooks/useAppConfig';
import { supabase } from '@/integrations/supabase/client';
import { CreditCard, Calendar, Clock, Repeat, RefreshCw } from 'lucide-react';
import { useMemo, useState, useEffect } from 'react';
import { toast } from 'sonner';

interface SubscriptionService {
  serviceName: string;
  tipoServicio: string;
  ultimoPago: {
    monto: number;
    fecha: Date;
    mes: string;
  };
  frecuencia: 'Mensual' | 'Anual' | 'Irregular';
  proximoPago: Date;
  numeroPagos: number;
  originalComments: string[];
}

interface AIAnalysisResult {
  groups: {
    serviceName: string;
    description: string;
    originalComments: string[];
  }[];
}

export const SubscriptionsManager = () => {
  const { formatCurrency } = useAppConfig();
  const financeData = useFinanceDataSupabase();
  const { categories, transactions } = financeData;
  const [services, setServices] = useState<SubscriptionService[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  // Obtener todas las transacciones de suscripciones de los últimos 12 meses
  const subscriptionTransactions = useMemo(() => {
    if (!transactions || !categories || transactions.length === 0 || categories.length === 0) {
      return [];
    }

    const subscriptionCategories = categories.filter(c => 
      c.subcategoria.toLowerCase().includes('suscripciones')
    );

    if (subscriptionCategories.length === 0) {
      return [];
    }

    const twelveMonthsAgo = new Date();
    twelveMonthsAgo.setMonth(twelveMonthsAgo.getMonth() - 12);

    const subscriptionIds = subscriptionCategories.map(c => c.id);

    return transactions.filter(t => 
      subscriptionIds.includes(t.subcategoriaId!) && 
      t.gasto > 0 &&
      new Date(t.fecha) >= twelveMonthsAgo
    );
  }, [transactions, categories]);

  // Función para determinar la frecuencia de pagos
  const determineFrecuencia = (transactions: any[]): 'Mensual' | 'Anual' | 'Irregular' => {
    if (transactions.length < 2) return 'Irregular';
    
    const sortedTransactions = transactions.sort((a, b) => 
      new Date(a.fecha).getTime() - new Date(b.fecha).getTime()
    );
    
    const intervals = [];
    for (let i = 1; i < sortedTransactions.length; i++) {
      const diff = new Date(sortedTransactions[i].fecha).getTime() - 
                   new Date(sortedTransactions[i-1].fecha).getTime();
      intervals.push(diff / (1000 * 60 * 60 * 24)); // días
    }
    
    const avgInterval = intervals.reduce((a, b) => a + b, 0) / intervals.length;
    
    if (avgInterval >= 25 && avgInterval <= 35) return 'Mensual';
    if (avgInterval >= 350 && avgInterval <= 380) return 'Anual';
    return 'Irregular';
  };

  // Calcular próximo pago estimado
  const calculateNextPayment = (lastPayment: Date, frequency: 'Mensual' | 'Anual' | 'Irregular'): Date => {
    const nextPayment = new Date(lastPayment);
    
    switch (frequency) {
      case 'Mensual':
        nextPayment.setMonth(nextPayment.getMonth() + 1);
        break;
      case 'Anual':
        nextPayment.setFullYear(nextPayment.getFullYear() + 1);
        break;
      case 'Irregular':
        nextPayment.setMonth(nextPayment.getMonth() + 1); // Asumimos mensual por defecto
        break;
    }
    
    return nextPayment;
  };

  // Analizar y procesar servicios automáticamente
  const processSubscriptions = async () => {
    if (subscriptionTransactions.length === 0) {
      setServices([]);
      return;
    }

    setIsLoading(true);
    try {
      const uniqueComments = [...new Set(subscriptionTransactions.map(t => t.comentario))];
      
      const { data, error } = await supabase.functions.invoke('analyze-subscriptions', {
        body: { comments: uniqueComments }
      });

      if (error) {
        console.error('Error calling AI function:', error);
        // Fallback sin IA - agrupar por comentario único
        const fallbackServices = uniqueComments.map(comment => {
          const relatedTransactions = subscriptionTransactions.filter(t => t.comentario === comment);
          const sortedTransactions = relatedTransactions.sort((a, b) => 
            new Date(b.fecha).getTime() - new Date(a.fecha).getTime()
          );
          const lastTransaction = sortedTransactions[0];
          const frequency = determineFrecuencia(relatedTransactions);
          
          return {
            serviceName: comment.split(' ')[0] || comment.substring(0, 20),
            tipoServicio: 'Servicio de suscripción',
            ultimoPago: {
              monto: lastTransaction.gasto,
              fecha: new Date(lastTransaction.fecha),
              mes: new Date(lastTransaction.fecha).toLocaleDateString('es-ES', { month: 'long', year: 'numeric' })
            },
            frecuencia: frequency,
            proximoPago: calculateNextPayment(new Date(lastTransaction.fecha), frequency),
            numeroPagos: relatedTransactions.length,
            originalComments: [comment]
          };
        });
        
        setServices(fallbackServices);
        return;
      }

      const aiResult: AIAnalysisResult = data;
      
      // Procesar resultados con IA
      const processedServices: SubscriptionService[] = aiResult.groups.map(group => {
        const relatedTransactions = subscriptionTransactions.filter(t => 
          group.originalComments.includes(t.comentario)
        );

        if (relatedTransactions.length === 0) return null;

        const sortedTransactions = relatedTransactions.sort((a, b) => 
          new Date(b.fecha).getTime() - new Date(a.fecha).getTime()
        );
        const lastTransaction = sortedTransactions[0];
        const frequency = determineFrecuencia(relatedTransactions);

        return {
          serviceName: group.serviceName,
          tipoServicio: group.description,
          ultimoPago: {
            monto: lastTransaction.gasto,
            fecha: new Date(lastTransaction.fecha),
            mes: new Date(lastTransaction.fecha).toLocaleDateString('es-ES', { month: 'long', year: 'numeric' })
          },
          frecuencia: frequency,
          proximoPago: calculateNextPayment(new Date(lastTransaction.fecha), frequency),
          numeroPagos: relatedTransactions.length,
          originalComments: group.originalComments
        };
      }).filter(Boolean) as SubscriptionService[];

      // Eliminar duplicados por nombre de servicio
      const uniqueServices = processedServices.reduce((acc, service) => {
        const existing = acc.find(s => s.serviceName.toLowerCase() === service.serviceName.toLowerCase());
        if (!existing) {
          acc.push(service);
        } else if (service.numeroPagos > existing.numeroPagos) {
          // Reemplazar si el actual tiene más pagos
          const index = acc.indexOf(existing);
          acc[index] = service;
        }
        return acc;
      }, [] as SubscriptionService[]);

      setServices(uniqueServices.sort((a, b) => 
        new Date(b.ultimoPago.fecha).getTime() - new Date(a.ultimoPago.fecha).getTime()
      ));

    } catch (error) {
      console.error('Error processing subscriptions:', error);
      toast.error('Error al procesar las suscripciones');
    } finally {
      setIsLoading(false);
    }
  };

  // Procesar automáticamente cuando cambien las transacciones
  useEffect(() => {
    processSubscriptions();
  }, [subscriptionTransactions.length]);

  // Función para obtener el color del badge de frecuencia
  const getFrequencyBadgeVariant = (frequency: string) => {
    switch (frequency) {
      case 'Mensual': return 'default';
      case 'Anual': return 'secondary';
      default: return 'outline';
    }
  };

  return (
    <Card className="hover-scale border-primary/20 hover:border-primary/40 transition-all duration-300">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 justify-between">
          <div className="flex items-center gap-2">
            <CreditCard className="h-5 w-5" />
            Suscripciones Activas
          </div>
          {isLoading && <RefreshCw className="h-4 w-4 animate-spin" />}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex justify-between items-center">
          <p className="text-muted-foreground text-sm">
            Análisis automático de los últimos 12 meses
          </p>
          <Badge variant="outline" className="text-xs">
            {services.length} servicios detectados
          </Badge>
        </div>

        {services.length === 0 && !isLoading ? (
          <div className="text-center py-8 text-muted-foreground">
            <CreditCard className="h-12 w-12 mx-auto mb-4 opacity-50" />
            <p>No se detectaron suscripciones</p>
            <p className="text-sm">Agrega transacciones en categorías de "Suscripciones"</p>
          </div>
        ) : (
          <div className="space-y-4">
            {services.map((service, index) => (
              <div key={index} className="p-4 rounded-lg border bg-card hover:bg-muted/5 transition-colors">
                <div className="flex items-start justify-between mb-3">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <h3 className="font-semibold text-lg">{service.serviceName}</h3>
                      <Badge variant={getFrequencyBadgeVariant(service.frecuencia)} className="text-xs">
                        {service.frecuencia}
                      </Badge>
                    </div>
                    <p className="text-sm text-muted-foreground">{service.tipoServicio}</p>
                  </div>
                  <Badge variant="secondary" className="text-xs">
                    {service.numeroPagos} pagos
                  </Badge>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                  <div className="space-y-2">
                    <div className="flex items-center gap-2">
                      <Calendar className="h-4 w-4 text-muted-foreground" />
                      <div>
                        <span className="text-muted-foreground">Último pago:</span>
                        <div className="font-medium">{service.ultimoPago.mes}</div>
                        <div className="text-primary font-bold text-lg">
                          ${formatCurrency(service.ultimoPago.monto)}
                        </div>
                      </div>
                    </div>
                  </div>
                  
                  <div className="space-y-2">
                    <div className="flex items-center gap-2">
                      <Clock className="h-4 w-4 text-muted-foreground" />
                      <div>
                        <span className="text-muted-foreground">Próximo pago estimado:</span>
                        <div className="font-medium">
                          {service.proximoPago.toLocaleDateString('es-ES', { 
                            day: 'numeric',
                            month: 'long', 
                            year: 'numeric' 
                          })}
                        </div>
                        <div className="flex items-center gap-1 mt-1">
                          <Repeat className="h-3 w-3 text-muted-foreground" />
                          <span className="text-xs text-muted-foreground">
                            Frecuencia: {service.frecuencia}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {subscriptionTransactions.length > 0 && (
          <div className="border-t pt-4 text-center">
            <p className="text-xs text-muted-foreground">
              Detectadas {subscriptionTransactions.length} transacciones de suscripciones en los últimos 12 meses
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
};