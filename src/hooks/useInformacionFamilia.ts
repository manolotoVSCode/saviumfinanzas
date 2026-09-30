import { useCallback, useMemo } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import type { Json } from '@/integrations/supabase/types';
import { useAuth } from '@/contexts/AuthContext';
import { financeQueryKeys } from '@/lib/finance/queryKeys';
import { InfoFamilia, normalizarInfoFamilia, serializarInfoFamilia } from '@/lib/finance/familia';

export interface FilaFamilia {
  contenido: InfoFamilia;
  revisadoAt: string | null;
  /** Control de concurrencia: se actualiza con .eq('updated_at', este valor). */
  updatedAt: string;
}
export type ResultadoGuardado =
  | { tipo: 'ok'; fila: FilaFamilia }
  | { tipo: 'conflicto' }
  | { tipo: 'error'; error: unknown };

const COLUMNAS = 'contenido, revisado_at, updated_at';
interface FilaBD { contenido: Json; revisado_at: string | null; updated_at: string }
const aFila = (d: FilaBD): FilaFamilia => ({
  contenido: normalizarInfoFamilia(d.contenido), revisadoAt: d.revisado_at, updatedAt: d.updated_at,
});

const fetchFila = async (): Promise<FilaFamilia | null> => {
  const { data, error } = await supabase.from('informacion_familia').select(COLUMNAS).maybeSingle();
  if (error) throw error;
  return data ? aFila(data) : null;
};

/**
 * Fila de «Para mi familia». Sin refetch al volver a la pestaña: el editor
 * hidrata una vez y un refetch no debe competir con lo que se está escribiendo.
 */
export const useInformacionFamilia = () => {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const QK = useMemo(() => financeQueryKeys(user?.id), [user?.id]);

  const query = useQuery({
    queryKey: QK.informacionFamilia,
    queryFn: fetchFila,
    enabled: !!user,
    staleTime: Infinity,
    refetchOnWindowFocus: false,
    retry: false,
  });

  const alGuardar = useCallback((fila: FilaFamilia) => {
    queryClient.setQueryData(QK.informacionFamilia, fila);
    queryClient.setQueryData(QK.revisionFamilia, { revisadoAt: fila.revisadoAt });
  }, [queryClient, QK]);

  const guardar = useCallback(async (info: InfoFamilia, updatedAtLeido: string | null, forzar = false): Promise<ResultadoGuardado> => {
    if (!user) return { tipo: 'error', error: new Error('Sin sesión') };
    const contenido = serializarInfoFamilia(info) as unknown as Json;

    if (updatedAtLeido === null && !forzar) {
      // Primer guardado: crear la información cuenta como primera revisión.
      const { data, error } = await supabase
        .from('informacion_familia')
        .insert({ user_id: user.id, contenido, revisado_at: new Date().toISOString() })
        .select(COLUMNAS)
        .single();
      if (error) return error.code === '23505' ? { tipo: 'conflicto' } : { tipo: 'error', error };
      const fila = aFila(data);
      alGuardar(fila);
      return { tipo: 'ok', fila };
    }

    let q = supabase.from('informacion_familia').update({ contenido }).eq('user_id', user.id);
    if (!forzar && updatedAtLeido) q = q.eq('updated_at', updatedAtLeido);
    const { data, error } = await q.select(COLUMNAS).maybeSingle();
    if (error) return { tipo: 'error', error };
    if (!data) return { tipo: 'conflicto' }; // otra pestaña o dispositivo guardó antes
    const fila = aFila(data);
    alGuardar(fila);
    return { tipo: 'ok', fila };
  }, [user, alGuardar]);

  const marcarRevisado = useCallback(async (updatedAtLeido: string): Promise<ResultadoGuardado> => {
    if (!user) return { tipo: 'error', error: new Error('Sin sesión') };
    const { data, error } = await supabase
      .from('informacion_familia')
      .update({ revisado_at: new Date().toISOString() })
      .eq('user_id', user.id)
      .eq('updated_at', updatedAtLeido)
      .select(COLUMNAS)
      .maybeSingle();
    if (error) return { tipo: 'error', error };
    if (!data) return { tipo: 'conflicto' };
    const fila = aFila(data);
    alGuardar(fila);
    return { tipo: 'ok', fila };
  }, [user, alGuardar]);

  const { refetch } = query;
  const recargar = useCallback(async (): Promise<FilaFamilia | null> => {
    const r = await refetch();
    if (r.error) throw r.error;
    return r.data ?? null;
  }, [refetch]);

  return {
    fila: query.data ?? null,
    cargando: !!user && query.isPending,
    error: query.error,
    guardar,
    marcarRevisado,
    recargar,
  };
};
