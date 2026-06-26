
ALTER TABLE public.product_reviews
  ADD COLUMN IF NOT EXISTS order_id uuid REFERENCES public.orders(id) ON DELETE CASCADE;

CREATE INDEX IF NOT EXISTS idx_product_reviews_order ON public.product_reviews(order_id);
CREATE UNIQUE INDEX IF NOT EXISTS uq_product_reviews_order_product
  ON public.product_reviews(order_id, product_id)
  WHERE order_id IS NOT NULL;

CREATE OR REPLACE FUNCTION public.get_order_for_review(_order_id uuid)
RETURNS TABLE (
  id uuid,
  restaurant_id uuid,
  customer_name text,
  items jsonb,
  total numeric,
  status order_status,
  restaurant_name text,
  restaurant_slug text,
  restaurant_logo_url text,
  already_reviewed boolean
)
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    o.id,
    o.restaurant_id,
    o.customer_name,
    o.items,
    o.total,
    o.status,
    r.name,
    r.slug,
    r.logo_url,
    EXISTS (SELECT 1 FROM public.product_reviews pr WHERE pr.order_id = o.id)
  FROM public.orders o
  JOIN public.restaurants r ON r.id = o.restaurant_id
  WHERE o.id = _order_id;
$$;

GRANT EXECUTE ON FUNCTION public.get_order_for_review(uuid) TO anon, authenticated;
