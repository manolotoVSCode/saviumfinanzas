import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { esAdmin } from '@/lib/admin';

/** Comentarios sin leer de «Ayúdanos a mejorar» por app (solo el administrador; para los demás, ceros). */
export interface ComentariosApps {
  share: number;
  piggy: number;
}

export const CLAVE_COMENTARIOS_APPS = ['apps_comentarios'];

export function useComentariosApps(): ComentariosApps & { total: number } {
  const { user } = useAuth();
  const admin = esAdmin(user?.id);
  const { data } = useQuery({
    queryKey: CLAVE_COMENTARIOS_APPS,
    enabled: admin,
    staleTime: 60_000,
    refetchInterval: 5 * 60_000,
    retry: false,
    queryFn: async () => {
      // Fuera de los tipos generados de Supabase, como los paneles de las apps.
      const { data, error } = await supabase.rpc('apps_comentarios_sin_leer' as never);
      if (error) throw new Error(error.message);
      return data as ComentariosApps;
    },
  });
  const share = data?.share ?? 0;
  const piggy = data?.piggy ?? 0;
  return { share, piggy, total: share + piggy };
}
