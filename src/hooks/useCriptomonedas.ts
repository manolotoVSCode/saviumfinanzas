import { useEffect, useMemo } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useExchangeRates } from '@/hooks/useExchangeRates';
import { useToast } from '@/hooks/use-toast';
import { financeQueryKeys, STALE_TIME } from '@/lib/finance/queryKeys';
import { Criptomoneda, CryptoPrices, CryptoWithPrice } from '@/types/crypto';

const EMPTY_CRIPTOS: Criptomoneda[] = [];
const EMPTY_PRECIOS: CryptoPrices = {};

const fetchCriptomonedas = async (): Promise<Criptomoneda[]> => {
  const { data, error } = await supabase
    .from('criptomonedas')
    .select('*')
    .order('created_at', { ascending: false });
  if (error) throw error;
  return (data ?? []) as Criptomoneda[];
};

const fetchPrecios = async (symbols: string[]): Promise<CryptoPrices> => {
  const { data, error } = await supabase.functions.invoke('crypto-prices', { body: { symbols } });
  if (error) throw error;
  return (data ?? {}) as CryptoPrices;
};

/**
 * Criptomonedas del usuario más sus precios actuales. La query de precios
 * depende de la lista (símbolos en la clave): añadir una cripto vuelve a pedirlos.
 */
export const useCriptomonedas = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const { convertCurrency } = useExchangeRates();
  const queryClient = useQueryClient();
  const QK = financeQueryKeys(user?.id);

  const criptosQuery = useQuery({
    queryKey: QK.criptomonedas,
    queryFn: fetchCriptomonedas,
    staleTime: STALE_TIME,
    enabled: !!user,
  });
  const criptos = criptosQuery.data ?? EMPTY_CRIPTOS;

  const simbolos = useMemo(() => [...new Set(criptos.map(c => c.simbolo))].sort(), [criptos]);

  const preciosQuery = useQuery({
    queryKey: [...QK.criptoPrecios, simbolos.join(',')],
    queryFn: () => fetchPrecios(simbolos),
    staleTime: STALE_TIME,
    retry: 1,
    enabled: !!user && simbolos.length > 0,
  });
  const precios = preciosQuery.data ?? EMPTY_PRECIOS;

  useEffect(() => {
    if (!criptosQuery.error) return;
    console.error('Error fetching criptomonedas:', criptosQuery.error);
    toast({ title: "Error", description: "No se pudieron cargar las criptomonedas", variant: "destructive" });
  }, [criptosQuery.error, toast]);

  useEffect(() => {
    if (!preciosQuery.error) return;
    console.error('Error fetching crypto prices:', preciosQuery.error);
    toast({ title: "Advertencia", description: "No se pudieron obtener los precios actuales", variant: "destructive" });
  }, [preciosQuery.error, toast]);

  const invalidate = () => queryClient.invalidateQueries({ queryKey: QK.criptomonedas });

  const addCriptomoneda = async (cripto: Omit<Criptomoneda, 'id' | 'user_id' | 'created_at' | 'updated_at'>) => {
    if (!user) return;
    try {
      const { data, error } = await supabase
        .from('criptomonedas')
        .insert([{ ...cripto, user_id: user.id }])
        .select()
        .single();
      if (error) throw error;
      await invalidate();
      return data as Criptomoneda;
    } catch (error) {
      console.error('Error adding criptomoneda:', error);
      toast({ title: "Error", description: "No se pudo agregar la criptomoneda", variant: "destructive" });
      throw error;
    }
  };

  const updateCriptomoneda = async (id: string, updates: Partial<Criptomoneda>) => {
    try {
      const { error } = await supabase.from('criptomonedas').update(updates).eq('id', id);
      if (error) throw error;
      await invalidate();
    } catch (error) {
      console.error('Error updating criptomoneda:', error);
      toast({ title: "Error", description: "No se pudo actualizar la criptomoneda", variant: "destructive" });
      throw error;
    }
  };

  const deleteCriptomoneda = async (id: string) => {
    try {
      const { error } = await supabase.from('criptomonedas').delete().eq('id', id);
      if (error) throw error;
      await invalidate();
    } catch (error) {
      console.error('Error deleting criptomoneda:', error);
      toast({ title: "Error", description: "No se pudo eliminar la criptomoneda", variant: "destructive" });
      throw error;
    }
  };

  // Lista enriquecida con precios actuales y valores en USD
  const criptomonedas: CryptoWithPrice[] = useMemo(() => criptos.map(cripto => {
    const precioActual = precios[cripto.simbolo]?.price;

    // Convertir precio de compra a USD si está en EUR
    const precioCompraUSD = cripto.divisa_compra === 'EUR'
      ? convertCurrency(cripto.precio_compra, 'EUR', 'USD')
      : cripto.precio_compra;

    const valorCompraUSD = cripto.cantidad * precioCompraUSD;
    const valorActual = precioActual ? cripto.cantidad * precioActual : undefined;
    const gananciaPerdida = valorActual ? valorActual - valorCompraUSD : undefined;
    const gananciaPerdidaPorcentaje = gananciaPerdida && valorCompraUSD > 0
      ? (gananciaPerdida / valorCompraUSD) * 100
      : undefined;

    return {
      ...cripto,
      precio_actual_usd: precioActual,
      precio_compra_usd: precioCompraUSD,
      valor_compra_usd: valorCompraUSD,
      valor_actual_usd: valorActual,
      ganancia_perdida_usd: gananciaPerdida,
      ganancia_perdida_porcentaje: gananciaPerdidaPorcentaje,
    };
  }), [criptos, precios, convertCurrency]);

  return {
    criptomonedas,
    loading: !!user && criptosQuery.isPending,
    precios,
    addCriptomoneda,
    updateCriptomoneda,
    deleteCriptomoneda,
    refetch: invalidate,
  };
};
