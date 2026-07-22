import { useEffect, useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

export interface PaymentSkip {
  id: string;
  categoria_id: string;
  year: number;
  month: number; // 1-12
  razon: string | null;
}

export const usePaymentSkips = () => {
  const { user } = useAuth();
  const [skips, setSkips] = useState<PaymentSkip[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    if (!user) {
      setSkips([]);
      setLoading(false);
      return;
    }
    const { data, error } = await (supabase as any)
      .from('payment_skips')
      .select('id, categoria_id, year, month, razon')
      .eq('user_id', user.id);
    if (!error) setSkips((data as PaymentSkip[]) || []);
    setLoading(false);
  }, [user]);

  useEffect(() => {
    load();
  }, [load]);

  const addSkip = async (categoria_id: string, year: number, month: number, razon?: string) => {
    if (!user) return;
    const { data, error } = await (supabase as any)
      .from('payment_skips')
      .upsert(
        { user_id: user.id, categoria_id, year, month, razon: razon || null },
        { onConflict: 'user_id,categoria_id,year,month' }
      )
      .select()
      .single();
    if (!error && data) {
      setSkips(prev => {
        const filtered = prev.filter(s => !(s.categoria_id === categoria_id && s.year === year && s.month === month));
        return [...filtered, data as PaymentSkip];
      });
    }
  };

  const removeSkip = async (categoria_id: string, year: number, month: number) => {
    if (!user) return;
    const { error } = await (supabase as any)
      .from('payment_skips')
      .delete()
      .eq('user_id', user.id)
      .eq('categoria_id', categoria_id)
      .eq('year', year)
      .eq('month', month);
    if (!error) {
      setSkips(prev => prev.filter(s => !(s.categoria_id === categoria_id && s.year === year && s.month === month)));
    }
  };

  const findSkip = (categoria_id: string, year: number, month: number) =>
    skips.find(s => s.categoria_id === categoria_id && s.year === year && s.month === month);

  return { skips, loading, addSkip, removeSkip, findSkip, reload: load };
};
