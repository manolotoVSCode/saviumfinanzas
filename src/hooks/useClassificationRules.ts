import { useEffect } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { ClassificationMatchType, findMatchingRuleDetailed as findDetailed, RuleMatch } from '@/lib/classificationRules';
import { financeQueryKeys, STALE_TIME } from '@/lib/finance/queryKeys';

export interface ClassificationRule {
  id: string;
  user_id: string;
  name: string | null;
  keyword: string;
  match_type: ClassificationMatchType;
  category_id: string;
  cuenta_id: string | null;
  priority: number;
  active: boolean;
  amount_min: number | null;
  amount_max: number | null;
  created_at: string;
  updated_at: string;
}

const EMPTY: ClassificationRule[] = [];

const fetchRules = async (userId: string): Promise<ClassificationRule[]> => {
  const { data, error } = await supabase
    .from('classification_rules' as any)
    .select('*')
    .eq('user_id', userId)
    .order('priority', { ascending: false });
  if (error) {
    throw error;
  }
  return (data ?? []) as any as ClassificationRule[];
};

export function useClassificationRules() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const QK = financeQueryKeys(user?.id);

  const query = useQuery({
    queryKey: QK.reglas,
    queryFn: () => fetchRules(user!.id),
    staleTime: STALE_TIME,
    enabled: !!user,
  });
  const rules = query.data ?? EMPTY;

  useEffect(() => {
    if (query.error) console.error('Error loading classification rules:', query.error);
  }, [query.error]);

  const invalidate = () => queryClient.invalidateQueries({ queryKey: QK.reglas });

  const addRule = async (rule: Omit<ClassificationRule, 'id' | 'user_id' | 'created_at' | 'updated_at'>) => {
    if (!user) return;
    const { error } = await supabase
      .from('classification_rules' as any)
      .insert({ ...rule, user_id: user.id } as any);
    if (!error) await invalidate();
    return error;
  };

  const updateRule = async (id: string, updates: Partial<ClassificationRule>) => {
    if (!user) return;
    const { error } = await supabase
      .from('classification_rules' as any)
      .update(updates as any)
      .eq('id', id);
    if (!error) await invalidate();
    return error;
  };

  const deleteRule = async (id: string) => {
    if (!user) return;
    const { error } = await supabase
      .from('classification_rules' as any)
      .delete()
      .eq('id', id);
    if (!error) await invalidate();
    return error;
  };

  const findMatchingRuleDetailed = (description: string, amount?: number, accountId?: string): RuleMatch | null =>
    findDetailed(rules, description, amount, accountId);

  const findMatchingRule = (description: string, amount?: number, accountId?: string): string | null =>
    findMatchingRuleDetailed(description, amount, accountId)?.category_id ?? null;

  return { rules, loading: !!user && query.isPending, addRule, updateRule, deleteRule, findMatchingRule, findMatchingRuleDetailed, refreshRules: invalidate };
}
