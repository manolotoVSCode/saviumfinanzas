import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import type { Database } from '@/integrations/supabase/types';
import { financeQueryKeys, STALE_TIME } from '@/lib/finance/queryKeys';

export type SubscriptionService = Database['public']['Tables']['subscription_services']['Row'];

const EMPTY: SubscriptionService[] = [];

const fetchSubscriptionServices = async (): Promise<SubscriptionService[]> => {
  const { data, error } = await supabase.from('subscription_services').select('*');
  if (error) throw error;
  return data ?? [];
};

/** Todas las suscripciones (activas e inactivas): cada consumidor filtra `active`. Las mutaciones de SubscriptionsManager y useSubscriptionSync invalidan la clave. */
export const useSubscriptionServices = () => {
  const { user } = useAuth();
  const query = useQuery({
    queryKey: financeQueryKeys(user?.id).subscriptions,
    queryFn: fetchSubscriptionServices,
    staleTime: STALE_TIME,
    enabled: !!user,
  });
  return {
    subscriptions: query.data ?? EMPTY,
    loading: query.isPending,
    error: query.error,
  };
};
