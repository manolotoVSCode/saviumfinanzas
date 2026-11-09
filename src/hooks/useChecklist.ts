import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { financeQueryKeys, STALE_TIME } from '@/lib/finance/queryKeys';
import { cambiosAlMarcar, ChecklistItem } from '@/lib/finance/checklist';
import { formatFechaCorta, parseFechaLocal } from '@/lib/finance/fechas';

const EMPTY: ChecklistItem[] = [];

export const fetchChecklist = async (): Promise<ChecklistItem[]> => {
  const { data, error } = await supabase
    .from('checklist_items')
    .select('id, texto, fecha, transaccion_id, repetir, completada, completada_at, created_at')
    .order('created_at');
  if (error) throw error;
  return (data ?? []).map(r => ({ ...r, repetir: r.repetir === 'mensual' ? 'mensual' : null }));
};

export interface ChecklistDatos {
  texto: string;
  fecha: string | null;
  transaccion_id: string | null;
  repetir: 'mensual' | null;
}

/** Tareas del Checklist (tabla checklist_items). Optimista al marcar; el resto recarga. */
export const useChecklist = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const QK = financeQueryKeys(user?.id);

  // Si falla (p.ej. migración sin aplicar) la lista queda vacía y no rompe Alertas.
  const query = useQuery({
    queryKey: QK.checklist,
    queryFn: fetchChecklist,
    staleTime: STALE_TIME,
    enabled: !!user,
    retry: false,
  });

  const recargar = () => queryClient.invalidateQueries({ queryKey: QK.checklist });
  const onError = (error: unknown) => {
    console.error('Error saving checklist:', error);
    toast({ title: 'Error', description: 'No se pudo guardar el checklist', variant: 'destructive' });
    recargar();
  };

  const crear = useMutation({
    mutationFn: async (datos: ChecklistDatos) => {
      if (!user) return;
      const { error } = await supabase.from('checklist_items').insert({ ...datos, user_id: user.id });
      if (error) throw error;
    },
    onSuccess: recargar,
    onError,
  });

  const actualizar = useMutation({
    mutationFn: async ({ id, ...datos }: ChecklistDatos & { id: string }) => {
      const { error } = await supabase.from('checklist_items').update(datos).eq('id', id);
      if (error) throw error;
    },
    onSuccess: recargar,
    onError,
  });

  // Las mensuales no se completan: avanzan un mes (cambiosAlMarcar) y se avisa la próxima fecha.
  const marcar = useMutation({
    mutationFn: async ({ id, cambios }: { id: string; cambios: ReturnType<typeof cambiosAlMarcar> }) => {
      const { error } = await supabase.from('checklist_items').update(cambios).eq('id', id);
      if (error) throw error;
    },
    onMutate: async ({ id, cambios }) => {
      await queryClient.cancelQueries({ queryKey: QK.checklist });
      queryClient.setQueryData<ChecklistItem[]>(QK.checklist, prev =>
        (prev ?? []).map(i => (i.id === id ? { ...i, ...cambios } : i)));
    },
    onSuccess: (_d, { cambios }) => {
      if (cambios.fecha) toast({ title: 'Hecha este mes', description: `Vuelve el ${formatFechaCorta(parseFechaLocal(cambios.fecha))}` });
    },
    onError,
  });

  const borrar = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('checklist_items').delete().eq('id', id);
      if (error) throw error;
    },
    onMutate: async (id) => {
      await queryClient.cancelQueries({ queryKey: QK.checklist });
      queryClient.setQueryData<ChecklistItem[]>(QK.checklist, prev => (prev ?? []).filter(i => i.id !== id));
    },
    onError,
  });

  return {
    items: query.data ?? EMPTY,
    loading: query.isPending && !!user,
    error: query.isError,
    crear: crear.mutateAsync,
    actualizar: actualizar.mutateAsync,
    marcar: (item: ChecklistItem, completada: boolean) =>
      marcar.mutate({ id: item.id, cambios: cambiosAlMarcar(item, completada) }),
    borrar: borrar.mutate,
    guardando: crear.isPending || actualizar.isPending,
  };
};
