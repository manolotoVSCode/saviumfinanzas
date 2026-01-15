import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

export type TipoCuenta = 'personal' | 'empresa';

export interface UserProfile {
  id: string;
  user_id: string;
  nombre: string;
  apellidos: string;
  edad?: number;
  divisa_preferida: string;
  tipo_cuenta: TipoCuenta;
  created_at: string;
  updated_at: string;
}

export const useUserProfile = () => {
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const { user } = useAuth();

  useEffect(() => {
    if (user) {
      fetchProfile();
    } else {
      setProfile(null);
      setLoading(false);
    }
  }, [user]);

  const fetchProfile = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('user_id', user?.id)
        .single();

      if (error) {
        console.error('Error fetching profile:', error);
        return;
      }

      // Cast tipo_cuenta to TipoCuenta type
      const profileData: UserProfile = {
        ...data,
        tipo_cuenta: (data.tipo_cuenta as TipoCuenta) || 'personal',
      };

      setProfile(profileData);
    } catch (error) {
      console.error('Error in fetchProfile:', error);
    } finally {
      setLoading(false);
    }
  };

  return {
    profile,
    loading,
    refetch: fetchProfile
  };
};