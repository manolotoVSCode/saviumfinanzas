import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { ClassificationMatchType, matchesClassificationRule } from '@/lib/classificationRules';

export interface ClassificationRule {
  id: string;
  user_id: string;
  name: string | null;
  keyword: string;
  match_type: ClassificationMatchType;
  category_id: string;
  priority: number;
  active: boolean;
  amount_min: number | null;
  amount_max: number | null;
  created_at: string;
  updated_at: string;
}

export function useClassificationRules() {
  const { user } = useAuth();
  const [rules, setRules] = useState<ClassificationRule[]>([]);
  const [loading, setLoading] = useState(true);

  const loadRules = useCallback(async () => {
    if (!user) {
      setLoading(false);
      return;
    }
    setLoading(true);
    const { data, error } = await supabase
      .from('classification_rules' as any)
      .select('*')
      .eq('user_id', user.id)
      .order('priority', { ascending: false });
    
    if (error) {
      console.error('[ClassificationRules] Error:', error);
    }
    if (data) {
      setRules(data as any as ClassificationRule[]);
    }
    setLoading(false);
  }, [user]);

  useEffect(() => { loadRules(); }, [loadRules]);

  const addRule = async (rule: Omit<ClassificationRule, 'id' | 'user_id' | 'created_at' | 'updated_at'>) => {
    if (!user) return;
    const { error } = await supabase
      .from('classification_rules' as any)
      .insert({ ...rule, user_id: user.id } as any);
    if (!error) await loadRules();
    return error;
  };

  const updateRule = async (id: string, updates: Partial<ClassificationRule>) => {
    if (!user) return;
    const { error } = await supabase
      .from('classification_rules' as any)
      .update(updates as any)
      .eq('id', id);
    if (!error) await loadRules();
    return error;
  };

  const deleteRule = async (id: string) => {
    if (!user) return;
    const { error } = await supabase
      .from('classification_rules' as any)
      .delete()
      .eq('id', id);
    if (!error) await loadRules();
    return error;
  };

  const findMatchingRule = (description: string, amount?: number): string | null => {
    // Rules are already sorted by priority desc
    for (const rule of rules) {
      if (!rule.active) continue;

      if (!matchesClassificationRule(description, rule.keyword, rule.match_type)) continue;

      // Amount filters are AND conditions — both keyword AND amount must match
      if (rule.amount_min !== null && amount !== undefined && amount < rule.amount_min) continue;
      if (rule.amount_max !== null && amount !== undefined && amount > rule.amount_max) continue;
      // If rule has amount filters but no amount provided, skip this rule
      if ((rule.amount_min !== null || rule.amount_max !== null) && amount === undefined) continue;

      return rule.category_id;
    }
    return null;
  };

  return { rules, loading, addRule, updateRule, deleteRule, findMatchingRule, refreshRules: loadRules };
}
