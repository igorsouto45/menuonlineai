-- Add Mercado Pago credentials to restaurants table
ALTER TABLE public.restaurants
ADD COLUMN IF NOT EXISTS mercado_pago_access_token text,
ADD COLUMN IF NOT EXISTS mercado_pago_public_key text,
ADD COLUMN IF NOT EXISTS mercado_pago_enabled boolean DEFAULT false;