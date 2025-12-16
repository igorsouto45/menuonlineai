-- Create customers table for leads management
CREATE TABLE public.customers (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL UNIQUE,
  restaurant_id UUID NOT NULL REFERENCES public.restaurants(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  email TEXT NOT NULL,
  whatsapp TEXT NOT NULL,
  address TEXT,
  neighborhood TEXT,
  city TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.customers ENABLE ROW LEVEL SECURITY;

-- Customers can view and update their own data
CREATE POLICY "Customers can view own data" 
ON public.customers 
FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Customers can update own data" 
ON public.customers 
FOR UPDATE 
USING (auth.uid() = user_id);

CREATE POLICY "Customers can insert own data" 
ON public.customers 
FOR INSERT 
WITH CHECK (auth.uid() = user_id);

-- Restaurant owners can view their customers (leads)
CREATE POLICY "Owners can view restaurant customers" 
ON public.customers 
FOR SELECT 
USING (is_restaurant_owner(auth.uid(), restaurant_id));

-- Create trigger for updated_at
CREATE TRIGGER update_customers_updated_at
BEFORE UPDATE ON public.customers
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Create index for restaurant_id queries
CREATE INDEX idx_customers_restaurant_id ON public.customers(restaurant_id);
CREATE INDEX idx_customers_created_at ON public.customers(created_at DESC);