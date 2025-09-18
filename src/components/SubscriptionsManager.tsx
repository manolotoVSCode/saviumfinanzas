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
        // Dedupe por clave estable (maneja renombres del mismo servicio)
        const groups = new Map<string, any[]>();
        data.forEach((item) => {
          const key = getServiceKey(
            item.service_name,
            item.ultimo_pago_monto,
            new Date(item.ultimo_pago_fecha),
            item.original_comments || []
          );
          const arr = groups.get(key) || [];
          arr.push(item);
          groups.set(key, arr);
        });

        // Fusionar duplicados en BD: conservar el más reciente y borrar el resto
        for (const [, items] of groups) {
          if (items.length > 1) {
            items.sort((a, b) => new Date(b.updated_at || b.created_at).getTime() - new Date(a.updated_at || a.created_at).getTime());
            const keep = items[0];
            const merged = {
              service_name: keep.service_name,
              tipo_servicio: keep.tipo_servicio,
              ultimo_pago_monto: keep.ultimo_pago_monto,
              ultimo_pago_fecha: keep.ultimo_pago_fecha,
              frecuencia: keep.frecuencia,
              proximo_pago: keep.proximo_pago,
              numero_pagos: Math.max(...items.map(i => i.numero_pagos || 1)),
              original_comments: Array.from(new Set(items.flatMap(i => i.original_comments || []))),
              active: items.some(i => i.active !== false)
            };
            await supabase.from('subscription_services').update(merged).eq('id', keep.id);
            const toDelete = items.slice(1).map(i => i.id);
            if (toDelete.length) {
              await supabase.from('subscription_services').delete().in('id', toDelete);
            }
          }
        }

        // Recargar lista ya depurada
        const { data: deduped } = await supabase
          .from('subscription_services')
          .select('*')
          .eq('user_id', user.id)
          .order('updated_at', { ascending: false });

        const savedServices: SubscriptionService[] = (deduped || []).map(item => ({
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

  // Helper: generar una clave estable por servicio para evitar duplicados
  const getServiceKey = (name: string, amount: number, fecha: Date, originalComments: string[] = []) => {
    const lower = (name || '').toLowerCase();
    const normalizeName = () => {
      if (lower.includes('google')) {
        if (lower.includes('nest')) return 'google-nest';
        if (lower.includes('one')) return 'google-one';
        if (lower.includes('drive')) return 'google-drive';
        if (lower.includes('youtube')) return 'google-youtube';
        if (lower.includes('cloud')) return 'google-cloud';
        if (lower.includes('workspace')) return 'google-workspace';
        return 'google-general';
      }
      if (lower.includes('apple')) {
        if (lower.includes('music')) return 'apple-music';
        if (lower.includes('icloud')) return 'apple-icloud';
        if (lower.includes('tv')) return 'apple-tv';
        return 'apple-general';
      }
      if (lower.includes('spotify')) return 'spotify';
      if (lower.includes('netflix')) return 'netflix';
      if (lower.includes('chatgpt') || lower.includes('openai')) return 'openai-chatgpt';
      if (lower.includes('amazon')) return 'amazon';
      if (lower.includes('lovable')) return 'lovable';
      if (lower.includes('opus')) return 'opus-clip';
      if (lower.includes('rotoplas')) return 'rotoplas';
      // Fallback: limpiar nombre
      return lower.replace(/[^a-z]/g, '').substring(0, 15);
    };

    const nameKey = normalizeName();
    const dayKey = fecha?.getDate?.() || 0;
    const amountKey = Math.round(amount || 0);
    return `${nameKey}|${dayKey}|${amountKey}`;
  };

  // Save or update subscription in database evitando duplicados por cambio de nombre
  const saveSubscription = async (subscription: SubscriptionService) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // 1) Resolver estado activo existente por nombre exacto
      const { data: existingByName } = await supabase
        .from('subscription_services')
        .select('*')
        .eq('user_id', user.id)
        .eq('service_name', subscription.serviceName)
        .maybeSingle();

      const baseActive = typeof subscription.active === 'boolean'
        ? subscription.active
        : (existingByName?.active ?? true);

      // Datos a guardar/actualizar
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
        active: baseActive
      } as any;

      // 2) Si no existe por nombre, buscar coincidencia por clave estable (mismo servicio con nombre editado)
      let targetId: string | null = existingByName?.id ?? null;
      if (!targetId) {
        const { data: allExisting } = await supabase
          .from('subscription_services')
          .select('*')
          .eq('user_id', user.id);

        const desiredKey = getServiceKey(
          subscription.serviceName,
          subscription.ultimoPago.monto,
          subscription.ultimoPago.fecha,
          subscription.originalComments
        );

        const candidate = (allExisting || []).find((item: any) => {
          const itemKey = getServiceKey(
            item.service_name,
            item.ultimo_pago_monto,
            new Date(item.ultimo_pago_fecha),
            item.original_comments || []
          );
          const overlap = (item.original_comments || []).some((c: string) =>
            (subscription.originalComments || []).includes(c)
          );
          return itemKey === desiredKey || overlap;
        });

        if (candidate) {
          targetId = candidate.id;
          subscriptionData.active = typeof subscription.active === 'boolean' ? subscription.active : (candidate.active ?? true);
        }
      }

      if (targetId) {
        // Update el registro existente (mismo servicio con nombre actualizado)
        const { error } = await supabase
          .from('subscription_services')
          .update(subscriptionData)
          .eq('id', targetId);
        if (error) {
          console.error('Error updating subscription:', error);
          toast.error('Error al actualizar la suscripción');
        }
      } else {
        // Insert/Upsert por nombre (primer registro)
        const { error } = await supabase
          .from('subscription_services')
          .upsert(subscriptionData, { onConflict: 'user_id,service_name' });
        if (error) {
          console.error('Error saving subscription:', error);
          toast.error('Error al guardar la suscripción');
        }
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

      // Update local state
      setServices(prev => prev.map(service => 
        service.id === editingServiceId 
          ? { ...service, serviceName: editingName.trim() }
          : service
      ));

      toast.success('Nombre de suscripción actualizado');
      setEditingServiceId(null);
      setEditingName('');
      
      // Después de editar el nombre, limpiar posibles duplicados
      await cleanupDuplicateSubscriptions();
    } catch (error) {
      console.error('Error updating service name:', error);
      toast.error('Error al actualizar el nombre de la suscripción');
    }
  };

  // Función para limpiar duplicados después de ediciones
  const cleanupDuplicateSubscriptions = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data: allSubs } = await supabase
        .from('subscription_services')
        .select('*')
        .eq('user_id', user.id);

      if (!allSubs || allSubs.length <= 1) return;

      // Agrupar por clave estable para detectar duplicados
      const groups = new Map<string, any[]>();
      allSubs.forEach((item) => {
        const key = getServiceKey(
          item.service_name,
          item.ultimo_pago_monto,
          new Date(item.ultimo_pago_fecha),
          item.original_comments || []
        );
        const arr = groups.get(key) || [];
        arr.push(item);
        groups.set(key, arr);
      });

      // Procesar grupos con duplicados
      for (const [, items] of groups) {
        if (items.length > 1) {
          console.log('Encontré duplicados:', items.map(i => ({name: i.service_name, id: i.id, monto: i.ultimo_pago_monto})));
          
          // Ordenar por fecha de actualización, mantener el más reciente
          items.sort((a, b) => new Date(b.updated_at || b.created_at).getTime() - new Date(a.updated_at || a.created_at).getTime());
          const keep = items[0];
          const toDelete = items.slice(1);

          // Fusionar datos del más reciente
          const merged = {
            service_name: keep.service_name, // Mantener el nombre más reciente
            tipo_servicio: keep.tipo_servicio,
            ultimo_pago_monto: keep.ultimo_pago_monto,
            ultimo_pago_fecha: keep.ultimo_pago_fecha,
            frecuencia: keep.frecuencia,
            proximo_pago: keep.proximo_pago,
            numero_pagos: Math.max(...items.map(i => i.numero_pagos || 1)),
            original_comments: Array.from(new Set(items.flatMap(i => i.original_comments || []))),
            active: items.some(i => i.active !== false),
            updated_at: new Date().toISOString()
          };

          await supabase.from('subscription_services').update(merged).eq('id', keep.id);
          
          if (toDelete.length > 0) {
            const deleteIds = toDelete.map(i => i.id);
            console.log('Eliminando duplicados:', deleteIds);
            await supabase.from('subscription_services').delete().in('id', deleteIds);
          }
        }
      }

      // Recargar la lista después de limpiar
      await loadSavedSubscriptions();
    } catch (error) {
      console.error('Error cleaning up duplicates:', error);
    }
  };

  const cancelEditingName = () => {
    setEditingServiceId(null);
    setEditingName('');
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
    // Normalizar comentarios para comparación más inteligente
    const normalize = (comment: string) => {
      const lower = comment.toLowerCase();
      
      // Detectar servicios específicos primero
      if (lower.includes('google')) {
        if (lower.includes('nest')) return 'google-nest';
        if (lower.includes('one')) return 'google-one';
        if (lower.includes('drive')) return 'google-drive';
        if (lower.includes('youtube')) return 'google-youtube';
        if (lower.includes('cloud')) return 'google-cloud';
        if (lower.includes('workspace')) return 'google-workspace';
        return 'google-general';
      }
      
      if (lower.includes('apple')) {
        if (lower.includes('music')) return 'apple-music';
        if (lower.includes('icloud')) return 'apple-icloud';
        if (lower.includes('tv')) return 'apple-tv';
        return 'apple-general';
      }
      
      if (lower.includes('spotify')) return 'spotify';
      if (lower.includes('netflix')) return 'netflix';
      if (lower.includes('chatgpt') || lower.includes('openai')) return 'openai-chatgpt';
      if (lower.includes('amazon')) return 'amazon';
      if (lower.includes('lovable')) return 'lovable';
      if (lower.includes('opus')) return 'opus-clip';
      if (lower.includes('rotoplas')) return 'rotoplas';
      
      // Fallback: normalizar de forma general
      return lower
        .replace(/[*\s\d\-_.]/g, '') // Remover caracteres especiales
        .replace(/paypal/g, '') // Remover paypal prefix
        .substring(0, 15); // Tomar más caracteres para mejor identificación
    };

    const comment1Normalized = normalize(t1.comentario);
    const comment2Normalized = normalize(t2.comentario);
    
    console.log('Comparing:', {
      original1: t1.comentario,
      original2: t2.comentario,
      normalized1: comment1Normalized,
      normalized2: comment2Normalized,
      amount1: t1.gasto,
      amount2: t2.gasto
    });
    
    // Si los comentarios normalizados son exactamente iguales
    if (comment1Normalized === comment2Normalized && comment1Normalized.length > 3) {
      return true;
    }
    
    // Verificación adicional por monto similar solo si el comentario es muy genérico
    if (comment1Normalized.length <= 5) {
      const montoDiff = Math.abs(t1.gasto - t2.gasto) / Math.max(t1.gasto, t2.gasto);
      const fecha1 = new Date(t1.fecha);
      const fecha2 = new Date(t2.fecha);
      
      if (montoDiff <= 0.05 && fecha1.getDate() === fecha2.getDate()) {
        return true;
      }
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
          
          // Extraer nombre del servicio del comentario de forma más inteligente
          let serviceName = group[0].comentario;
          const lower = serviceName.toLowerCase();
          
          if (lower.includes('spotify')) serviceName = 'Spotify';
          else if (lower.includes('chatgpt') || lower.includes('openai')) serviceName = 'ChatGPT';
          else if (lower.includes('netflix')) serviceName = 'Netflix';
          else if (lower.includes('apple')) {
            if (lower.includes('music')) serviceName = 'Apple Music';
            else if (lower.includes('icloud')) serviceName = 'iCloud';
            else if (lower.includes('tv')) serviceName = 'Apple TV';
            else serviceName = 'Apple';
          }
          else if (lower.includes('amazon')) serviceName = 'Amazon';
          else if (lower.includes('google')) {
            if (lower.includes('nest')) serviceName = 'Google Nest';
            else if (lower.includes('one')) serviceName = 'Google One';
            else if (lower.includes('drive')) serviceName = 'Google Drive';
            else if (lower.includes('youtube')) serviceName = 'YouTube';
            else if (lower.includes('cloud')) serviceName = 'Google Cloud';
            else if (lower.includes('workspace')) serviceName = 'Google Workspace';
            else serviceName = 'Google';
          }
          else if (lower.includes('lovable')) serviceName = 'Lovable';
          else if (lower.includes('opus')) serviceName = 'Opus Clip';
          else if (lower.includes('rotoplas')) serviceName = 'Rotoplas';
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
            originalComments: group.map(t => t.comentario)
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
          originalComments: transactionGroup.map(t => t.comentario)
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

  // Procesar automáticamente cuando cambien las transacciones, pero con limpieza
  useEffect(() => {
    const processAndClean = async () => {
      await processSubscriptions();
      // Limpiar duplicados después del procesamiento automático
      setTimeout(() => cleanupDuplicateSubscriptions(), 1000);
    };
    processAndClean();
  }, [subscriptionTransactions.length]);

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
            <p className="text-sm">Agrega transacciones en categorías de "Suscripciones"</p>
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