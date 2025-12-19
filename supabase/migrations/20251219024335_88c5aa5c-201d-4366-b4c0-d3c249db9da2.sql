-- Drop the existing policy
DROP POLICY IF EXISTS "Anyone can create orders" ON public.orders;

-- Create a permissive policy that allows anyone (including anonymous users) to create orders
CREATE POLICY "Anyone can create orders" 
ON public.orders 
FOR INSERT 
TO anon, authenticated
WITH CHECK (true);