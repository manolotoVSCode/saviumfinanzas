import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { Criptomoneda, CryptoPrices, CryptoWithPrice } from '@/types/crypto';

export const useCriptomonedas = () => {
  const [criptomonedas, setCriptomonedas] = useState<CryptoWithPrice[]>([]);
  const [loading, setLoading] = useState(true);
  const [precios, setPrecios] = useState<CryptoPrices>({});
  const { user } = useAuth();
  const { toast } = useToast();

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
      console.error('Error fetching criptomonedas:', error);
      toast({
        title: "Error",
        description: "No se pudieron cargar las criptomonedas",
        variant: "destructive",
      });
    }
  };

  const fetchPrecios = async () => {
    try {
      const simbolosUnicos = [...new Set(criptomonedas.map(c => c.simbolo))];
      
      if (simbolosUnicos.length === 0) return;

      const { data, error } = await supabase.functions.invoke('crypto-prices', {
        body: { symbols: simbolosUnicos }
      });

      if (error) throw error;
      
      setPrecios(data || {});
    } catch (error) {
      console.error('Error fetching crypto prices:', error);
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
      console.error('Error adding criptomoneda:', error);
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
      console.error('Error updating criptomoneda:', error);
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
      console.error('Error deleting criptomoneda:', error);
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
    const valorActual = precioActual ? cripto.cantidad * precioActual : undefined;
    const valorCompra = cripto.cantidad * cripto.precio_compra_usd;
    const gananciaPerdida = valorActual ? valorActual - valorCompra : undefined;
    const gananciaPerdidaPorcentaje = gananciaPerdida && valorCompra > 0 
      ? (gananciaPerdida / valorCompra) * 100 
      : undefined;

    return {
      ...cripto,
      precio_actual_usd: precioActual,
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
      fetchPrecios();
    }
    setLoading(false);
  }, [criptomonedas]);

  // Actualizar precios cada 30 segundos
  useEffect(() => {
    if (criptomonedas.length === 0) return;

    const interval = setInterval(fetchPrecios, 30000);
    return () => clearInterval(interval);
  }, [criptomonedas]);

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