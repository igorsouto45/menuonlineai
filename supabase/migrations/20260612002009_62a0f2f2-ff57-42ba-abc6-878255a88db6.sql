
-- Grant table privileges so Data API (PostgREST) can reach public tables.
-- Policies already restrict access; these GRANTs unblock them.

-- service_role: full access on all public tables
GRANT ALL ON public.categories, public.customers, public.delivery_areas, public.orders, public.plans,
  public.product_additionals, public.product_images, public.product_reviews, public.product_variations,
  public.products, public.profiles, public.promotion_campaigns, public.promotion_sends,
  public.restaurant_tables, public.restaurants, public.subscriptions, public.user_roles
  TO service_role;

-- authenticated: standard CRUD on all (RLS enforces actual access)
GRANT SELECT, INSERT, UPDATE, DELETE ON
  public.categories, public.customers, public.delivery_areas, public.orders, public.plans,
  public.product_additionals, public.product_images, public.product_reviews, public.product_variations,
  public.products, public.profiles, public.promotion_campaigns, public.promotion_sends,
  public.restaurant_tables, public.restaurants, public.subscriptions, public.user_roles
  TO authenticated;

-- anon: only where policies allow public access
GRANT SELECT ON
  public.categories, public.delivery_areas, public.plans, public.product_additionals,
  public.product_images, public.product_reviews, public.product_variations, public.products,
  public.restaurant_tables, public.restaurants, public.customers
  TO anon;

GRANT INSERT ON public.orders, public.customers, public.product_reviews TO anon;
GRANT UPDATE ON public.customers TO anon;
