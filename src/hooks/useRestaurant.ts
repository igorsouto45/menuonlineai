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
    // Use SECURITY DEFINER RPC so the owner can read their full restaurant
    // record (including credentials), which are otherwise hidden from
    // direct table SELECTs to prevent credential leakage.
    const { data, error } = await supabase
      .rpc('get_my_restaurant')
      .maybeSingle();

    if (error) {
      console.error('Error fetching restaurant:', error);
    }

    setRestaurant((data as Restaurant) ?? null);
    setLoading(false);
  }, [user]);

  useEffect(() => {
    fetchRestaurant();
  }, [fetchRestaurant]);

  return { restaurant, loading, hasRestaurant: !!restaurant, refetch: fetchRestaurant };
}
