import { useCallback, useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { InvestmentType } from '@/types/investments';

export const useInvestmentTypes = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [types, setTypes] = useState<InvestmentType[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchTypes = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    const { data, error } = await supabase
      .from('investment_types')
      .select('*')
      .eq('user_id', user.id)
      .order('orden', { ascending: true })
      .order('nombre', { ascending: true });

    if (error) {
      toast({ title: 'Error', description: 'No se pudieron cargar los tipos de inversión', variant: 'destructive' });
    } else {
      setTypes((data || []) as unknown as InvestmentType[]);
    }
    setLoading(false);
  }, [user, toast]);

  useEffect(() => {
    fetchTypes();
  }, [fetchTypes]);

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
    await fetchTypes();
    return true;
  };

  const updateType = async (id: string, values: Partial<InvestmentType>) => {
    const { error } = await supabase.from('investment_types').update(values).eq('id', id);
    if (error) {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
      return false;
    }
    await fetchTypes();
    return true;
  };

  const deleteType = async (id: string) => {
    const { error } = await supabase.from('investment_types').delete().eq('id', id);
    if (error) {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
      return false;
    }
    await fetchTypes();
    return true;
  };

  return { types, loading, createType, updateType, deleteType, refreshTypes: fetchTypes };
};
