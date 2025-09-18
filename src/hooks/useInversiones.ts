import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Inversion, InversionFormData, CryptoPrice } from '@/types/inversiones';
import { useToast } from '@/hooks/use-toast';

export const useInversiones = () => {
  const [inversiones, setInversiones] = useState<Inversion[]>([]);
  const [loading, setLoading] = useState(true);
  const { user } = useAuth();
  const { toast } = useToast();

  const fetchInversiones = async () => {
    if (!user) return;
    
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('inversiones')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setInversiones((data || []) as Inversion[]);
    } catch (error) {
      console.error('Error fetching inversiones:', error);
      toast({
        title: "Error",
        description: "Error al cargar las inversiones",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const createInversion = async (data: InversionFormData) => {
    if (!user) return;

    try {
      const { error } = await supabase
        .from('inversiones')
        .insert([{
          ...data,
          user_id: user.id,
        }]);

      if (error) throw error;
      
      toast({
        title: "Inversión creada",
        description: "La inversión se ha creado exitosamente",
      });
      
      await fetchInversiones();
      return true;
    } catch (error) {
      console.error('Error creating inversion:', error);
      toast({
        title: "Error",
        description: "Error al crear la inversión",
        variant: "destructive",
      });
      return false;
    }
  };

  const updateInversion = async (id: string, data: Partial<InversionFormData>) => {
    try {
      const { error } = await supabase
        .from('inversiones')
        .update(data)
        .eq('id', id);

      if (error) throw error;
      
      toast({
        title: "Inversión actualizada",
        description: "La inversión se ha actualizado exitosamente",
      });
      
      await fetchInversiones();
      return true;
    } catch (error) {
      console.error('Error updating inversion:', error);
      toast({
        title: "Error",
        description: "Error al actualizar la inversión",
        variant: "destructive",
      });
      return false;
    }
  };

  const deleteInversion = async (id: string) => {
    try {
      const { error } = await supabase
        .from('inversiones')
        .delete()
        .eq('id', id);

      if (error) throw error;
      
      toast({
        title: "Inversión eliminada",
        description: "La inversión se ha eliminado exitosamente",
      });
      
      await fetchInversiones();
      return true;
    } catch (error) {
      console.error('Error deleting inversion:', error);
      toast({
        title: "Error",
        description: "Error al eliminar la inversión",
        variant: "destructive",
      });
      return false;
    }
  };

  // Función para actualizar precios de criptomonedas
  const updateCryptoPrices = async () => {
    const cryptoInversiones = inversiones.filter(inv => inv.tipo === 'Criptomoneda');
    
    if (cryptoInversiones.length === 0) return;

    try {
      // Crear mapeo de nombres a IDs de CoinGecko (simplificado)
      const coinMapping: { [key: string]: string } = {
        'bitcoin': 'bitcoin',
        'btc': 'bitcoin',
        'ethereum': 'ethereum',
        'eth': 'ethereum',
        'binance': 'binancecoin',
        'bnb': 'binancecoin',
        'cardano': 'cardano',
        'ada': 'cardano',
        'solana': 'solana',
        'sol': 'solana',
      };

      const coinIds = cryptoInversiones
        .map(inv => coinMapping[inv.nombre.toLowerCase()])
        .filter(Boolean)
        .join(',');

      if (!coinIds) return;

      const response = await fetch(
        `https://api.coingecko.com/api/v3/simple/price?ids=${coinIds}&vs_currencies=usd,eur,mxn&include_24hr_change=true`
      );
      
      if (!response.ok) return;
      
      const prices = await response.json();

      // Actualizar precios en la base de datos
      for (const inversion of cryptoInversiones) {
        const coinId = coinMapping[inversion.nombre.toLowerCase()];
        if (coinId && prices[coinId]) {
          const currency = inversion.moneda.toLowerCase();
          const newPrice = prices[coinId][currency];
          
          if (newPrice) {
            await updateInversion(inversion.id, {
              valor_actual: newPrice * inversion.monto_invertido
            });
          }
        }
      }
    } catch (error) {
      console.error('Error updating crypto prices:', error);
    }
  };

  useEffect(() => {
    fetchInversiones();
  }, [user]);

  // Actualizar precios de criptos al cargar y cada 5 minutos
  useEffect(() => {
    if (inversiones.length > 0) {
      updateCryptoPrices();
      const interval = setInterval(updateCryptoPrices, 5 * 60 * 1000);
      return () => clearInterval(interval);
    }
  }, [inversiones.length]);

  return {
    inversiones,
    loading,
    createInversion,
    updateInversion,
    deleteInversion,
    refreshInversiones: fetchInversiones,
    updateCryptoPrices,
  };
};