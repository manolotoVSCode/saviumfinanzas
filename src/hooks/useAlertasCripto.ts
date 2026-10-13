import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { financeQueryKeys, STALE_TIME } from '@/lib/finance/queryKeys';
import { UmbralCripto } from '@/lib/finance/alerts';

const EMPTY: UmbralCripto[] = [];

const fetchUmbrales = async (): Promise<UmbralCripto[]> => {
  const { data, error } = await supabase.from('alertas_cripto').select('simbolo, nivel_arriba, nivel_abajo');
  if (error) throw error;
  return data ?? [];
};

/** Niveles de alerta por símbolo (tabla alertas_cripto). */
export const useAlertasCripto = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const QK = financeQueryKeys(user?.id);

  // Si falla (p.ej. migración sin aplicar) simplemente no hay alertas de cripto.
  const query = useQuery({
    queryKey: QK.alertasCripto,
    queryFn: fetchUmbrales,
    staleTime: STALE_TIME,
    enabled: !!user,
    retry: false,
  });

  const onError = (error: unknown) => {
    console.error('Error saving crypto alert:', error);
    toast({ title: 'Error', description: 'No se pudo guardar la alerta', variant: 'destructive' });
  };
  const onSuccess = () => queryClient.invalidateQueries({ queryKey: QK.alertasCripto });

  /** Sin ningún umbral se borra la fila. */
  const guardar = useMutation({
    mutationFn: async ({ simbolo, nivel_arriba, nivel_abajo }: UmbralCripto) => {
      if (!user) return;
      const { error } = nivel_arriba === null && nivel_abajo === null
        ? await supabase.from('alertas_cripto').delete().eq('simbolo', simbolo)
        : await supabase.from('alertas_cripto')
          .upsert({ user_id: user.id, simbolo, nivel_arriba, nivel_abajo }, { onConflict: 'user_id,simbolo' });
      if (error) throw error;
    },
    onSuccess,
    onError,
  });

  return {
    umbrales: query.data ?? EMPTY,
    guardar: guardar.mutateAsync,
    guardando: guardar.isPending,
  };
};
