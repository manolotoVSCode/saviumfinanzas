import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

export const useSampleData = () => {
  const [hasSampleData, setHasSampleData] = useState<boolean | null>(null);
  const [loading, setLoading] = useState(true);
  const { user } = useAuth();

  const checkSampleData = async () => {
    if (!user) {
      setHasSampleData(null);
      setLoading(false);
      return;
    }

    try {
      const { data, error } = await supabase.rpc('user_has_sample_data', {
        user_uuid: user.id
      });

      if (error) {
        // Error checking sample data
        return;
      }

      setHasSampleData(data);
    } catch (error) {
      // Error in checkSampleData
    } finally {
      setLoading(false);
    }
  };

  const clearSampleData = async () => {
    if (!user) return;

    try {
      const { error } = await supabase.rpc('clear_sample_data', {
        user_uuid: user.id
      });

      if (error) {
        // Error clearing sample data
        return;
      }

      setHasSampleData(false);
      return true;
    } catch (error) {
      // Error in clearSampleData
      return false;
    }
  };

  useEffect(() => {
    checkSampleData();
  }, [user]);

  return {
    hasSampleData,
    loading,
    clearSampleData,
    refetch: checkSampleData
  };
};