import { useEffect, useMemo } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from '@/hooks/use-toast';
import { financeQueryKeys, STALE_TIME } from '@/lib/finance/queryKeys';

export type PendingTipo = 'reembolso_gasto' | 'ingreso_esperado';
export type PendingEstado = 'pendiente' | 'cobrado_parcial' | 'cobrado' | 'cancelado';

export interface Pending {
  id: string;
  user_id: string;
  transaccion_id: string | null;
  transaccion_cobro_id: string | null;
  tipo: PendingTipo;
  monto_esperado: number;
  monto_cobrado: number;
  divisa: string;
  fecha_esperada: string | null;
  fecha_cobro: string | null;
  estado: PendingEstado;
  concepto: string;
  notas: string | null;
  created_at: string;
  updated_at: string;
}

export type NewPending = Omit<Pending, 'id' | 'user_id' | 'created_at' | 'updated_at' | 'monto_cobrado' | 'transaccion_cobro_id' | 'fecha_cobro' | 'estado'> & {
  monto_cobrado?: number;
  estado?: PendingEstado;
};

const EMPTY: Pending[] = [];

const fetchPendings = async (userId: string): Promise<Pending[]> => {
  const { data, error } = await supabase
    .from('transaction_pendings')
    .select('*')
    .eq('user_id', userId)
    .order('fecha_esperada', { ascending: true, nullsFirst: false });
  if (error) throw error;
  return (data ?? []) as Pending[];
};

/**
 * Pendientes de cobro (tabla transaction_pendings) en la caché compartida:
 * una petición por sesión; cada mutación invalida `pendientes`.
 */
export const usePendings = () => {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const QK = financeQueryKeys(user?.id);

  const query = useQuery({
    queryKey: QK.pendientes,
    queryFn: () => fetchPendings(user!.id),
    staleTime: STALE_TIME,
    enabled: !!user,
  });
  const pendings = query.data ?? EMPTY;

  useEffect(() => {
    if (!query.error) return;
    console.error(query.error);
    toast({ title: 'Error', description: 'No se pudieron cargar los pendientes', variant: 'destructive' });
  }, [query.error]);

  const invalidate = () => queryClient.invalidateQueries({ queryKey: QK.pendientes });

  const addPending = async (p: NewPending) => {
    if (!user) return { error: new Error('No auth') };
    const { error } = await supabase.from('transaction_pendings').insert([{
      user_id: user.id,
      transaccion_id: p.transaccion_id,
      tipo: p.tipo,
      monto_esperado: p.monto_esperado,
      monto_cobrado: p.monto_cobrado ?? 0,
      divisa: p.divisa,
      fecha_esperada: p.fecha_esperada,
      concepto: p.concepto,
      notas: p.notas,
      estado: p.estado ?? 'pendiente',
    }]);
    if (error) {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
      return { error };
    }
    await invalidate();
    return { error: null };
  };

  const updatePending = async (id: string, updates: Partial<Pending>) => {
    const { error } = await supabase
      .from('transaction_pendings')
      .update(updates)
      .eq('id', id);
    if (error) {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
      return { error };
    }
    await invalidate();
    return { error: null };
  };

  const deletePending = async (id: string) => {
    const { error } = await supabase.from('transaction_pendings').delete().eq('id', id);
    if (error) {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
      return { error };
    }
    await invalidate();
    return { error: null };
  };

  /**
   * Marca un pendiente como cobrado SIN crear una transacción.
   * La transacción real llegará al importar el estado de cuenta y podrá vincularse.
   */
  const markAsPaid = async (opts: {
    pending: Pending;
    fechaCobro: Date;
    montoCobrado: number;
  }) => {
    if (!user) return { error: new Error('No auth') };
    const { pending, fechaCobro, montoCobrado } = opts;

    const totalCobrado = (pending.monto_cobrado ?? 0) + montoCobrado;
    const nuevoEstado: PendingEstado = totalCobrado >= pending.monto_esperado ? 'cobrado' : 'cobrado_parcial';

    const { error: updError } = await supabase
      .from('transaction_pendings')
      .update({
        monto_cobrado: totalCobrado,
        fecha_cobro: fechaCobro.toISOString().split('T')[0],
        estado: nuevoEstado,
      })
      .eq('id', pending.id);

    if (updError) {
      toast({ title: 'Error', description: updError.message, variant: 'destructive' });
      return { error: updError };
    }
    await invalidate();
    return { error: null };
  };

  const overdueCount = useMemo(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    return pendings.filter(p =>
      (p.estado === 'pendiente' || p.estado === 'cobrado_parcial') &&
      p.fecha_esperada &&
      new Date(p.fecha_esperada) < today
    ).length;
  }, [pendings]);

  const activeCount = useMemo(
    () => pendings.filter(p => p.estado === 'pendiente' || p.estado === 'cobrado_parcial').length,
    [pendings]
  );

  const totalPendientePorCobrar = useMemo(
    () => pendings
      .filter(p => p.estado === 'pendiente' || p.estado === 'cobrado_parcial')
      .reduce((sum, p) => sum + (p.monto_esperado - (p.monto_cobrado ?? 0)), 0),
    [pendings]
  );

  return {
    pendings,
    loading: !!user && query.isPending,
    /** Vuelve a pedir la lista (lo usa el importador tras vincular pendientes). */
    reload: async () => { await query.refetch(); },
    addPending,
    updatePending,
    deletePending,
    markAsPaid,
    overdueCount,
    activeCount,
    totalPendientePorCobrar,
  };
};
