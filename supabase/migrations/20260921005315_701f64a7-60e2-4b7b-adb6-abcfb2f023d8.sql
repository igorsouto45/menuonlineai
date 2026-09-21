
ALTER TABLE public.orders
  ADD COLUMN IF NOT EXISTS ready_at timestamptz,
  ADD COLUMN IF NOT EXISTS out_for_delivery_at timestamptz,
  ADD COLUMN IF NOT EXISTS estimated_delivery_at timestamptz;

CREATE OR REPLACE FUNCTION public.set_order_status_timestamps()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  IF NEW.status IS DISTINCT FROM OLD.status THEN
    IF NEW.status = 'ready' AND NEW.ready_at IS NULL THEN
      NEW.ready_at := now();
    END IF;
    IF NEW.status = 'out_for_delivery' AND NEW.out_for_delivery_at IS NULL THEN
      NEW.out_for_delivery_at := now();
    END IF;
    IF NEW.status = 'delivered' AND NEW.delivered_at IS NULL THEN
      NEW.delivered_at := now();
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS set_order_status_timestamps_trigger ON public.orders;
CREATE TRIGGER set_order_status_timestamps_trigger
BEFORE UPDATE ON public.orders
FOR EACH ROW EXECUTE FUNCTION public.set_order_status_timestamps();

CREATE TABLE IF NOT EXISTS public.delivery_sessions (
  order_id uuid PRIMARY KEY REFERENCES public.orders(id) ON DELETE CASCADE,
  restaurant_id uuid NOT NULL REFERENCES public.restaurants(id) ON DELETE CASCADE,
  session_token uuid NOT NULL DEFAULT gen_random_uuid(),
  lat double precision,
  lng double precision,
  accuracy_m double precision,
  location_updated_at timestamptz,
  dest_lat double precision,
  dest_lng double precision,
  eta_seconds integer,
  eta_distance_m integer,
  eta_updated_at timestamptz,
  expires_at timestamptz NOT NULL DEFAULT now() + interval '4 hours',
  created_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT ON public.delivery_sessions TO authenticated;
GRANT ALL ON public.delivery_sessions TO service_role;

ALTER TABLE public.delivery_sessions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Owners can view delivery sessions" ON public.delivery_sessions;
CREATE POLICY "Owners can view delivery sessions"
ON public.delivery_sessions FOR SELECT TO authenticated
USING (public.is_restaurant_owner(auth.uid(), restaurant_id));

-- Entregador: inicia a rota com o código e recebe um acesso temporário
CREATE OR REPLACE FUNCTION public.start_delivery_session(_code text)
RETURNS TABLE(order_id uuid, session_token uuid, customer_name text, customer_address text, total numeric, restaurant_name text, success boolean, message text)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_order public.orders;
  v_token uuid;
BEGIN
  SELECT * INTO v_order
  FROM public.orders o
  WHERE o.delivery_code = _code
    AND o.status IN ('ready', 'out_for_delivery')
    AND o.created_at > now() - interval '1 day'
  ORDER BY o.created_at DESC
  LIMIT 1;

  IF v_order.id IS NULL THEN
    RETURN QUERY SELECT NULL::uuid, NULL::uuid, NULL::text, NULL::text, NULL::numeric, NULL::text, false,
      'Código inválido, ou o pedido ainda não está pronto / já foi finalizado.';
    RETURN;
  END IF;

  INSERT INTO public.delivery_sessions (order_id, restaurant_id)
  VALUES (v_order.id, v_order.restaurant_id)
  ON CONFLICT (order_id) DO UPDATE
    SET expires_at = now() + interval '4 hours'
  RETURNING delivery_sessions.session_token INTO v_token;

  UPDATE public.orders o
  SET status = 'out_for_delivery'
  WHERE o.id = v_order.id AND o.status = 'ready';

  RETURN QUERY SELECT v_order.id, v_token, v_order.customer_name, v_order.customer_address, v_order.total,
    (SELECT r.name FROM public.restaurants r WHERE r.id = v_order.restaurant_id), true, 'ok'::text;
END;
$$;

-- Entregador: envia a posição atual (exige o acesso temporário)
CREATE OR REPLACE FUNCTION public.update_delivery_location(_order_id uuid, _token uuid, _lat double precision, _lng double precision, _accuracy double precision DEFAULT NULL)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_updated integer;
BEGIN
  IF _lat IS NULL OR _lng IS NULL OR _lat < -90 OR _lat > 90 OR _lng < -180 OR _lng > 180 THEN
    RETURN false;
  END IF;

  UPDATE public.delivery_sessions ds
  SET lat = _lat,
      lng = _lng,
      accuracy_m = _accuracy,
      location_updated_at = now()
  WHERE ds.order_id = _order_id
    AND ds.session_token = _token
    AND ds.expires_at > now()
    AND (ds.location_updated_at IS NULL OR ds.location_updated_at < now() - interval '4 seconds')
    AND EXISTS (
      SELECT 1 FROM public.orders o
      WHERE o.id = _order_id AND o.status IN ('ready', 'out_for_delivery')
    );

  GET DIAGNOSTICS v_updated = ROW_COUNT;
  RETURN v_updated > 0;
END;
$$;

-- Cliente: acompanha a posição pelo link do próprio pedido
CREATE OR REPLACE FUNCTION public.get_delivery_tracking(_order_id uuid)
RETURNS TABLE(lat double precision, lng double precision, location_updated_at timestamptz, eta_seconds integer, eta_distance_m integer, eta_updated_at timestamptz, dest_lat double precision, dest_lng double precision, status order_status, estimated_delivery_at timestamptz)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT ds.lat, ds.lng, ds.location_updated_at, ds.eta_seconds, ds.eta_distance_m, ds.eta_updated_at,
         ds.dest_lat, ds.dest_lng, o.status, o.estimated_delivery_at
  FROM public.orders o
  LEFT JOIN public.delivery_sessions ds ON ds.order_id = o.id
  WHERE o.id = _order_id
    AND o.status IN ('ready', 'out_for_delivery')
    AND ds.expires_at > now()
  LIMIT 1;
$$;

-- Restaurante: dar baixa como entregue direto no painel
CREATE OR REPLACE FUNCTION public.mark_order_delivered(_order_id uuid)
RETURNS TABLE(success boolean, message text)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_restaurant uuid;
  v_status order_status;
BEGIN
  SELECT o.restaurant_id, o.status INTO v_restaurant, v_status
  FROM public.orders o WHERE o.id = _order_id;

  IF v_restaurant IS NULL THEN
    RETURN QUERY SELECT false, 'Pedido não encontrado.'::text;
    RETURN;
  END IF;

  IF NOT public.is_restaurant_owner(auth.uid(), v_restaurant) THEN
    RETURN QUERY SELECT false, 'Você não tem permissão para alterar este pedido.'::text;
    RETURN;
  END IF;

  IF v_status = 'delivered' THEN
    RETURN QUERY SELECT false, 'Este pedido já está marcado como entregue.'::text;
    RETURN;
  END IF;

  IF v_status = 'cancelled' THEN
    RETURN QUERY SELECT false, 'Este pedido foi cancelado.'::text;
    RETURN;
  END IF;

  UPDATE public.orders o
  SET status = 'delivered',
      delivered_at = now(),
      delivery_confirmed_by = 'restaurant'
  WHERE o.id = _order_id;

  DELETE FROM public.delivery_sessions ds WHERE ds.order_id = _order_id;

  RETURN QUERY SELECT true, 'Pedido marcado como entregue.'::text;
END;
$$;

REVOKE ALL ON FUNCTION public.update_delivery_location(uuid, uuid, double precision, double precision, double precision) FROM public;
GRANT EXECUTE ON FUNCTION public.update_delivery_location(uuid, uuid, double precision, double precision, double precision) TO anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.start_delivery_session(text) TO anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.get_delivery_tracking(uuid) TO anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.mark_order_delivered(uuid) TO authenticated, service_role;
