
-- Drop deprecated Mercado Pago columns
ALTER TABLE public.restaurants
  DROP COLUMN IF EXISTS mercado_pago_access_token,
  DROP COLUMN IF EXISTS mercado_pago_public_key,
  DROP COLUMN IF EXISTS mercado_pago_enabled;

-- Restaurants: hide sensitive credentials/CPF from public
REVOKE SELECT ON public.restaurants FROM anon, authenticated;
GRANT SELECT (
  id, owner_id, name, slug, description, address, whatsapp, opening_hours,
  is_open, cover_url, logo_url, primary_color, secondary_color, font_family,
  delivery_fee, free_delivery_minimum, pickup_enabled, order_welcome_message,
  dine_in_enabled, created_at, updated_at
) ON public.restaurants TO anon, authenticated;
GRANT INSERT, UPDATE, DELETE ON public.restaurants TO authenticated;
GRANT ALL ON public.restaurants TO service_role;

CREATE OR REPLACE FUNCTION public.get_my_restaurant()
RETURNS SETOF public.restaurants
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$ SELECT * FROM public.restaurants WHERE owner_id = auth.uid() ORDER BY created_at ASC LIMIT 1; $$;
REVOKE EXECUTE ON FUNCTION public.get_my_restaurant() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_my_restaurant() TO authenticated;

-- Products: hide cost_price from public; owners use RPC
REVOKE SELECT ON public.products FROM anon, authenticated;
GRANT SELECT (
  id, restaurant_id, category_id, name, description, image_url, price,
  is_active, current_stock, min_stock, is_featured, featured_order,
  created_at, updated_at
) ON public.products TO anon, authenticated;
GRANT INSERT, UPDATE, DELETE ON public.products TO authenticated;
GRANT ALL ON public.products TO service_role;

CREATE OR REPLACE FUNCTION public.get_my_products(p_restaurant_id uuid)
RETURNS SETOF public.products
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT * FROM public.products
  WHERE restaurant_id = p_restaurant_id
    AND public.is_restaurant_owner(auth.uid(), p_restaurant_id);
$$;
REVOKE EXECUTE ON FUNCTION public.get_my_products(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_my_products(uuid) TO authenticated;

-- Customers: allow multi-restaurant
ALTER TABLE public.customers DROP CONSTRAINT IF EXISTS customers_user_id_key;
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'customers_user_restaurant_unique'
  ) THEN
    ALTER TABLE public.customers
      ADD CONSTRAINT customers_user_restaurant_unique UNIQUE (user_id, restaurant_id);
  END IF;
END $$;

-- promote_user_to_admin: require admin
CREATE OR REPLACE FUNCTION public.promote_user_to_admin(user_email text)
RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE target_user_id uuid;
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin') THEN
    RAISE EXCEPTION 'Only admins can promote users';
  END IF;
  SELECT id INTO target_user_id FROM public.profiles WHERE email = user_email;
  IF target_user_id IS NOT NULL THEN
    INSERT INTO public.user_roles (user_id, role)
    VALUES (target_user_id, 'admin')
    ON CONFLICT (user_id, role) DO NOTHING;
  END IF;
END;
$$;
REVOKE EXECUTE ON FUNCTION public.promote_user_to_admin(text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.promote_user_to_admin(text) TO authenticated;

-- update_updated_at_column: set search_path
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$ BEGIN NEW.updated_at = NOW(); RETURN NEW; END; $$;

-- Storage: scope ownership by first path segment (user.id)
DROP POLICY IF EXISTS "Authenticated users can upload images" ON storage.objects;
DROP POLICY IF EXISTS "Users can delete their own images" ON storage.objects;
DROP POLICY IF EXISTS "Users can update their own images" ON storage.objects;
DROP POLICY IF EXISTS "Anyone can view restaurant images" ON storage.objects;

CREATE POLICY "Owners can upload to own folder"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (
  bucket_id = 'restaurant-images'
  AND (storage.foldername(name))[1] = auth.uid()::text
);

CREATE POLICY "Owners can update own files"
ON storage.objects FOR UPDATE TO authenticated
USING (
  bucket_id = 'restaurant-images'
  AND (storage.foldername(name))[1] = auth.uid()::text
);

CREATE POLICY "Owners can delete own files"
ON storage.objects FOR DELETE TO authenticated
USING (
  bucket_id = 'restaurant-images'
  AND (storage.foldername(name))[1] = auth.uid()::text
);

CREATE POLICY "Owners can list own files"
ON storage.objects FOR SELECT TO authenticated
USING (
  bucket_id = 'restaurant-images'
  AND (storage.foldername(name))[1] = auth.uid()::text
);

-- promotion_sends: explicit deny client writes
DROP POLICY IF EXISTS "No client inserts on promotion_sends" ON public.promotion_sends;
DROP POLICY IF EXISTS "No client updates on promotion_sends" ON public.promotion_sends;
DROP POLICY IF EXISTS "No client deletes on promotion_sends" ON public.promotion_sends;
CREATE POLICY "No client inserts on promotion_sends"
ON public.promotion_sends FOR INSERT TO anon, authenticated WITH CHECK (false);
CREATE POLICY "No client updates on promotion_sends"
ON public.promotion_sends FOR UPDATE TO anon, authenticated USING (false);
CREATE POLICY "No client deletes on promotion_sends"
ON public.promotion_sends FOR DELETE TO anon, authenticated USING (false);

-- Realtime: restrict subscriptions to restaurant owners
DO $$ BEGIN
  EXECUTE 'ALTER TABLE realtime.messages ENABLE ROW LEVEL SECURITY';
EXCEPTION WHEN others THEN NULL;
END $$;

DROP POLICY IF EXISTS "Restaurant owners can subscribe" ON realtime.messages;
CREATE POLICY "Restaurant owners can subscribe"
ON realtime.messages FOR SELECT TO authenticated
USING (
  EXISTS (SELECT 1 FROM public.restaurants WHERE owner_id = auth.uid())
);
