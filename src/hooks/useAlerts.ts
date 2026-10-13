import { useMemo, useState } from 'react';
import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useFinanceDataSupabase } from './useFinanceDataSupabase';
import { useSubscriptionServices } from './useSubscriptionServices';
import { useAlertasCripto } from './useAlertasCripto';
import { fetchCriptomonedas, fetchPrecios } from './useCriptomonedas';
import { useExchangeRates } from './useExchangeRates';
import { financeQueryKeys, STALE_TIME } from '@/lib/finance/queryKeys';
import { Alert, computeAlerts, CriptoAlertasInput, RevisionFamilia } from '@/lib/finance/alerts';
import { CurrencyCode } from '@/lib/finance/dashboardMetrics';
import { readInactiveAnnualIds } from '@/lib/finance/annualPayments';

const fetchDismissals = async (): Promise<string[]> => {
  const { data, error } = await supabase.from('alert_dismissals').select('alert_key');
  if (error) throw error;
  return (data ?? []).map(d => d.alert_key);
};

/** Solo revisado_at: useAlerts se monta en todas las páginas y no debe traer el documento. */
export const fetchRevisionFamilia = async (): Promise<RevisionFamilia | null> => {
  const { data, error } = await supabase.from('informacion_familia').select('revisado_at').maybeSingle();
  if (error) throw error;
  return data ? { revisadoAt: data.revisado_at } : null;
};

/**
 * Alertas calculadas en cliente (pagos anuales próximos, suscripciones que
 * suben, categorías disparadas, revisión de la información familiar, criptos que pasan su umbral)
 * menos las descartadas por el usuario.
 */
export const useAlerts = () => {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const QK = financeQueryKeys(user?.id);
  const { categories, transactions, loading: financeLoading } = useFinanceDataSupabase();
  const [inactiveAnnual] = useState(readInactiveAnnualIds);

  const { subscriptions, loading: subsLoading } = useSubscriptionServices();
  const dismissalsQuery = useQuery({
    queryKey: QK.alertDismissals,
    queryFn: fetchDismissals,
    staleTime: STALE_TIME,
    enabled: !!user,
    retry: 1,
  });

  // Si falla (p.ej. migración sin aplicar) no hay alerta y no bloquea el resto: fuera de `loading`.
  const revisionQuery = useQuery({
    queryKey: QK.revisionFamilia,
    queryFn: fetchRevisionFamilia,
    staleTime: STALE_TIME,
    enabled: !!user,
    retry: false,
  });
  const revisionFamilia = revisionQuery.data ?? null;

  // Criptos: solo se piden (y sus precios) si hay algún umbral. Mismas claves que useCriptomonedas,
  // así que comparten caché con Inversiones. Un fallo no bloquea: sin precios no hay alerta.
  const { umbrales } = useAlertasCripto();
  const { convertCurrency } = useExchangeRates();
  const criptosQuery = useQuery({
    queryKey: QK.criptomonedas,
    queryFn: fetchCriptomonedas,
    staleTime: STALE_TIME,
    enabled: !!user && umbrales.length > 0,
  });
  const simbolos = useMemo(() => [...new Set((criptosQuery.data ?? []).map(c => c.simbolo))].sort(), [criptosQuery.data]);
  const preciosQuery = useQuery({
    queryKey: [...QK.criptoPrecios, simbolos.join(',')],
    queryFn: () => fetchPrecios(simbolos),
    staleTime: STALE_TIME,
    placeholderData: keepPreviousData,
    retry: 1,
    enabled: !!user && umbrales.length > 0 && simbolos.length > 0,
  });
  const cripto = useMemo((): CriptoAlertasInput | null => {
    if (umbrales.length === 0 || !criptosQuery.data || !preciosQuery.data) return null;
    const precios = Object.fromEntries(Object.entries(preciosQuery.data).map(([s, p]) => [s, p.price]));
    return {
      criptos: criptosQuery.data,
      precios,
      umbrales,
      aUSD: (importe, divisa) => convertCurrency(importe, divisa as CurrencyCode, 'USD'),
    };
  }, [umbrales, criptosQuery.data, preciosQuery.data, convertCurrency]);

  const allAlerts = useMemo(
    () => computeAlerts({ categories, transactions, subscriptions, inactiveAnnualIds: inactiveAnnual, revisionFamilia, cripto }),
    [categories, transactions, subscriptions, inactiveAnnual, revisionFamilia, cripto]
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
