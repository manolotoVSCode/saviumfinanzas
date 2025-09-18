import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useExchangeRates } from '@/hooks/useExchangeRates';
import { useToast } from '@/hooks/use-toast';
import { Criptomoneda, CryptoPrices, CryptoWithPrice } from '@/types/crypto';

export const useCriptomonedas = () => {
  const [criptomonedas, setCriptomonedas] = useState<CryptoWithPrice[]>([]);
  const [loading, setLoading] = useState(true);
  const [precios, setPrecios] = useState<CryptoPrices>({});
  const { user } = useAuth();
  const { toast } = useToast();
  const { convertCurrency } = useExchangeRates();

  const fetchCriptomonedas = async () => {
    if (!user) return;
    
    try {
      const { data, error } = await supabase
        .from('criptomonedas')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      
      setCriptomonedas(data || []);
    } catch (error) {
      // Error fetching criptomonedas
      toast({
        title: "Error",
        description: "No se pudieron cargar las criptomonedas",
        variant: "destructive",
      });
    }
  };

  const fetchPrecios = async (cryptoList?: Criptomoneda[]) => {
    try {
      const currentCriptos = cryptoList || criptomonedas;
      const simbolosUnicos = [...new Set(currentCriptos.map(c => c.simbolo))];
      
      if (simbolosUnicos.length === 0) return;

      const { data, error } = await supabase.functions.invoke('crypto-prices', {
        body: { symbols: simbolosUnicos }
      });

      if (error) throw error;
      
      setPrecios(data || {});
    } catch (error) {
      // Error fetching crypto prices
      toast({
        title: "Advertencia",
        description: "No se pudieron obtener los precios actuales",
        variant: "destructive",
      });
    }
  };

  const addCriptomoneda = async (cripto: Omit<Criptomoneda, 'id' | 'user_id' | 'created_at' | 'updated_at'>) => {
    if (!user) return;

    try {
      const { data, error } = await supabase
        .from('criptomonedas')
        .insert([{ ...cripto, user_id: user.id }])
        .select()
        .single();

      if (error) throw error;

      await fetchCriptomonedas();
      toast({
        title: "Éxito",
        description: "Criptomoneda agregada correctamente",
      });
      
      return data;
    } catch (error) {
      // Error adding criptomoneda
      toast({
        title: "Error",
        description: "No se pudo agregar la criptomoneda",
        variant: "destructive",
      });
      throw error;
    }
  };

  const updateCriptomoneda = async (id: string, updates: Partial<Criptomoneda>) => {
    try {
      const { error } = await supabase
        .from('criptomonedas')
        .update(updates)
        .eq('id', id);

      if (error) throw error;

      await fetchCriptomonedas();
      toast({
        title: "Éxito",
        description: "Criptomoneda actualizada correctamente",
      });
    } catch (error) {
      // Error updating criptomoneda
      toast({
        title: "Error",
        description: "No se pudo actualizar la criptomoneda",
        variant: "destructive",
      });
      throw error;
    }
  };

  const deleteCriptomoneda = async (id: string) => {
    try {
      const { error } = await supabase
        .from('criptomonedas')
        .delete()
        .eq('id', id);

      if (error) throw error;

      await fetchCriptomonedas();
      toast({
        title: "Éxito",
        description: "Criptomoneda eliminada correctamente",
      });
    } catch (error) {
      // Error deleting criptomoneda
      toast({
        title: "Error",
        description: "No se pudo eliminar la criptomoneda",
        variant: "destructive",
      });
      throw error;
    }
  };

  // Calcular criptomonedas con precios actuales
  const criptomonedasConPrecios: CryptoWithPrice[] = criptomonedas.map(cripto => {
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
  });

  useEffect(() => {
    if (user) {
      fetchCriptomonedas();
    }
  }, [user]);

  useEffect(() => {
    if (criptomonedas.length > 0) {
      fetchPrecios(criptomonedas);
    }
    setLoading(false);
  }, [criptomonedas.length]); // Solo depender de la longitud, no del array completo

  // Actualizar precios cada 30 segundos - TEMPORALMENTE DESHABILITADO
  // useEffect(() => {
  //   if (criptomonedas.length === 0) return;

  //   const interval = setInterval(fetchPrecios, 30000);
  //   return () => clearInterval(interval);
  // }, [criptomonedas]);

  return {
    criptomonedas: criptomonedasConPrecios,
    loading,
    precios,
    addCriptomoneda,
    updateCriptomoneda,
    deleteCriptomoneda,
    refetch: fetchCriptomonedas,
  };
};