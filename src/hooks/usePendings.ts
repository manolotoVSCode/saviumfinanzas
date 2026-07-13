import { useState, useEffect, useCallback, useMemo } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from '@/hooks/use-toast';

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

export const usePendings = () => {
  const { user } = useAuth();
  const [pendings, setPendings] = useState<Pending[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    if (!user) {
      setPendings([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    const { data, error } = await supabase
      .from('transaction_pendings')
      .select('*')
      .eq('user_id', user.id)
      .order('fecha_esperada', { ascending: true, nullsFirst: false });
    if (error) {
      console.error(error);
      toast({ title: 'Error', description: 'No se pudieron cargar los pendientes', variant: 'destructive' });
    } else {
      setPendings((data ?? []) as Pending[]);
    }
    setLoading(false);
  }, [user]);

  useEffect(() => { load(); }, [load]);

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
    await load();
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
    await load();
    return { error: null };
  };

  const deletePending = async (id: string) => {
    const { error } = await supabase.from('transaction_pendings').delete().eq('id', id);
    if (error) {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
      return { error };
    }
    await load();
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
    await load();
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
    loading,
    reload: load,
    addPending,
    updatePending,
    deletePending,
    markAsPaid,
    overdueCount,
    activeCount,
    totalPendientePorCobrar,
  };
};
