-- Add free delivery minimum column to restaurants table
ALTER TABLE public.restaurants 
ADD COLUMN free_delivery_minimum numeric DEFAULT NULL;