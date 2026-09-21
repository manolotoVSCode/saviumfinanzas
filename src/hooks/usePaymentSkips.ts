import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { financeQueryKeys, STALE_TIME } from '@/lib/finance/queryKeys';

export interface PaymentSkip {
  id: string;
  categoria_id: string;
  year: number;
  month: number; // 1-12
  razon: string | null;
}

const EMPTY: PaymentSkip[] = [];

const fetchSkips = async (userId: string): Promise<PaymentSkip[]> => {
  const { data, error } = await (supabase as any)
    .from('payment_skips')
    .select('id, categoria_id, year, month, razon')
    .eq('user_id', userId);
  if (error) throw error;
  return (data as PaymentSkip[]) || [];
};

export const usePaymentSkips = () => {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const QK = financeQueryKeys(user?.id);

  const query = useQuery({
    queryKey: QK.paymentSkips,
    queryFn: () => fetchSkips(user!.id),
    staleTime: STALE_TIME,
    enabled: !!user,
  });
  const skips = query.data ?? EMPTY;

  const invalidate = () => queryClient.invalidateQueries({ queryKey: QK.paymentSkips });

  const addSkip = async (categoria_id: string, year: number, month: number, razon?: string) => {
    if (!user) return;
    const { error } = await (supabase as any)
      .from('payment_skips')
      .upsert(
        { user_id: user.id, categoria_id, year, month, razon: razon || null },
        { onConflict: 'user_id,categoria_id,year,month' }
      );
    if (!error) await invalidate();
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
    if (!error) await invalidate();
  };

  const findSkip = (categoria_id: string, year: number, month: number) =>
    skips.find(s => s.categoria_id === categoria_id && s.year === year && s.month === month);

  return { skips, loading: !!user && query.isPending, addSkip, removeSkip, findSkip, reload: invalidate };
};
