import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { financeQueryKeys, STALE_TIME } from '@/lib/finance/queryKeys';

export interface UserProfile {
  id: string;
  user_id: string;
  nombre: string;
  apellidos: string;
  edad?: number;
  divisa_preferida: string;
  created_at: string;
  updated_at: string;
}

export const fetchProfile = async (userId: string): Promise<UserProfile> => {
  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .eq('user_id', userId)
    .single();
  if (error) throw error;
  return data as UserProfile;
};

/**
 * Perfil del usuario (tabla profiles). Una sola query `perfil` compartida con
 * useAppConfig; ProfileEditor la invalida al guardar, así la divisa preferida
 * se refleja en toda la app sin recargar.
 */
export const useUserProfile = () => {
  const { user } = useAuth();
  const query = useQuery({
    queryKey: financeQueryKeys(user?.id).perfil,
    queryFn: () => fetchProfile(user!.id),
    staleTime: STALE_TIME,
    enabled: !!user,
    retry: 1,
  });

  return {
    profile: query.data ?? null,
    /** true solo durante la primera carga con sesión (sin sesión, false como antes). */
    loading: !!user && query.isPending,
    refetch: query.refetch,
  };
};
