import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { useFinanceDataSupabase } from '@/hooks/useFinanceDataSupabase';
import { useAppConfig } from '@/hooks/useAppConfig';
import { supabase } from '@/integrations/supabase/client';
import { CreditCard, Calendar, Clock, Repeat, RefreshCw } from 'lucide-react';
import { useMemo, useState, useEffect } from 'react';
import { toast } from 'sonner';

interface SubscriptionService {
  id?: string;
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
  active?: boolean;
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
  const [showInactive, setShowInactive] = useState(false);

  // Load saved subscriptions from database
  const loadSavedSubscriptions = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data, error } = await supabase
        .from('subscription_services')
        .select('*')
        .eq('user_id', user.id)
        .order('updated_at', { ascending: false });

      if (error) {
        console.error('Error loading subscriptions:', error);
        return;
      }

      if (data) {
        const savedServices: SubscriptionService[] = data.map(item => ({
          id: item.id,
          serviceName: item.service_name,
          tipoServicio: item.tipo_servicio,
          ultimoPago: {
            monto: item.ultimo_pago_monto,
            fecha: new Date(item.ultimo_pago_fecha),
            mes: new Date(item.ultimo_pago_fecha).toLocaleDateString('es-ES', { month: 'long', year: 'numeric' })
          },
          frecuencia: item.frecuencia as 'Mensual' | 'Anual' | 'Irregular',
          proximoPago: new Date(item.proximo_pago),
          numeroPagos: item.numero_pagos,
          originalComments: item.original_comments,
          active: item.active
        }));
        setServices(savedServices);
      }
    } catch (error) {
      console.error('Error loading subscriptions:', error);
    }
  };

  // Save or update subscription in database
  const saveSubscription = async (subscription: SubscriptionService) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const subscriptionData = {
        user_id: user.id,
        service_name: subscription.serviceName,
        tipo_servicio: subscription.tipoServicio,
        ultimo_pago_monto: subscription.ultimoPago.monto,
        ultimo_pago_fecha: subscription.ultimoPago.fecha.toISOString().split('T')[0],
        frecuencia: subscription.frecuencia,
        proximo_pago: subscription.proximoPago.toISOString().split('T')[0],
        numero_pagos: subscription.numeroPagos,
        original_comments: subscription.originalComments,
        active: subscription.active !== false // Default to true if not specified
      };

      const { error } = await supabase
        .from('subscription_services')
        .upsert(subscriptionData, { 
          onConflict: 'user_id,service_name'
        });

      if (error) {
        console.error('Error saving subscription:', error);
        toast.error('Error al guardar la suscripción');
      }
    } catch (error) {
      console.error('Error saving subscription:', error);
      toast.error('Error al guardar la suscripción');
    }
  };

  // Toggle subscription active status
  const toggleSubscriptionActive = async (serviceId: string, newActiveStatus: boolean) => {
    try {
      const { error } = await supabase
        .from('subscription_services')
        .update({ active: newActiveStatus })
        .eq('id', serviceId);

      if (error) {
        console.error('Error updating subscription status:', error);
        toast.error('Error al actualizar el estado de la suscripción');
        return;
      }

      // Update local state
      setServices(prev => prev.map(service => 
        service.id === serviceId 
          ? { ...service, active: newActiveStatus }
          : service
      ));

      toast.success(
        newActiveStatus 
          ? 'Suscripción activada' 
          : 'Suscripción desactivada'
      );
    } catch (error) {
      console.error('Error updating subscription status:', error);
      toast.error('Error al actualizar el estado de la suscripción');
    }
  };

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

  // Función para determinar si dos transacciones son del mismo servicio
  const areSameService = (t1: any, t2: any): boolean => {
    // Normalizar comentarios para comparación
    const normalize = (comment: string) => 
      comment.toLowerCase()
        .replace(/[*\s\d]/g, '') // Remover asteriscos, espacios y números
        .replace(/paypal/g, '') // Remover paypal prefix
        .substring(0, 10); // Tomar solo los primeros 10 caracteres

    const comment1Normalized = normalize(t1.comentario);
    const comment2Normalized = normalize(t2.comentario);
    
    // Si los comentarios normalizados son similares
    if (comment1Normalized === comment2Normalized && comment1Normalized.length > 3) {
      return true;
    }
    
    // Si tienen montos similares (±10%) y están en el mismo día del mes
    const montoDiff = Math.abs(t1.gasto - t2.gasto) / Math.max(t1.gasto, t2.gasto);
    const fecha1 = new Date(t1.fecha);
    const fecha2 = new Date(t2.fecha);
    
    if (montoDiff <= 0.1 && fecha1.getDate() === fecha2.getDate()) {
      return true;
    }
    
    return false;
  };

  // Agrupar transacciones antes del análisis de IA
  const groupSimilarTransactions = (transactions: any[]) => {
    const groups: any[][] = [];
    const processed = new Set<number>();
    
    transactions.forEach((transaction, index) => {
      if (processed.has(index)) return;
      
      const group = [transaction];
      processed.add(index);
      
      // Buscar transacciones similares
      for (let i = index + 1; i < transactions.length; i++) {
        if (processed.has(i)) continue;
        
        if (areSameService(transaction, transactions[i])) {
          group.push(transactions[i]);
          processed.add(i);
        }
      }
      
      groups.push(group);
    });
    
    return groups;
  };

  // Analizar y procesar servicios automáticamente
  const processSubscriptions = async () => {
    if (subscriptionTransactions.length === 0) {
      setServices([]);
      return;
    }

    setIsLoading(true);
    try {
      // Agrupar transacciones similares primero
      const transactionGroups = groupSimilarTransactions(subscriptionTransactions);
      
      // Crear comentarios únicos de cada grupo
      const uniqueComments = transactionGroups.map(group => group[0].comentario);
      
      const { data, error } = await supabase.functions.invoke('analyze-subscriptions', {
        body: { comments: uniqueComments }
      });

      if (error) {
        console.error('Error calling AI function:', error);
        // Fallback sin IA - procesar grupos manualmente
        const fallbackServices = transactionGroups.map(group => {
          const sortedTransactions = group.sort((a, b) => 
            new Date(b.fecha).getTime() - new Date(a.fecha).getTime()
          );
          const lastTransaction = sortedTransactions[0];
          const frequency = determineFrecuencia(group);
          
          // Extraer nombre del servicio del comentario
          let serviceName = group[0].comentario;
          if (serviceName.includes('SPOTIFY')) serviceName = 'Spotify';
          else if (serviceName.includes('CHATGPT') || serviceName.includes('OPENAI')) serviceName = 'ChatGPT';
          else if (serviceName.includes('NETFLIX')) serviceName = 'Netflix';
          else if (serviceName.includes('APPLE')) serviceName = 'Apple';
          else if (serviceName.includes('AMAZON')) serviceName = 'Amazon';
          else if (serviceName.includes('GOOGLE')) serviceName = 'Google';
          else serviceName = serviceName.split(' ')[0] || serviceName.substring(0, 20);
          
          return {
            serviceName,
            tipoServicio: 'Servicio de suscripción',
            ultimoPago: {
              monto: lastTransaction.gasto,
              fecha: new Date(lastTransaction.fecha),
              mes: new Date(lastTransaction.fecha).toLocaleDateString('es-ES', { month: 'long', year: 'numeric' })
            },
            frecuencia: frequency,
            proximoPago: calculateNextPayment(new Date(lastTransaction.fecha), frequency),
            numeroPagos: group.length,
            originalComments: group.map(t => t.comentario),
            active: true // New subscriptions are active by default
          };
        });
        
        // Save detected subscriptions to database
        for (const subscription of fallbackServices) {
          await saveSubscription(subscription);
        }
        
        // Reload from database to get IDs
        await loadSavedSubscriptions();
        return;
      }

      const aiResult: AIAnalysisResult = data;
      
      // Procesar resultados con IA, pero usando los grupos pre-calculados
      const processedServices: SubscriptionService[] = aiResult.groups.map(group => {
        // Encontrar el grupo de transacciones correspondiente
        const transactionGroup = transactionGroups.find(tGroup => 
          group.originalComments.some(comment => 
            tGroup.some(t => t.comentario === comment)
          )
        );

        if (!transactionGroup || transactionGroup.length === 0) return null;

        const sortedTransactions = transactionGroup.sort((a, b) => 
          new Date(b.fecha).getTime() - new Date(a.fecha).getTime()
        );
        const lastTransaction = sortedTransactions[0];
        const frequency = determineFrecuencia(transactionGroup);

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
          numeroPagos: transactionGroup.length,
          originalComments: transactionGroup.map(t => t.comentario),
          active: true // New subscriptions are active by default
        };
      }).filter(Boolean) as SubscriptionService[];

      // Save detected subscriptions to database and update local state
      for (const subscription of processedServices) {
        await saveSubscription(subscription);
      }

      // Reload from database to get IDs
      await loadSavedSubscriptions();

    } catch (error) {
      console.error('Error processing subscriptions:', error);
      toast.error('Error al procesar las suscripciones');
    } finally {
      setIsLoading(false);
    }
  };

  // Load saved subscriptions on component mount
  useEffect(() => {
    loadSavedSubscriptions();
  }, []);

  // Procesar automáticamente cuando cambien las transacciones
  useEffect(() => {
    processSubscriptions();
  }, [subscriptionTransactions.length]);

  // Filter services based on active status
  const filteredServices = useMemo(() => {
    return services.filter(service => 
      showInactive ? true : service.active !== false
    );
  }, [services, showInactive]);

  // Función para obtener el color del badge de frecuencia
  const getFrequencyBadgeVariant = (frequency: string) => {
    switch (frequency) {
      case 'Mensual': return 'default';
      case 'Anual': return 'secondary';
      default: return 'outline';
    }
  };

  return (
    <Card className="border-primary/20 hover:border-primary/40 transition-all duration-300">
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
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <Checkbox 
                id="show-inactive"
                checked={showInactive}
                onCheckedChange={(checked) => setShowInactive(checked as boolean)}
              />
              <label 
                htmlFor="show-inactive" 
                className="text-xs text-muted-foreground cursor-pointer"
              >
                Mostrar inactivas
              </label>
            </div>
            <Badge variant="outline" className="text-xs">
              {filteredServices.length} servicios {showInactive ? 'total' : 'activos'}
            </Badge>
          </div>
        </div>

        {filteredServices.length === 0 && !isLoading ? (
          <div className="text-center py-8 text-muted-foreground">
            <CreditCard className="h-12 w-12 mx-auto mb-4 opacity-50" />
            <p>No se detectaron suscripciones</p>
            <p className="text-sm">Agrega transacciones en categorías de "Suscripciones"</p>
          </div>
        ) : (
          <div className="space-y-4">
            {filteredServices.map((service, index) => (
              <div key={service.id || index} className={`p-4 rounded-lg border transition-colors ${service.active === false ? 'bg-muted/20 border-muted' : 'bg-card hover:bg-muted/5'}`}>
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-center gap-3 flex-1">
                    <Checkbox
                      checked={service.active !== false}
                      onCheckedChange={(checked) => {
                        if (service.id) {
                          toggleSubscriptionActive(service.id, checked as boolean);
                        }
                      }}
                      aria-label={`${service.active !== false ? 'Desactivar' : 'Activar'} suscripción de ${service.serviceName}`}
                    />
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <h3 className={`font-semibold text-lg ${service.active === false ? 'text-muted-foreground' : ''}`}>
                          {service.serviceName}
                        </h3>
                        <Badge variant={getFrequencyBadgeVariant(service.frecuencia)} className="text-xs">
                          {service.frecuencia}
                        </Badge>
                        {service.active === false && (
                          <Badge variant="outline" className="text-xs text-muted-foreground">
                            Inactiva
                          </Badge>
                        )}
                      </div>
                      <p className={`text-sm ${service.active === false ? 'text-muted-foreground' : 'text-muted-foreground'}`}>
                        {service.tipoServicio}
                      </p>
                    </div>
                  </div>
                  <Badge variant="secondary" className="text-xs">
                    {service.numeroPagos} pagos
                  </Badge>
                </div>
                
                <div className={`grid grid-cols-1 md:grid-cols-2 gap-4 text-sm ${service.active === false ? 'opacity-60' : ''}`}>
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