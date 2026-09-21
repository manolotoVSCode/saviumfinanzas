import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import type { Database } from '@/integrations/supabase/types';
import { financeQueryKeys } from './useFinanceDataSupabase';

export type SubscriptionService = Database['public']['Tables']['subscription_services']['Row'];

const EMPTY: SubscriptionService[] = [];

const fetchSubscriptionServices = async (): Promise<SubscriptionService[]> => {
  const { data, error } = await supabase.from('subscription_services').select('*').eq('active', true);
  if (error) throw error;
  return data ?? [];
};

/**
 * Suscripciones activas (tabla completa). staleTime 0 porque SubscriptionsManager
 * escribe en la tabla sin invalidar nada: cada montaje vuelve a pedirlas.
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
