-- Add pickup_enabled to restaurants
ALTER TABLE public.restaurants 
ADD COLUMN pickup_enabled boolean DEFAULT true;

-- Create delivery areas table
CREATE TABLE public.delivery_areas (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  restaurant_id uuid NOT NULL REFERENCES public.restaurants(id) ON DELETE CASCADE,
  name text NOT NULL,
  fee numeric NOT NULL DEFAULT 0,
  is_active boolean DEFAULT true,
  display_order integer DEFAULT 0,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.delivery_areas ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Anyone can view active delivery areas"
ON public.delivery_areas
FOR SELECT
USING (is_active = true);

CREATE POLICY "Owners can manage delivery areas"
ON public.delivery_areas
FOR ALL
USING (is_restaurant_owner(auth.uid(), restaurant_id))
WITH CHECK (is_restaurant_owner(auth.uid(), restaurant_id));