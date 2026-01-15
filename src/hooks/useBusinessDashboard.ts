import { useState, useEffect, useMemo } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

export interface BusinessDashboardMetrics {
  saldo_bancos: number;
  cxc_aging: Record<string, number>;
  cxc_total: number;
  cxp_aging: Record<string, number>;
  cxp_total: number;
  ingresos_periodo: number;
  gastos_periodo: number;
  utilidad_neta: number;
  margen_neto: number;
  monthly_comparison: { mes: string; ingresos: number; gastos: number }[];
  gastos_categoria: { categoria: string; total: number }[];
  facturas_emitidas: number;
  facturas_canceladas: number;
  facturas_pendientes: number;
  iva_por_pagar: number;
  isr_retenido: number;
  dso: number;
  periodo: { inicio: string; fin: string };
}

export type PeriodFilter = 'today' | 'month' | 'quarter' | 'year';

interface UseBusinessDashboardOptions {
  period?: PeriodFilter;
  customStartDate?: Date;
  customEndDate?: Date;
}

export const useBusinessDashboard = (options: UseBusinessDashboardOptions = {}) => {
  const { user } = useAuth();
  const [metrics, setMetrics] = useState<BusinessDashboardMetrics | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const { period = 'month', customStartDate, customEndDate } = options;

  const dateRange = useMemo(() => {
    const now = new Date();
    let startDate: Date;
    let endDate: Date = now;

    if (customStartDate && customEndDate) {
      startDate = customStartDate;
      endDate = customEndDate;
    } else {
      switch (period) {
        case 'today':
          startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate());
          endDate = startDate;
          break;
        case 'month':
          startDate = new Date(now.getFullYear(), now.getMonth(), 1);
          endDate = new Date(now.getFullYear(), now.getMonth() + 1, 0);
          break;
        case 'quarter':
          const quarter = Math.floor(now.getMonth() / 3);
          startDate = new Date(now.getFullYear(), quarter * 3, 1);
          endDate = new Date(now.getFullYear(), quarter * 3 + 3, 0);
          break;
        case 'year':
          startDate = new Date(now.getFullYear(), 0, 1);
          endDate = new Date(now.getFullYear(), 11, 31);
          break;
        default:
          startDate = new Date(now.getFullYear(), now.getMonth(), 1);
          endDate = new Date(now.getFullYear(), now.getMonth() + 1, 0);
      }
    }

    return {
      startDate: startDate.toISOString().split('T')[0],
      endDate: endDate.toISOString().split('T')[0],
    };
  }, [period, customStartDate, customEndDate]);

  const fetchMetrics = async () => {
    if (!user) return;

    try {
      setLoading(true);
      setError(null);

      const { data, error: rpcError } = await supabase.rpc('get_business_dashboard_metrics', {
        p_user_id: user.id,
        p_start_date: dateRange.startDate,
        p_end_date: dateRange.endDate,
      });

      if (rpcError) {
        console.error('Error fetching business metrics:', rpcError);
        setError(rpcError.message);
        return;
      }

      // Cast the JSONB response to expected shape
      const jsonData = data as Record<string, unknown> | null;
      
      // Parse the JSONB response
      const parsedMetrics: BusinessDashboardMetrics = {
        saldo_bancos: Number(jsonData?.saldo_bancos || 0),
        cxc_aging: (jsonData?.cxc_aging as Record<string, number>) || {},
        cxc_total: Number(jsonData?.cxc_total || 0),
        cxp_aging: (jsonData?.cxp_aging as Record<string, number>) || {},
        cxp_total: Number(jsonData?.cxp_total || 0),
        ingresos_periodo: Number(jsonData?.ingresos_periodo || 0),
        gastos_periodo: Number(jsonData?.gastos_periodo || 0),
        utilidad_neta: Number(jsonData?.utilidad_neta || 0),
        margen_neto: Number(jsonData?.margen_neto || 0),
        monthly_comparison: (jsonData?.monthly_comparison as { mes: string; ingresos: number; gastos: number }[]) || [],
        gastos_categoria: (jsonData?.gastos_categoria as { categoria: string; total: number }[]) || [],
        facturas_emitidas: Number(jsonData?.facturas_emitidas || 0),
        facturas_canceladas: Number(jsonData?.facturas_canceladas || 0),
        facturas_pendientes: Number(jsonData?.facturas_pendientes || 0),
        iva_por_pagar: Number(jsonData?.iva_por_pagar || 0),
        isr_retenido: Number(jsonData?.isr_retenido || 0),
        dso: Number(jsonData?.dso || 0),
        periodo: (jsonData?.periodo as { inicio: string; fin: string }) || { inicio: dateRange.startDate, fin: dateRange.endDate },
      };

      setMetrics(parsedMetrics);
    } catch (err) {
      console.error('Error in fetchMetrics:', err);
      setError('Error al cargar métricas');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchMetrics();
  }, [user, dateRange.startDate, dateRange.endDate]);

  return {
    metrics,
    loading,
    error,
    refetch: fetchMetrics,
    dateRange,
  };
};
