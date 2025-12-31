import { useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import type { Database } from '@/integrations/supabase/types';

type Restaurant = Database['public']['Tables']['restaurants']['Row'];

export function useRestaurant() {
  const [restaurant, setRestaurant] = useState<Restaurant | null>(null);
  const [loading, setLoading] = useState(true);
  const { user, loading: authLoading } = useAuth();
  const lastUserId = useRef<string | null>(null);

  const fetchRestaurant = useCallback(async () => {
    if (!user) {
      setRestaurant(null);
      setLoading(false);
      return;
    }

    // Only fetch if user changed or initial load
    if (lastUserId.current === user.id && restaurant !== null) {
      return;
    }

    setLoading(true);
    lastUserId.current = user.id;
    
    const { data, error } = await supabase
      .from('restaurants')
      .select('*')
      .eq('owner_id', user.id)
      .order('created_at', { ascending: true })
      .limit(1)
      .maybeSingle();

    if (error) {
      console.error('Error fetching restaurant:', error);
    }

    setRestaurant(data ?? null);
    setLoading(false);
  }, [user, restaurant]);

  useEffect(() => {
    // Wait for auth to finish loading before fetching restaurant
    if (authLoading) {
      setLoading(true);
      return;
    }

    if (!user) {
      setRestaurant(null);
      setLoading(false);
      lastUserId.current = null;
      return;
    }

    // Only fetch if user changed
    if (lastUserId.current !== user.id) {
      fetchRestaurant();
    }
  }, [user, authLoading, fetchRestaurant]);

  return { restaurant, loading, hasRestaurant: !!restaurant, refetch: fetchRestaurant };
}
