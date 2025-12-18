-- Add featured_order column to products table for drag-and-drop ordering
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS featured_order integer DEFAULT 0;