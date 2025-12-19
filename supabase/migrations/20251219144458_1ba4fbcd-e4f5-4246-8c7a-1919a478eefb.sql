-- Add custom order welcome message field to restaurants table
ALTER TABLE public.restaurants 
ADD COLUMN IF NOT EXISTS order_welcome_message text;

-- Add comment
COMMENT ON COLUMN public.restaurants.order_welcome_message IS 'Custom welcome message for orders received via WhatsApp';