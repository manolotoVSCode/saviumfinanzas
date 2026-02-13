import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { useFinanceDataSupabase } from '@/hooks/useFinanceDataSupabase';
import { useAppConfig } from '@/hooks/useAppConfig';
import { supabase } from '@/integrations/supabase/client';
import { CreditCard, Calendar, Clock, Repeat, RefreshCw, Edit2, Check, X } from 'lucide-react';
import { useMemo, useState, useEffect } from 'react';
import { toast } from 'sonner';

// ──────────────────────────────────────────────
// Patrones de suscripciones embebidos en código
// ──────────────────────────────────────────────
interface SubscriptionPattern {
  id: string;
  serviceName: string;
  tipoServicio: string;
  /** Palabras clave que DEBE contener el comentario (todas deben coincidir) */
  keywords: string[];
  /** Palabras que NO debe contener el comentario (excluir falsos positivos) */
  excludeKeywords?: string[];
  /** Monto esperado — si se define, solo acepta transacciones con ±10% de este valor */
  expectedAmount?: number;
  frecuenciaDefault?: 'Mensual' | 'Anual' | 'Irregular';
}

const SUBSCRIPTION_PATTERNS: SubscriptionPattern[] = [
  {
    id: 'amazon-prime',
    serviceName: 'Amazon Prime',
    tipoServicio: 'Streaming y envíos',
    keywords: ['amazon', 'retail'],
    excludeKeywords: ['marketplace'],
    expectedAmount: 99,
  },
  {
    id: 'spotify',
    serviceName: 'Spotify',
    tipoServicio: 'Streaming de música',
    keywords: ['spotify'],
  },
  {
    id: 'rotoplas',
    serviceName: 'Rotoplas',
    tipoServicio: 'Servicio de agua',
    keywords: ['rotoplas'],
    expectedAmount: 399,
  },
  {
    id: 'netflix',
    serviceName: 'Netflix',
    tipoServicio: 'Streaming de video',
    keywords: ['netflix'],
  },
  {
    id: 'chatgpt',
    serviceName: 'ChatGPT',
    tipoServicio: 'Inteligencia Artificial',
    keywords: ['openai', 'chatgpt'],
  },
  {
    id: 'apple',
    serviceName: 'Apple',
    tipoServicio: 'Servicios Apple',
    keywords: ['apple', 'com/bill'],
  },
  {
    id: 'google-nest',
    serviceName: 'Google Nest',
    tipoServicio: 'Dispositivos inteligentes',
    keywords: ['google', 'nest'],
  },
  {
    id: 'google-one',
    serviceName: 'Google One',
    tipoServicio: 'Almacenamiento en la nube',
    keywords: ['google', 'one'],
  },
  {
    id: 'youtube-premium',
    serviceName: 'YouTube Premium',
    tipoServicio: 'Streaming de video',
    keywords: ['google', 'youtube'],
  },
  {
    id: 'lovable',
    serviceName: 'Lovable',
    tipoServicio: 'Desarrollo de software',
    keywords: ['lovable'],
  },
  {
    id: 'opus-clip',
    serviceName: 'Opus Clip',
    tipoServicio: 'Edición de video',
    keywords: ['opus'],
  },
  {
    id: 'github',
    serviceName: 'GitHub',
    tipoServicio: 'Desarrollo de software',
    keywords: ['github'],
  },
  {
    id: 'microsoft',
    serviceName: 'Microsoft',
    tipoServicio: 'Software y servicios',
    keywords: ['msbill'],
  },
];

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
  patternId?: string;
}

export const SubscriptionsManager = () => {
  const { formatCurrency } = useAppConfig();
  const financeData = useFinanceDataSupabase();
  const { transactions } = financeData;
  const [services, setServices] = useState<SubscriptionService[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [showInactive, setShowInactive] = useState(false);
  const [editingServiceId, setEditingServiceId] = useState<string | null>(null);
  const [editingName, setEditingName] = useState('');

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
          active: item.active,
          patternId: item.canon_key || undefined,
        }));
        setServices(savedServices);
      }
    } catch (error) {
      console.error('Error loading subscriptions:', error);
    }
  };

  // Save or update subscription in database
  const saveSubscription = async (subscription: SubscriptionService, patternId: string) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // Buscar por canon_key (patternId) para evitar duplicados
      const { data: existing } = await supabase
        .from('subscription_services')
        .select('*')
        .eq('user_id', user.id)
        .eq('canon_key', patternId)
        .maybeSingle();

      const subscriptionData = {
        user_id: user.id,
        service_name: existing?.service_name || subscription.serviceName, // Mantener nombre editado
        tipo_servicio: subscription.tipoServicio,
        ultimo_pago_monto: subscription.ultimoPago.monto,
        ultimo_pago_fecha: subscription.ultimoPago.fecha.toISOString().split('T')[0],
        frecuencia: subscription.frecuencia,
        proximo_pago: subscription.proximoPago.toISOString().split('T')[0],
        numero_pagos: subscription.numeroPagos,
        original_comments: subscription.originalComments,
        active: existing?.active ?? true,
        canon_key: patternId,
      } as any;

      if (existing) {
        await supabase
          .from('subscription_services')
          .update(subscriptionData)
          .eq('id', existing.id);
      } else {
        await supabase
          .from('subscription_services')
          .insert(subscriptionData);
      }
    } catch (error) {
      console.error('Error saving subscription:', error);
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

  // Edit service name
  const startEditingName = (serviceId: string, currentName: string) => {
    setEditingServiceId(serviceId);
    setEditingName(currentName);
  };

  const saveEditedName = async () => {
    if (!editingServiceId || !editingName.trim()) return;
    
    try {
      const { error } = await supabase
        .from('subscription_services')
        .update({ service_name: editingName.trim() })
        .eq('id', editingServiceId);

      if (error) {
        console.error('Error updating service name:', error);
        toast.error('Error al actualizar el nombre de la suscripción');
        return;
      }

      setServices(prev => prev.map(service => 
        service.id === editingServiceId 
          ? { ...service, serviceName: editingName.trim() }
          : service
      ));

      toast.success('Nombre de suscripción actualizado');
      setEditingServiceId(null);
      setEditingName('');
    } catch (error) {
      console.error('Error updating service name:', error);
      toast.error('Error al actualizar el nombre de la suscripción');
    }
  };

  const cancelEditingName = () => {
    setEditingServiceId(null);
    setEditingName('');
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
        nextPayment.setMonth(nextPayment.getMonth() + 1);
        break;
    }
    return nextPayment;
  };

  // ──────────────────────────────────────────────
  // Análisis de suscripciones por patrones
  // ──────────────────────────────────────────────
  const matchTransactionToPattern = (comentario: string, monto: number, pattern: SubscriptionPattern): boolean => {
    const lower = comentario.toLowerCase();

    // Todas las keywords deben estar presentes
    const allKeywordsMatch = pattern.keywords.every(kw => lower.includes(kw.toLowerCase()));
    if (!allKeywordsMatch) return false;

    // Ninguna exclude keyword debe estar presente
    if (pattern.excludeKeywords) {
      const anyExcluded = pattern.excludeKeywords.some(kw => lower.includes(kw.toLowerCase()));
      if (anyExcluded) return false;
    }

    // Si hay monto esperado, verificar ±15%
    if (pattern.expectedAmount) {
      const tolerance = pattern.expectedAmount * 0.15;
      if (Math.abs(monto - pattern.expectedAmount) > tolerance) return false;
    }

    return true;
  };

  // Buscar el nombre de servicio usando los patrones embebidos
  const resolveServiceName = (comentario: string, monto: number): { serviceName: string; tipoServicio: string; patternId: string } => {
    for (const pattern of SUBSCRIPTION_PATTERNS) {
      if (matchTransactionToPattern(comentario, monto, pattern)) {
        return { serviceName: pattern.serviceName, tipoServicio: pattern.tipoServicio, patternId: pattern.id };
      }
    }
    // Sin coincidencia: usar el comentario limpio como nombre
    const cleanName = comentario.replace(/[*#\d]/g, '').trim().split(/\s+/).slice(0, 3).join(' ') || comentario.substring(0, 20);
    const patternId = `custom-${comentario.toLowerCase().replace(/[^a-z0-9]/g, '').substring(0, 20)}`;
    return { serviceName: cleanName, tipoServicio: 'Suscripción', patternId };
  };

  const processSubscriptions = async () => {
    if (!transactions || transactions.length === 0) return;

    setIsLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { categories } = financeData;

      // Obtener IDs de subcategorías "Suscripciones"
      const subscriptionCategoryIds = (categories || [])
        .filter(c => c.subcategoria.toLowerCase() === 'suscripciones')
        .map(c => c.id);

      if (subscriptionCategoryIds.length === 0) {
        // No existe la subcategoría, limpiar y salir
        await loadSavedSubscriptions();
        setIsLoading(false);
        return;
      }

      const twelveMonthsAgo = new Date();
      twelveMonthsAgo.setMonth(twelveMonthsAgo.getMonth() - 12);

      // Filtrar transacciones de subcategoría "Suscripciones" de los últimos 12 meses con gasto > 0
      const subscriptionTransactions = transactions.filter(t =>
        t.gasto > 0 &&
        subscriptionCategoryIds.includes(t.subcategoriaId) &&
        new Date(t.fecha) >= twelveMonthsAgo
      );

      // Agrupar transacciones por patternId resuelto
      const groupedByPattern = new Map<string, { serviceName: string; tipoServicio: string; transactions: typeof subscriptionTransactions }>();

      for (const t of subscriptionTransactions) {
        const { serviceName, tipoServicio, patternId } = resolveServiceName(t.comentario, t.gasto);
        if (!groupedByPattern.has(patternId)) {
          groupedByPattern.set(patternId, { serviceName, tipoServicio, transactions: [] });
        }
        groupedByPattern.get(patternId)!.transactions.push(t);
      }

      // Limpiar registros que ya no tienen transacciones asociadas
      const activePatternIds = Array.from(groupedByPattern.keys());
      const { data: allSubs } = await supabase
        .from('subscription_services')
        .select('id, canon_key')
        .eq('user_id', user.id);

      if (allSubs) {
        const toDelete = allSubs
          .filter(s => !s.canon_key || !activePatternIds.includes(s.canon_key))
          .map(s => s.id);
        if (toDelete.length > 0) {
          await supabase.from('subscription_services').delete().in('id', toDelete);
        }
      }

      // Guardar cada grupo como suscripción
      for (const [patternId, group] of groupedByPattern) {
        const sorted = [...group.transactions].sort((a, b) =>
          new Date(b.fecha).getTime() - new Date(a.fecha).getTime()
        );

        const lastTransaction = sorted[0];
        const lastPaymentDate = new Date(lastTransaction.fecha);

        // Detectar frecuencia
        let detectedFrecuencia: 'Mensual' | 'Anual' | 'Irregular' = 'Irregular';
        if (sorted.length >= 2) {
          const sortedDates = sorted.map(t => new Date(t.fecha).getTime());
          let totalDaysDiff = 0;
          for (let i = 0; i < sortedDates.length - 1; i++) {
            totalDaysDiff += (sortedDates[i] - sortedDates[i + 1]) / (1000 * 60 * 60 * 24);
          }
          const avgDays = totalDaysDiff / (sortedDates.length - 1);
          if (avgDays >= 300 && avgDays <= 400) {
            detectedFrecuencia = 'Anual';
          } else if (avgDays >= 20 && avgDays <= 45) {
            detectedFrecuencia = 'Mensual';
          }
        }

        const subscription: SubscriptionService = {
          serviceName: group.serviceName,
          tipoServicio: group.tipoServicio,
          ultimoPago: {
            monto: lastTransaction.gasto,
            fecha: lastPaymentDate,
            mes: lastPaymentDate.toLocaleDateString('es-ES', { month: 'long', year: 'numeric' }),
          },
          frecuencia: detectedFrecuencia,
          proximoPago: calculateNextPayment(lastPaymentDate, detectedFrecuencia),
          numeroPagos: sorted.length,
          originalComments: sorted.map(t => t.comentario),
          patternId,
        };

        await saveSubscription(subscription, patternId);
      }

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

  // Procesar cuando cambien las transacciones
  useEffect(() => {
    if (transactions && transactions.length > 0) {
      processSubscriptions();
    }
  }, [transactions?.length]);

  // Filter services based on active status
  const filteredServices = useMemo(() => {
    return services.filter(service => 
      showInactive ? true : service.active !== false
    );
  }, [services, showInactive]);

  // Calculate monthly subscription totals
  const monthlySubscriptionsTotal = useMemo(() => {
    const activeMonthlyServices = services.filter(service => 
      service.active !== false && service.frecuencia === 'Mensual'
    );
    
    const totalAmount = activeMonthlyServices.reduce((sum, service) => 
      sum + service.ultimoPago.monto, 0
    );
    
    return {
      count: activeMonthlyServices.length,
      totalAmount
    };
  }, [services]);

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

        {/* Monthly Subscriptions Summary */}
        {monthlySubscriptionsTotal.count > 0 && (
          <div className="bg-primary/5 border border-primary/20 rounded-lg p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Calendar className="h-5 w-5 text-primary" />
                <div>
                  <h4 className="font-semibold text-primary">Suscripciones Mensuales Activas</h4>
                  <p className="text-sm text-muted-foreground">
                    {monthlySubscriptionsTotal.count} servicio{monthlySubscriptionsTotal.count !== 1 ? 's' : ''}
                  </p>
                </div>
              </div>
              <div className="text-right">
                <div className="text-2xl font-bold text-primary">
                  ${formatCurrency(monthlySubscriptionsTotal.totalAmount)}
                </div>
                <div className="text-sm text-muted-foreground">por mes</div>
              </div>
            </div>
          </div>
        )}

        {filteredServices.length === 0 && !isLoading ? (
          <div className="text-center py-8 text-muted-foreground">
            <CreditCard className="h-12 w-12 mx-auto mb-4 opacity-50" />
            <p>No se detectaron suscripciones</p>
            <p className="text-sm">Se detectarán automáticamente a partir de tus transacciones</p>
          </div>
        ) : (
          <div className="space-y-4">
            {filteredServices.map((service, index) => (
              <div key={service.id || index} className={`group p-4 rounded-lg border transition-colors ${service.active === false ? 'bg-muted/20 border-muted' : 'bg-card hover:bg-muted/5'}`}>
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
                        {editingServiceId === service.id ? (
                          <div className="flex items-center gap-2">
                            <Input
                              value={editingName}
                              onChange={(e) => setEditingName(e.target.value)}
                              className="h-8 text-lg font-semibold"
                              onKeyDown={(e) => {
                                if (e.key === 'Enter') {
                                  saveEditedName();
                                } else if (e.key === 'Escape') {
                                  cancelEditingName();
                                }
                              }}
                              autoFocus
                            />
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={saveEditedName}
                              className="h-8 w-8 p-0"
                            >
                              <Check className="h-4 w-4" />
                            </Button>
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={cancelEditingName}
                              className="h-8 w-8 p-0"
                            >
                              <X className="h-4 w-4" />
                            </Button>
                          </div>
                        ) : (
                          <div className="flex items-center gap-2">
                            <h3 className={`font-semibold text-lg ${service.active === false ? 'text-muted-foreground' : ''}`}>
                              {service.serviceName}
                            </h3>
                            {service.id && (
                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={() => startEditingName(service.id!, service.serviceName)}
                                className="h-6 w-6 p-0 opacity-0 group-hover:opacity-100 transition-opacity"
                                title="Editar nombre"
                              >
                                <Edit2 className="h-3 w-3" />
                              </Button>
                            )}
                          </div>
                        )}
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
      </CardContent>
    </Card>
  );
};