import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import type { Database } from '@/integrations/supabase/types';

type Restaurant = Database['public']['Tables']['restaurants']['Row'];

export function useRestaurant() {
  const [restaurant, setRestaurant] = useState<Restaurant | null>(null);
  const [loading, setLoading] = useState(true);
  const { user } = useAuth();

  const fetchRestaurant = useCallback(async () => {
    if (!user) {
      setRestaurant(null);
      setLoading(false);
      return;
    }

    setLoading(true);
    const { data } = await supabase
      .from('restaurants')
      .select('*')
      .eq('owner_id', user.id)
      .maybeSingle();

    setRestaurant(data);
    setLoading(false);
  }, [user]);

  useEffect(() => {
    fetchRestaurant();
  }, [fetchRestaurant]);

  return { restaurant, loading, hasRestaurant: !!restaurant, refetch: fetchRestaurant };
}
