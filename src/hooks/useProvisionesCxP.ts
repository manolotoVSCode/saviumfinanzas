import { useEffect } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from '@/hooks/use-toast';
import { financeQueryKeys, STALE_TIME } from '@/lib/finance/queryKeys';
import { CxPProvision, siguienteFechaProvision } from '@/lib/finance/cxp';
import { parseFechaLocal, toFechaISO } from '@/lib/finance/fechas';

export type NuevaProvision = Pick<CxPProvision, 'concepto' | 'monto' | 'divisa' | 'fecha' | 'frecuencia' | 'notas'>;

const EMPTY: CxPProvision[] = [];

const fetchProvisiones = async (userId: string): Promise<CxPProvision[]> => {
  const { data, error } = await supabase
    .from('provisiones_cxp')
    .select('id, concepto, monto, divisa, fecha, frecuencia, estado, fecha_pago, notas')
    .eq('user_id', userId)
    .order('fecha', { ascending: true });
  if (error) throw error;
  return (data ?? []).map((p) => ({ ...p, monto: Number(p.monto) })) as CxPProvision[];
};

/**
 * Provisiones manuales de CxP (tabla provisiones_cxp). No crean movimientos ni
 * tocan saldos: solo suman en el total por pagar hasta marcarlas como pagadas.
 */
export const useProvisionesCxP = () => {
  const { user, datosId } = useAuth();
  const queryClient = useQueryClient();
  const QK = financeQueryKeys(user?.id);

  const query = useQuery({
    queryKey: QK.provisionesCxP,
    queryFn: () => fetchProvisiones(datosId!),
    staleTime: STALE_TIME,
    enabled: !!datosId,
  });

  useEffect(() => {
    if (!query.error) return;
    console.error(query.error);
    toast({ title: 'Error', description: 'No se pudieron cargar las provisiones', variant: 'destructive' });
  }, [query.error]);

  /** Ejecuta la escritura, avisa si falla y refresca la lista. */
  const escribir = async (op: PromiseLike<{ error: { message: string } | null }>) => {
    const { error } = await op;
    if (error) {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
      return { error };
    }
    await queryClient.invalidateQueries({ queryKey: QK.provisionesCxP });
    return { error: null };
  };

  const addProvision = (p: NuevaProvision) =>
    user ? escribir(supabase.from('provisiones_cxp').insert([{ ...p, user_id: user.id }])) : Promise.resolve({ error: new Error('No auth') });

  const updateProvision = (id: string, updates: Partial<Omit<CxPProvision, 'id'>>) =>
    escribir(supabase.from('provisiones_cxp').update(updates).eq('id', id));

  const deleteProvision = (id: string) =>
    escribir(supabase.from('provisiones_cxp').delete().eq('id', id));

  /**
   * Marca el próximo pago como hecho SIN crear un movimiento (llegará con la importación).
   * Una única queda «pagado»; una recurrente sigue pendiente con la fecha del siguiente periodo.
   */
  const markAsPaid = (p: CxPProvision, fechaPago: Date) => {
    const siguiente = siguienteFechaProvision(parseFechaLocal(p.fecha), p.frecuencia);
    return updateProvision(p.id, siguiente
      ? { fecha: toFechaISO(siguiente), fecha_pago: toFechaISO(fechaPago) }
      : { estado: 'pagado', fecha_pago: toFechaISO(fechaPago) });
  };

  return {
    provisiones: query.data ?? EMPTY,
    loading: !!user && query.isPending,
    addProvision,
    updateProvision,
    deleteProvision,
    markAsPaid,
  };
};
