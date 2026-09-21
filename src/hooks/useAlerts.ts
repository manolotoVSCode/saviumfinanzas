import { useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useFinanceDataSupabase } from './useFinanceDataSupabase';
import { useSubscriptionServices } from './useSubscriptionServices';
import { financeQueryKeys, STALE_TIME } from '@/lib/finance/queryKeys';
import { Alert, computeAlerts } from '@/lib/finance/alerts';

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
  const QK = financeQueryKeys(user?.id);
  const { categories, transactions, loading: financeLoading } = useFinanceDataSupabase();
  const [inactiveAnnual] = useState(readInactiveAnnual);

  const { subscriptions, loading: subsLoading } = useSubscriptionServices();
  const dismissalsQuery = useQuery({
    queryKey: QK.alertDismissals,
    queryFn: fetchDismissals,
    staleTime: STALE_TIME,
    enabled: !!user,
    retry: 1,
  });

  const allAlerts = useMemo(
    () => computeAlerts({ categories, transactions, subscriptions, inactiveAnnualIds: inactiveAnnual }),
    [categories, transactions, subscriptions, inactiveAnnual]
  );

  const dismissed = useMemo(() => new Set(dismissalsQuery.data ?? []), [dismissalsQuery.data]);
  const alerts = useMemo(() => allAlerts.filter(a => !dismissed.has(a.key)), [allAlerts, dismissed]);
  const dismissedAlerts = useMemo(() => allAlerts.filter(a => dismissed.has(a.key)), [allAlerts, dismissed]);

  // Optimista: la alerta desaparece/reaparece al instante y se confirma en segundo plano;
  // si falla, se recarga la lista de descartes.
  const dismissMutation = useMutation({
    mutationFn: async (alert: Alert) => {
      if (!user) return;
      const { error } = await supabase
        .from('alert_dismissals')
        .upsert({ user_id: user.id, alert_key: alert.key }, { onConflict: 'user_id,alert_key' });
      if (error) throw error;
    },
    onMutate: async (alert) => {
      await queryClient.cancelQueries({ queryKey: QK.alertDismissals });
      queryClient.setQueryData<string[]>(QK.alertDismissals, prev => [...(prev ?? []), alert.key]);
    },
    onError: (error) => {
      console.error('Error dismissing alert:', error);
      queryClient.invalidateQueries({ queryKey: QK.alertDismissals });
    },
  });

  const restoreMutation = useMutation({
    mutationFn: async (alert: Alert) => {
      if (!user) return;
      const { error } = await supabase
        .from('alert_dismissals')
        .delete()
        .eq('user_id', user.id)
        .eq('alert_key', alert.key);
      if (error) throw error;
    },
    onMutate: async (alert) => {
      await queryClient.cancelQueries({ queryKey: QK.alertDismissals });
      queryClient.setQueryData<string[]>(QK.alertDismissals, prev => (prev ?? []).filter(k => k !== alert.key));
    },
    onError: (error) => {
      console.error('Error restoring alert:', error);
      queryClient.invalidateQueries({ queryKey: QK.alertDismissals });
    },
  });

  return {
    alerts,
    dismissedAlerts,
    count: alerts.length,
    loading: financeLoading || subsLoading || dismissalsQuery.isPending,
    dismiss: dismissMutation.mutate,
    restore: restoreMutation.mutate,
  };
};
