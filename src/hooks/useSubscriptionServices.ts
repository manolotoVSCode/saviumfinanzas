import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import type { Database } from '@/integrations/supabase/types';
import { financeQueryKeys } from './useFinanceDataSupabase';

export type SubscriptionService = Database['public']['Tables']['subscription_services']['Row'];

const EMPTY: SubscriptionService[] = [];

const fetchSubscriptionServices = async (): Promise<SubscriptionService[]> => {
  const { data, error } = await supabase.from('subscription_services').select('*');
  if (error) throw error;
  return data ?? [];
};

/**
 * Todas las suscripciones (activas e inactivas): cada consumidor filtra `active`.
 * staleTime 0 hasta que SubscriptionsManager invalide al escribir (Task 2.5).
 */
export const useSubscriptionServices = () => {
  const { user } = useAuth();
  const query = useQuery({
    queryKey: financeQueryKeys(user?.id).subscriptions,
    queryFn: fetchSubscriptionServices,
    staleTime: 0,
    enabled: !!user,
  });
  return {
    subscriptions: query.data ?? EMPTY,
    loading: query.isPending,
    error: query.error,
  };
};
