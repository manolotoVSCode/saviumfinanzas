import { useEffect, useMemo } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { useFinanceDataSupabase } from '@/hooks/useFinanceDataSupabase';
import { financeQueryKeys, STALE_TIME } from '@/lib/finance/queryKeys';
import { Investment, InvestmentPayout, InvestmentValuation } from '@/types/investments';

interface InvestmentsData {
  investments: Investment[];
  valuations: InvestmentValuation[];
  payouts: InvestmentPayout[];
}

const EMPTY_INVESTMENTS: Investment[] = [];
const EMPTY_VALUATIONS: InvestmentValuation[] = [];
const EMPTY_PAYOUTS: InvestmentPayout[] = [];

/** Las tres tablas en una sola queryFn: se invalidan juntas (clave `inversiones`). */
const fetchInvestments = async (userId: string): Promise<InvestmentsData> => {
  const [inv, val, pay] = await Promise.all([
    supabase.from('inversiones').select('*').eq('user_id', userId).order('nombre'),
    supabase.from('investment_valuations').select('*').eq('user_id', userId).order('fecha', { ascending: true }),
    supabase.from('investment_payouts').select('*').eq('user_id', userId).order('fecha', { ascending: false }),
  ]);
  if (inv.error) throw inv.error;
  if (val.error) throw val.error;
  if (pay.error) throw pay.error;
  return {
    investments: (inv.data || []) as unknown as Investment[],
    valuations: (val.data || []) as unknown as InvestmentValuation[],
    payouts: (pay.data || []) as unknown as InvestmentPayout[],
  };
};

export const useInvestments = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  // saldo_cuenta sale de la caché de cuentas (saldoActual), no de consultas propias:
  // se refresca sola al importar y ahorra dos peticiones.
  const { accounts, loading: accountsLoading } = useFinanceDataSupabase();
  const QK = financeQueryKeys(user?.id);

  const query = useQuery({
    queryKey: QK.inversiones,
    queryFn: () => fetchInvestments(user!.id),
    staleTime: STALE_TIME,
    enabled: !!user,
  });

  useEffect(() => {
    if (!query.error) return;
    console.error('Error loading investments:', query.error);
    toast({ title: 'Error', description: 'No se pudieron cargar las inversiones', variant: 'destructive' });
  }, [query.error, toast]);

  const valuations = query.data?.valuations ?? EMPTY_VALUATIONS;
  const payouts = query.data?.payouts ?? EMPTY_PAYOUTS;

  const investments = useMemo(() => {
    const raw = query.data?.investments ?? EMPTY_INVESTMENTS;
    const saldoPorCuenta = new Map(accounts.map((a) => [a.id, a.saldoActual]));
    return raw.map((i) => {
      const lastVal = valuations
        .filter((v) => v.inversion_id === i.id)
        .sort((a, b) => a.fecha.localeCompare(b.fecha))
        .slice(-1)[0];
      const saldoCuenta = i.cuenta_id ? saldoPorCuenta.get(i.cuenta_id) : undefined;
      const valor =
        lastVal?.valor ??
        (saldoCuenta !== undefined ? saldoCuenta : i.valor_actual || i.monto_invertido || 0);
      return { ...i, saldo_cuenta: saldoCuenta ?? null, valor_actual: valor } as Investment;
    });
  }, [query.data, accounts, valuations]);

  const invalidate = () => queryClient.invalidateQueries({ queryKey: QK.inversiones });

  const saveInvestment = async (values: Partial<Investment>, id?: string) => {
    if (!user) return false;
    const payload = {
      user_id: user.id,
      nombre: values.nombre || '',
      tipo: values.tipo || 'Otros',
      tipo_id: values.tipo_id ?? null,
      monto_invertido: values.monto_invertido ?? 0,
      valor_actual: values.valor_actual ?? values.monto_invertido ?? 0,
      tasa_anual: values.tasa_anual ?? null,
      rendimiento_bruto: values.rendimiento_bruto ?? null,
      rendimiento_neto: values.rendimiento_neto ?? null,
      modalidad: values.modalidad_pago || values.modalidad || 'Reinversión',
      modalidad_pago: values.modalidad_pago ?? null,
      moneda: values.moneda || 'MXN',
      fecha_inicio: values.fecha_inicio || new Date().toISOString().slice(0, 10),
      fecha_vencimiento: values.fecha_vencimiento ?? null,
      cuenta_id: values.cuenta_id ?? null,
      beneficio_estimado: values.beneficio_estimado ?? null,
      notas: values.notas ?? null,
      activa: values.activa ?? true,
    };

    const { error } = id
      ? await supabase.from('inversiones').update(payload).eq('id', id)
      : await supabase.from('inversiones').insert(payload);

    if (error) {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
      return false;
    }
    await invalidate();
    return true;
  };

  const deleteInvestment = async (id: string) => {
    const { error } = await supabase.from('inversiones').delete().eq('id', id);
    if (error) {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
      return false;
    }
    await invalidate();
    return true;
  };

  const addValuation = async (
    inversionId: string,
    values: { fecha: string; valor: number; aportacion?: number; retiro?: number; notas?: string },
  ) => {
    if (!user) return false;
    const { error } = await supabase.from('investment_valuations').upsert(
      {
        user_id: user.id,
        inversion_id: inversionId,
        fecha: values.fecha,
        valor: values.valor,
        aportacion: values.aportacion ?? 0,
        retiro: values.retiro ?? 0,
        notas: values.notas ?? null,
      },
      { onConflict: 'inversion_id,fecha' },
    );
    if (error) {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
      return false;
    }
    await supabase.from('inversiones').update({ valor_actual: values.valor }).eq('id', inversionId);
    await invalidate();
    return true;
  };

  const deleteValuation = async (id: string) => {
    const { error } = await supabase.from('investment_valuations').delete().eq('id', id);
    if (error) {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
      return false;
    }
    await invalidate();
    return true;
  };

  const addPayout = async (
    inversionId: string,
    values: { fecha: string; monto: number; divisa: string; reinvertido?: boolean; notas?: string },
  ) => {
    if (!user) return false;
    const { error } = await supabase.from('investment_payouts').insert({
      user_id: user.id,
      inversion_id: inversionId,
      fecha: values.fecha,
      monto: values.monto,
      divisa: values.divisa,
      reinvertido: values.reinvertido ?? false,
      notas: values.notas ?? null,
    });
    if (error) {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
      return false;
    }
    await supabase.from('inversiones').update({ ultimo_pago: values.fecha }).eq('id', inversionId);
    await invalidate();
    return true;
  };

  const deletePayout = async (id: string) => {
    const { error } = await supabase.from('investment_payouts').delete().eq('id', id);
    if (error) {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
      return false;
    }
    await invalidate();
    return true;
  };

  return {
    investments,
    valuations,
    payouts,
    loading: (!!user && query.isPending) || accountsLoading,
    saveInvestment,
    deleteInvestment,
    addValuation,
    deleteValuation,
    addPayout,
    deletePayout,
    refresh: invalidate,
  };
};
