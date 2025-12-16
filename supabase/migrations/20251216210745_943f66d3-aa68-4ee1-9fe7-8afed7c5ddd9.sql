-- Add delivery fee column to restaurants table
ALTER TABLE public.restaurants 
ADD COLUMN delivery_fee numeric DEFAULT 0;