-- Add cost_price column to products table for cash flow management
ALTER TABLE public.products 
ADD COLUMN cost_price numeric DEFAULT 0;

-- Add comment for documentation
COMMENT ON COLUMN public.products.cost_price IS 'Cost price for profit margin and cash flow calculations';