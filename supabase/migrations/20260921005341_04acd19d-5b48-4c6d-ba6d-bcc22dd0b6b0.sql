
REVOKE EXECUTE ON FUNCTION public.handle_new_user() FROM anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.set_order_delivery_code() FROM anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.set_order_status_timestamps() FROM anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.promote_user_to_admin(text) FROM anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.mark_order_delivered(uuid) FROM anon;
