-- Create an enum for table status if it doesn't exist (using text for flexibility with check constraint)
ALTER TABLE public.restaurant_tables ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'free' CHECK (status IN ('free', 'occupied', 'reserved'));

-- The existing RLS policies already allow the owner to UPDATE the table,
-- but let's make sure it's clear.
-- Anyone can view the status to see if a table is available.