import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

export interface FinancialHealthRecord {
  id?: string;
  user_id: string;
  fecha: string;
  score: number;
  liquidez_score: number;
  ahorro_score: number;
  diversificacion_score: number;
  endeudamiento_score: number;
  rendimiento_inversiones_score: number;
  liquidez_ratio?: number;
  ahorro_ratio?: number;
  endeudamiento_ratio?: number;
  rendimiento_inversiones?: number;
  activos_total?: number;
  pasivos_total?: number;
  balance_mensual?: number;
}

export const useFinancialHealthHistory = () => {
  const { user } = useAuth();
  const [history, setHistory] = useState<FinancialHealthRecord[]>([]);
  const [loading, setLoading] = useState(true);

  // Cargar histórico
  const fetchHistory = async () => {
    if (!user) return;
    
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('financial_health_history')
        .select('*')
        .eq('user_id', user.id)
        .order('fecha', { ascending: false })
        .limit(12); // Últimos 12 registros

      if (error) throw error;
      setHistory(data || []);
    } catch (error) {
      console.error('Error fetching financial health history:', error);
    } finally {
      setLoading(false);
    }
  };

  // Guardar nuevo registro
  const saveRecord = async (record: Omit<FinancialHealthRecord, 'id' | 'user_id'>) => {
    if (!user) return;

    try {
      // Verificar si ya existe un registro para esta fecha
      const { data: existing } = await supabase
        .from('financial_health_history')
        .select('id')
        .eq('user_id', user.id)
        .eq('fecha', record.fecha)
        .maybeSingle();

      if (existing) {
        // Actualizar registro existente
        const { error } = await supabase
          .from('financial_health_history')
          .update(record)
          .eq('id', existing.id);

        if (error) throw error;
      } else {
        // Insertar nuevo registro
        const { error } = await supabase
          .from('financial_health_history')
          .insert({
            ...record,
            user_id: user.id
          });

        if (error) throw error;
      }

      // Recargar histórico
      await fetchHistory();
    } catch (error) {
      console.error('Error saving financial health record:', error);
    }
  };

  useEffect(() => {
    fetchHistory();
  }, [user]);

  return {
    history,
    loading,
    saveRecord,
    refreshHistory: fetchHistory
  };
};
