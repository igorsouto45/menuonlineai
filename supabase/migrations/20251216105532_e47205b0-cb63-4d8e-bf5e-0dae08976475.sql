-- Add stock columns to products table
ALTER TABLE public.products
ADD COLUMN current_stock integer DEFAULT NULL,
ADD COLUMN min_stock integer DEFAULT NULL;

-- Add index for low stock queries
CREATE INDEX idx_products_low_stock ON public.products (restaurant_id, current_stock, min_stock) 
WHERE current_stock IS NOT NULL AND min_stock IS NOT NULL;