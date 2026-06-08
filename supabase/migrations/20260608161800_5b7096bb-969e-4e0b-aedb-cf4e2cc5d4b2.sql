-- Add dine_in_enabled to restaurants
ALTER TABLE public.restaurants ADD COLUMN IF NOT EXISTS dine_in_enabled BOOLEAN DEFAULT FALSE;

-- Create restaurant_tables table
CREATE TABLE IF NOT EXISTS public.restaurant_tables (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    restaurant_id UUID NOT NULL REFERENCES public.restaurants(id) ON DELETE CASCADE,
    table_number TEXT NOT NULL,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(restaurant_id, table_number)
);

-- Add delivery_mode and table_number to orders
-- Using an enum for delivery_mode might be better if we had many types, but text is more flexible for now
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS delivery_mode TEXT DEFAULT 'delivery';
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS table_number TEXT;

-- Enable RLS on restaurant_tables
ALTER TABLE public.restaurant_tables ENABLE ROW LEVEL SECURITY;

-- Grant permissions
GRANT SELECT, INSERT, UPDATE, DELETE ON public.restaurant_tables TO authenticated;
GRANT SELECT ON public.restaurant_tables TO anon;
GRANT ALL ON public.restaurant_tables TO service_role;

-- Policies for restaurant_tables
CREATE POLICY "Restaurants can manage their own tables" 
ON public.restaurant_tables 
FOR ALL 
TO authenticated 
USING (
    EXISTS (
        SELECT 1 FROM public.restaurants 
        WHERE id = restaurant_tables.restaurant_id 
        AND owner_id = auth.uid()
    )
)
WITH CHECK (
    EXISTS (
        SELECT 1 FROM public.restaurants 
        WHERE id = restaurant_tables.restaurant_id 
        AND owner_id = auth.uid()
    )
);

CREATE POLICY "Anyone can view active tables" 
ON public.restaurant_tables 
FOR SELECT 
TO anon, authenticated
USING (is_active = TRUE);

-- Update trigger for updated_at
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_restaurant_tables_updated_at
    BEFORE UPDATE ON public.restaurant_tables
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at_column();