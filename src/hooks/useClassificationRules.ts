import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

export interface ClassificationRule {
  id: string;
  user_id: string;
  keyword: string;
  match_type: 'exact' | 'contains' | 'starts_with';
  category_id: string;
  priority: number;
  active: boolean;
  created_at: string;
  updated_at: string;
}

export function useClassificationRules() {
  const { user } = useAuth();
  const [rules, setRules] = useState<ClassificationRule[]>([]);
  const [loading, setLoading] = useState(true);

  const loadRules = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    const { data, error } = await supabase
      .from('classification_rules' as any)
      .select('*')
      .eq('user_id', user.id)
      .order('priority', { ascending: false });
    
    if (!error && data) {
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

  const findMatchingRule = (description: string): string | null => {
    const normalized = description.toLowerCase().trim();
    
    // Rules are already sorted by priority desc
    for (const rule of rules) {
      if (!rule.active) continue;
      const keyword = rule.keyword.toLowerCase().trim();
      
      switch (rule.match_type) {
        case 'exact':
          if (normalized === keyword) return rule.category_id;
          break;
        case 'contains':
          if (normalized.includes(keyword)) return rule.category_id;
          break;
        case 'starts_with':
          if (normalized.startsWith(keyword)) return rule.category_id;
          break;
      }
    }
    return null;
  };

  return { rules, loading, addRule, updateRule, deleteRule, findMatchingRule, refreshRules: loadRules };
}
