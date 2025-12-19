import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { User, Session } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';

interface CustomerProfile {
  id: string;
  name: string;
  email: string;
  whatsapp: string;
  address: string | null;
  neighborhood: string | null;
  city: string | null;
}

interface CustomerContextType {
  user: User | null;
  session: Session | null;
  customer: CustomerProfile | null;
  loading: boolean;
  signUp: (data: {
    email: string;
    password: string;
    name: string;
    whatsapp: string;
    address?: string;
    neighborhood?: string;
    city?: string;
    restaurantId: string;
  }) => Promise<{ error: Error | null }>;
  signIn: (email: string, password: string, restaurantId: string) => Promise<{ error: Error | null }>;
  signOut: () => Promise<void>;
  updateProfile: (data: Partial<CustomerProfile>) => Promise<{ error: Error | null }>;
  loadCustomerByRestaurant: (restaurantId: string) => Promise<void>;
}

const CustomerContext = createContext<CustomerContextType | undefined>(undefined);

export function CustomerProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [customer, setCustomer] = useState<CustomerProfile | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        setSession(session);
        setUser(session?.user ?? null);
        if (!session?.user) {
          setCustomer(null);
        }
        setLoading(false);
      }
    );

    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);
      setLoading(false);
    });

    return () => subscription.unsubscribe();
  }, []);

  const loadCustomerByRestaurant = async (restaurantId: string) => {
    if (!user) return;
    
    const { data, error } = await supabase
      .from('customers')
      .select('*')
      .eq('user_id', user.id)
      .eq('restaurant_id', restaurantId)
      .maybeSingle();
    
    if (!error && data) {
      setCustomer(data);
    } else {
      setCustomer(null);
    }
  };

  const createCustomerRecord = async (
    userId: string,
    restaurantId: string,
    data: {
      name: string;
      email: string;
      whatsapp: string;
      address?: string;
      neighborhood?: string;
      city?: string;
    }
  ) => {
    // Check if customer already exists for this restaurant
    const { data: existingCustomer } = await supabase
      .from('customers')
      .select('*')
      .eq('user_id', userId)
      .eq('restaurant_id', restaurantId)
      .maybeSingle();

    if (existingCustomer) {
      setCustomer(existingCustomer);
      return { error: null };
    }

    // Create new customer record
    const { data: newCustomer, error: customerError } = await supabase
      .from('customers')
      .insert({
        user_id: userId,
        restaurant_id: restaurantId,
        name: data.name,
        email: data.email,
        whatsapp: data.whatsapp,
        address: data.address || null,
        neighborhood: data.neighborhood || null,
        city: data.city || null,
      })
      .select()
      .single();

    if (customerError) return { error: customerError };

    if (newCustomer) {
      setCustomer(newCustomer);
    }

    return { error: null };
  };

  const signUp = async (data: {
    email: string;
    password: string;
    name: string;
    whatsapp: string;
    address?: string;
    neighborhood?: string;
    city?: string;
    restaurantId: string;
  }) => {
    const redirectUrl = `${window.location.origin}${window.location.pathname}`;
    
    // First, try to sign up
    const { data: authData, error: authError } = await supabase.auth.signUp({
      email: data.email,
      password: data.password,
      options: {
        emailRedirectTo: redirectUrl,
        data: {
          full_name: data.name,
        },
      },
    });

    // If user already exists, try to sign them in
    if (authError?.message?.includes('already registered')) {
      const { data: signInData, error: signInError } = await supabase.auth.signInWithPassword({
        email: data.email,
        password: data.password,
      });

      if (signInError) {
        // If sign in fails with wrong password, let the user know
        if (signInError.message.includes('Invalid login credentials')) {
          return { error: new Error('Email já cadastrado. A senha informada está incorreta.') };
        }
        return { error: signInError };
      }

      // User signed in successfully, create customer record for this restaurant
      if (signInData.user) {
        return await createCustomerRecord(signInData.user.id, data.restaurantId, {
          name: data.name,
          email: data.email,
          whatsapp: data.whatsapp,
          address: data.address,
          neighborhood: data.neighborhood,
          city: data.city,
        });
      }
    }

    if (authError) return { error: authError };

    if (authData.user) {
      return await createCustomerRecord(authData.user.id, data.restaurantId, {
        name: data.name,
        email: data.email,
        whatsapp: data.whatsapp,
        address: data.address,
        neighborhood: data.neighborhood,
        city: data.city,
      });
    }

    return { error: null };
  };

  const signIn = async (email: string, password: string, restaurantId: string) => {
    const { data: signInData, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) return { error };

    // After sign in, load or wait for customer record
    if (signInData.user) {
      await loadCustomerByRestaurantInternal(signInData.user.id, restaurantId);
    }

    return { error: null };
  };

  const loadCustomerByRestaurantInternal = async (userId: string, restaurantId: string) => {
    const { data, error } = await supabase
      .from('customers')
      .select('*')
      .eq('user_id', userId)
      .eq('restaurant_id', restaurantId)
      .maybeSingle();
    
    if (!error && data) {
      setCustomer(data);
    } else {
      setCustomer(null);
    }
  };

  const signOut = async () => {
    await supabase.auth.signOut();
    setCustomer(null);
  };

  const updateProfile = async (data: Partial<CustomerProfile>) => {
    if (!customer) return { error: new Error('No customer logged in') };

    const { error } = await supabase
      .from('customers')
      .update(data)
      .eq('id', customer.id);

    if (!error) {
      setCustomer({ ...customer, ...data });
    }

    return { error };
  };

  return (
    <CustomerContext.Provider
      value={{
        user,
        session,
        customer,
        loading,
        signUp,
        signIn,
        signOut,
        updateProfile,
        loadCustomerByRestaurant,
      }}
    >
      {children}
    </CustomerContext.Provider>
  );
}

export function useCustomer() {
  const context = useContext(CustomerContext);
  if (!context) {
    throw new Error('useCustomer must be used within a CustomerProvider');
  }
  return context;
}
