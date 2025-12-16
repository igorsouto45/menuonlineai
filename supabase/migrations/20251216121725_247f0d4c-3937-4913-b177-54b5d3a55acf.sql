-- Create product_images table for multiple images per product
CREATE TABLE public.product_images (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  product_id UUID NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
  image_url TEXT NOT NULL,
  display_order INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create product_reviews table for customer reviews
CREATE TABLE public.product_reviews (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  product_id UUID NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
  restaurant_id UUID NOT NULL REFERENCES public.restaurants(id) ON DELETE CASCADE,
  customer_name TEXT NOT NULL,
  rating INTEGER NOT NULL CHECK (rating >= 1 AND rating <= 5),
  comment TEXT,
  is_approved BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.product_images ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.product_reviews ENABLE ROW LEVEL SECURITY;

-- RLS for product_images
CREATE POLICY "Anyone can view product images"
ON public.product_images FOR SELECT
USING (true);

CREATE POLICY "Owners can manage product images"
ON public.product_images FOR ALL
USING (EXISTS (
  SELECT 1 FROM products p 
  WHERE p.id = product_images.product_id 
  AND is_restaurant_owner(auth.uid(), p.restaurant_id)
))
WITH CHECK (EXISTS (
  SELECT 1 FROM products p 
  WHERE p.id = product_images.product_id 
  AND is_restaurant_owner(auth.uid(), p.restaurant_id)
));

-- RLS for product_reviews
CREATE POLICY "Anyone can view approved reviews"
ON public.product_reviews FOR SELECT
USING (is_approved = true);

CREATE POLICY "Anyone can create reviews"
ON public.product_reviews FOR INSERT
WITH CHECK (true);

CREATE POLICY "Owners can manage reviews"
ON public.product_reviews FOR ALL
USING (is_restaurant_owner(auth.uid(), restaurant_id))
WITH CHECK (is_restaurant_owner(auth.uid(), restaurant_id));