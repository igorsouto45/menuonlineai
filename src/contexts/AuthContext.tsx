import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { User, Session } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';
import { getPlanByProductId, PlanType } from '@/lib/stripeConfig';

interface SubscriptionState {
  subscribed: boolean;
  plan: PlanType | null;
  subscriptionEnd: string | null;
  loading: boolean;
  isTrialActive: boolean;
  trialEndsAt: string | null;
}

interface AuthContextType {
  user: User | null;
  session: Session | null;
  loading: boolean;
  subscription: SubscriptionState;
  signUp: (email: string, password: string, fullName?: string) => Promise<{ error: Error | null }>;
  signIn: (email: string, password: string) => Promise<{ error: Error | null }>;
  signOut: () => Promise<void>;
  resetPassword: (email: string) => Promise<{ error: Error | null }>;
  checkSubscription: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const TRIAL_DAYS = 7;

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const [subscription, setSubscription] = useState<SubscriptionState>({
    subscribed: false,
    plan: null,
    subscriptionEnd: null,
    loading: false,
    isTrialActive: false,
    trialEndsAt: null,
  });

  const checkSubscription = async () => {
    if (!session?.access_token) {
      setSubscription({
        subscribed: false,
        plan: null,
        subscriptionEnd: null,
        loading: false,
        isTrialActive: false,
        trialEndsAt: null,
      });
      return;
    }

    setSubscription(prev => ({ ...prev, loading: true }));

    try {
      // Check Stripe subscription
      const { data, error } = await supabase.functions.invoke('check-subscription', {
        headers: {
          Authorization: `Bearer ${session.access_token}`,
        },
      });

      if (error) {
        console.error('Error checking subscription:', error);
        setSubscription(prev => ({ ...prev, loading: false }));
        return;
      }

      const plan = data.product_id ? getPlanByProductId(data.product_id) : null;
      
      // If subscribed, no need to check trial
      if (data.subscribed) {
        setSubscription({
          subscribed: true,
          plan,
          subscriptionEnd: data.subscription_end || null,
          loading: false,
          isTrialActive: false,
          trialEndsAt: null,
        });
        return;
      }

      // Check trial status based on restaurant creation date
      const { data: restaurant, error: restaurantError } = await supabase
        .from('restaurants')
        .select('created_at')
        .eq('owner_id', session.user.id)
        .order('created_at', { ascending: true })
        .limit(1)
        .maybeSingle();

      if (restaurantError) {
        console.error('Error fetching restaurant creation date:', restaurantError);
      }

      let isTrialActive = false;
      let trialEndsAt: string | null = null;

      if (restaurant) {
        const createdAt = new Date(restaurant.created_at);
        const trialEnd = new Date(createdAt.getTime() + TRIAL_DAYS * 24 * 60 * 60 * 1000);
        trialEndsAt = trialEnd.toISOString();
        isTrialActive = new Date() < trialEnd;
      }

      setSubscription({
        subscribed: data.subscribed || false,
        plan,
        subscriptionEnd: data.subscription_end || null,
        loading: false,
        isTrialActive,
        trialEndsAt,
      });

    } catch (error) {
      console.error('Error checking subscription:', error);
      setSubscription(prev => ({ ...prev, loading: false }));
    }
  };

  useEffect(() => {
    // Set up auth state listener FIRST
    const { data: { subscription: authSubscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        setSession(session);
        setUser(session?.user ?? null);
        setLoading(false);
        
        // Check subscription after auth state change
        if (session?.access_token) {
          setTimeout(() => {
            checkSubscription();
          }, 0);
        }
      }
    );

    // THEN check for existing session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);
      setLoading(false);
    });

    return () => authSubscription.unsubscribe();
  }, []);

  // Check subscription when session changes
  useEffect(() => {
    if (session?.access_token) {
      checkSubscription();
    }
  }, [session?.access_token]);

  // Auto-refresh subscription every minute
  useEffect(() => {
    if (!session?.access_token) return;

    const interval = setInterval(() => {
      checkSubscription();
    }, 60000);

    return () => clearInterval(interval);
  }, [session?.access_token]);

  const signUp = async (email: string, password: string, fullName?: string) => {
    const redirectUrl = `${window.location.origin}/`;
    
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: redirectUrl,
        data: {
          full_name: fullName || '',
        },
      },
    });
    return { error };
  };

  const signIn = async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });
    return { error };
  };

  const signOut = async () => {
    await supabase.auth.signOut();
    setSubscription({
      subscribed: false,
      plan: null,
      subscriptionEnd: null,
      loading: false,
      isTrialActive: false,
      trialEndsAt: null,
    });
  };

  const resetPassword = async (email: string) => {
    const redirectUrl = `${window.location.origin}/auth`;
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: redirectUrl,
    });
    return { error };
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        session,
        loading,
        subscription,
        signUp,
        signIn,
        signOut,
        resetPassword,
        checkSubscription,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
