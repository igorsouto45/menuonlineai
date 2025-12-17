-- Add is_featured column to products table
ALTER TABLE public.products 
ADD COLUMN is_featured boolean DEFAULT false;