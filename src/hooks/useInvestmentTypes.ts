import { useEffect } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { financeQueryKeys, STALE_TIME } from '@/lib/finance/queryKeys';
import { InvestmentType } from '@/types/investments';

const EMPTY: InvestmentType[] = [];

const fetchTypes = async (userId: string): Promise<InvestmentType[]> => {
  const { data, error } = await supabase
    .from('investment_types')
    .select('*')
    .eq('user_id', userId)
    .order('orden', { ascending: true })
    .order('nombre', { ascending: true });
  if (error) throw error;
  return (data || []) as unknown as InvestmentType[];
};

export const useInvestmentTypes = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const QK = financeQueryKeys(user?.id);

  const query = useQuery({
    queryKey: QK.tiposInversion,
    queryFn: () => fetchTypes(user!.id),
    staleTime: STALE_TIME,
    enabled: !!user,
  });
  const types = query.data ?? EMPTY;

  useEffect(() => {
    if (!query.error) return;
    console.error('Error loading investment types:', query.error);
    toast({ title: 'Error', description: 'No se pudieron cargar los tipos de inversión', variant: 'destructive' });
  }, [query.error, toast]);

  const invalidate = () => queryClient.invalidateQueries({ queryKey: QK.tiposInversion });

  const createType = async (values: Partial<InvestmentType>) => {
    if (!user) return false;
    const { error } = await supabase.from('investment_types').insert({
      user_id: user.id,
      nombre: values.nombre || '',
      comportamiento: values.comportamiento || 'valuacion_manual',
      permite_reinversion: values.permite_reinversion ?? false,
      requiere_vencimiento: values.requiere_vencimiento ?? false,
      orden: values.orden ?? types.length + 1,
    });
    if (error) {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
      return false;
    }
    await invalidate();
    return true;
  };

  const updateType = async (id: string, values: Partial<InvestmentType>) => {
    const { error } = await supabase.from('investment_types').update(values).eq('id', id);
    if (error) {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
      return false;
    }
    await invalidate();
    return true;
  };

  const deleteType = async (id: string) => {
    const { error } = await supabase.from('investment_types').delete().eq('id', id);
    if (error) {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
      return false;
    }
    await invalidate();
    return true;
  };

  return { types, loading: !!user && query.isPending, createType, updateType, deleteType, refreshTypes: invalidate };
};
