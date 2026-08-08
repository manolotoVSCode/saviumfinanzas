import { useCallback, useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { Investment, InvestmentPayout, InvestmentValuation } from '@/types/investments';

export const useInvestments = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [investments, setInvestments] = useState<Investment[]>([]);
  const [valuations, setValuations] = useState<InvestmentValuation[]>([]);
  const [payouts, setPayouts] = useState<InvestmentPayout[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchAll = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    const [inv, val, pay] = await Promise.all([
      supabase.from('inversiones').select('*').eq('user_id', user.id).order('nombre'),
      supabase.from('investment_valuations').select('*').eq('user_id', user.id).order('fecha', { ascending: true }),
      supabase.from('investment_payouts').select('*').eq('user_id', user.id).order('fecha', { ascending: false }),
    ]);

    if (inv.error || val.error || pay.error) {
      toast({ title: 'Error', description: 'No se pudieron cargar las inversiones', variant: 'destructive' });
      setLoading(false);
      return;
    }

    const rawInvestments = (inv.data || []) as unknown as Investment[];
    const valuationsData = (val.data || []) as unknown as InvestmentValuation[];

    // Saldo real de las cuentas vinculadas: saldo inicial + movimientos registrados
    const cuentaIds = Array.from(
      new Set(rawInvestments.map((i) => i.cuenta_id).filter((id): id is string => !!id)),
    );
    const saldoPorCuenta: Record<string, number> = {};
    if (cuentaIds.length > 0) {
      const [cuentasRes, txRes] = await Promise.all([
        supabase.from('cuentas').select('id, saldo_inicial').in('id', cuentaIds),
        supabase.from('transacciones').select('cuenta_id, ingreso, gasto').in('cuenta_id', cuentaIds),
      ]);
      (cuentasRes.data || []).forEach((c: { id: string; saldo_inicial: number }) => {
        saldoPorCuenta[c.id] = Number(c.saldo_inicial) || 0;
      });
      (txRes.data || []).forEach((t: { cuenta_id: string; ingreso: number; gasto: number }) => {
        saldoPorCuenta[t.cuenta_id] =
          (saldoPorCuenta[t.cuenta_id] || 0) + (Number(t.ingreso) || 0) - (Number(t.gasto) || 0);
      });
    }

    const enriched = rawInvestments.map((i) => {
      const lastVal = valuationsData
        .filter((v) => v.inversion_id === i.id)
        .sort((a, b) => a.fecha.localeCompare(b.fecha))
        .slice(-1)[0];
      const saldoCuenta = i.cuenta_id ? saldoPorCuenta[i.cuenta_id] : undefined;
      const valor =
        lastVal?.valor ??
        (saldoCuenta !== undefined ? saldoCuenta : i.valor_actual || i.monto_invertido || 0);
      return { ...i, saldo_cuenta: saldoCuenta ?? null, valor_actual: valor } as Investment;
    });

    setInvestments(enriched);
    setValuations(valuationsData);
    setPayouts((pay.data || []) as unknown as InvestmentPayout[]);
    setLoading(false);
  }, [user, toast]);

  useEffect(() => {
    fetchAll();
  }, [fetchAll]);

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
    await fetchAll();
    return true;
  };

  const deleteInvestment = async (id: string) => {
    const { error } = await supabase.from('inversiones').delete().eq('id', id);
    if (error) {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
      return false;
    }
    await fetchAll();
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
    await fetchAll();
    return true;
  };

  const deleteValuation = async (id: string) => {
    const { error } = await supabase.from('investment_valuations').delete().eq('id', id);
    if (error) {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
      return false;
    }
    await fetchAll();
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
    await fetchAll();
    return true;
  };

  const deletePayout = async (id: string) => {
    const { error } = await supabase.from('investment_payouts').delete().eq('id', id);
    if (error) {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
      return false;
    }
    await fetchAll();
    return true;
  };

  return {
    investments,
    valuations,
    payouts,
    loading,
    saveInvestment,
    deleteInvestment,
    addValuation,
    deleteValuation,
    addPayout,
    deletePayout,
    refresh: fetchAll,
  };
};
