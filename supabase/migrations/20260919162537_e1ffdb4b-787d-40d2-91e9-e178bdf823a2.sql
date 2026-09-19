ALTER TABLE public.orders
  ADD COLUMN IF NOT EXISTS delivery_code text,
  ADD COLUMN IF NOT EXISTS delivered_at timestamptz,
  ADD COLUMN IF NOT EXISTS delivery_confirmed_by text;

CREATE OR REPLACE FUNCTION public.set_order_delivery_code()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
DECLARE
  candidate text;
  attempts int := 0;
BEGIN
  IF NEW.delivery_code IS NOT NULL THEN
    RETURN NEW;
  END IF;

  IF COALESCE(NEW.delivery_mode, 'delivery') <> 'delivery' THEN
    RETURN NEW;
  END IF;

  LOOP
    attempts := attempts + 1;
    candidate := lpad((floor(random() * 10000))::int::text, 4, '0');
    EXIT WHEN NOT EXISTS (
      SELECT 1 FROM public.orders o
      WHERE o.delivery_code = candidate
        AND o.restaurant_id = NEW.restaurant_id
        AND o.status NOT IN ('delivered', 'cancelled')
    ) OR attempts > 25;
  END LOOP;

  NEW.delivery_code := candidate;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS set_order_delivery_code_trigger ON public.orders;
CREATE TRIGGER set_order_delivery_code_trigger
BEFORE INSERT ON public.orders
FOR EACH ROW EXECUTE FUNCTION public.set_order_delivery_code();

-- Backfill codes for open delivery orders
UPDATE public.orders
SET delivery_code = lpad((floor(random() * 10000))::int::text, 4, '0')
WHERE delivery_code IS NULL
  AND COALESCE(delivery_mode, 'delivery') = 'delivery'
  AND status NOT IN ('delivered', 'cancelled');

-- Courier lookup by code (no sensitive data leak beyond order summary)
CREATE OR REPLACE FUNCTION public.get_order_by_delivery_code(_code text)
RETURNS TABLE (
  id uuid,
  restaurant_id uuid,
  customer_name text,
  customer_address text,
  total numeric,
  status order_status,
  created_at timestamptz,
  restaurant_name text
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT o.id, o.restaurant_id, o.customer_name, o.customer_address,
         o.total, o.status, o.created_at, r.name
  FROM public.orders o
  JOIN public.restaurants r ON r.id = o.restaurant_id
  WHERE o.delivery_code = trim(_code)
    AND o.status IN ('ready', 'out_for_delivery')
  ORDER BY o.created_at DESC
  LIMIT 1;
$$;

-- Courier confirms delivery with the code
CREATE OR REPLACE FUNCTION public.confirm_delivery_by_code(_code text)
RETURNS TABLE (order_id uuid, success boolean, message text)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  target public.orders;
BEGIN
  SELECT * INTO target
  FROM public.orders o
  WHERE o.delivery_code = trim(_code)
    AND o.status IN ('ready', 'out_for_delivery')
  ORDER BY o.created_at DESC
  LIMIT 1;

  IF target.id IS NULL THEN
    RETURN QUERY SELECT NULL::uuid, false, 'Código inválido ou pedido já finalizado.';
    RETURN;
  END IF;

  UPDATE public.orders
  SET status = 'delivered',
      delivered_at = now(),
      delivery_confirmed_by = 'courier',
      updated_at = now()
  WHERE id = target.id;

  RETURN QUERY SELECT target.id, true, 'Entrega confirmada!';
END;
$$;

-- Customer confirms they received the order (from the tracking link)
CREATE OR REPLACE FUNCTION public.confirm_delivery_by_customer(_order_id uuid)
RETURNS TABLE (success boolean, message text)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  current_status order_status;
BEGIN
  SELECT status INTO current_status FROM public.orders WHERE id = _order_id;

  IF current_status IS NULL THEN
    RETURN QUERY SELECT false, 'Pedido não encontrado.';
    RETURN;
  END IF;

  IF current_status = 'delivered' THEN
    RETURN QUERY SELECT true, 'Pedido já estava marcado como entregue.';
    RETURN;
  END IF;

  IF current_status NOT IN ('ready', 'out_for_delivery') THEN
    RETURN QUERY SELECT false, 'O pedido ainda não saiu para entrega.';
    RETURN;
  END IF;

  UPDATE public.orders
  SET status = 'delivered',
      delivered_at = now(),
      delivery_confirmed_by = 'customer',
      updated_at = now()
  WHERE id = _order_id;

  RETURN QUERY SELECT true, 'Obrigado! Entrega confirmada.';
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_order_by_delivery_code(text) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.confirm_delivery_by_code(text) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.confirm_delivery_by_customer(uuid) TO anon, authenticated;