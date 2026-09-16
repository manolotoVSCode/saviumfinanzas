import { useCallback, useMemo, useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useFinanceDataSupabase } from './useFinanceDataSupabase';
import { Alert, computeAlerts, SubscriptionForAlerts } from '@/lib/finance/alerts';

const STALE_TIME = 5 * 60 * 1000;

const fetchSubscriptions = async (): Promise<SubscriptionForAlerts[]> => {
  const { data, error } = await supabase
    .from('subscription_services')
    .select('id, service_name, active, original_comments');
  if (error) throw error;
  return (data ?? []).map(s => ({
    id: s.id,
    serviceName: s.service_name,
    active: s.active,
    originalComments: s.original_comments ?? [],
  }));
};

const fetchDismissals = async (): Promise<string[]> => {
  const { data, error } = await supabase.from('alert_dismissals').select('alert_key');
  if (error) throw error;
  return (data ?? []).map(d => d.alert_key);
};

/** Misma clave que usa AnnualPaymentsTracker para los pagos marcados inactivos. */
const readInactiveAnnual = (): Set<string> => {
  try {
    const saved = localStorage.getItem('inactive_annual_payments');
    return new Set(saved ? (JSON.parse(saved) as string[]) : []);
  } catch {
    return new Set();
  }
};

/**
 * Alertas calculadas en cliente (pagos anuales próximos, suscripciones que
 * suben, categorías disparadas) menos las descartadas por el usuario.
 */
export const useAlerts = () => {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const { categories, transactions, loading: financeLoading } = useFinanceDataSupabase();
  const [inactiveAnnual] = useState(readInactiveAnnual);

  const subscriptionsQuery = useQuery({
    queryKey: ['finance', user?.id, 'subscriptions-for-alerts'],
    queryFn: fetchSubscriptions,
    staleTime: STALE_TIME,
    enabled: !!user,
  });
  const dismissalsKey = ['finance', user?.id, 'alert-dismissals'];
  const dismissalsQuery = useQuery({
    queryKey: dismissalsKey,
    queryFn: fetchDismissals,
    staleTime: STALE_TIME,
    enabled: !!user,
    retry: 1,
  });

  const allAlerts = useMemo(
    () => computeAlerts({ categories, transactions, subscriptions: subscriptionsQuery.data ?? [], inactiveAnnualIds: inactiveAnnual }),
    [categories, transactions, subscriptionsQuery.data, inactiveAnnual]
  );

  const dismissed = useMemo(() => new Set(dismissalsQuery.data ?? []), [dismissalsQuery.data]);
  const alerts = useMemo(() => allAlerts.filter(a => !dismissed.has(a.key)), [allAlerts, dismissed]);
  const dismissedAlerts = useMemo(() => allAlerts.filter(a => dismissed.has(a.key)), [allAlerts, dismissed]);

  const dismiss = useCallback(async (alert: Alert) => {
    if (!user) return;
    // Optimista: desaparece al instante y se confirma en segundo plano
    queryClient.setQueryData<string[]>(dismissalsKey, prev => [...(prev ?? []), alert.key]);
    const { error } = await supabase.from('alert_dismissals').upsert({ user_id: user.id, alert_key: alert.key }, { onConflict: 'user_id,alert_key' });
    if (error) {
      console.error('Error dismissing alert:', error);
      queryClient.invalidateQueries({ queryKey: dismissalsKey });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user, queryClient]);

  const restore = useCallback(async (alert: Alert) => {
    if (!user) return;
    queryClient.setQueryData<string[]>(dismissalsKey, prev => (prev ?? []).filter(k => k !== alert.key));
    const { error } = await supabase.from('alert_dismissals').delete().eq('user_id', user.id).eq('alert_key', alert.key);
    if (error) {
      console.error('Error restoring alert:', error);
      queryClient.invalidateQueries({ queryKey: dismissalsKey });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user, queryClient]);

  return {
    alerts,
    dismissedAlerts,
    count: alerts.length,
    loading: financeLoading || subscriptionsQuery.isPending || dismissalsQuery.isPending,
    dismiss,
    restore,
  };
};
