-- Revoke EXECUTE from public/anon on SECURITY DEFINER functions to prevent unauthenticated calls.
REVOKE EXECUTE ON FUNCTION public.has_active_subscription(uuid) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.consume_voice_seconds(integer) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.increment_premium_usage(text) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.get_voice_usage() FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.has_role(uuid, public.app_role) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.credit_user_balance(uuid, integer, text) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.increment_3d_usage() FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.get_my_balance() FROM PUBLIC, anon;

GRANT EXECUTE ON FUNCTION public.has_active_subscription(uuid) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.consume_voice_seconds(integer) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.increment_premium_usage(text) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.get_voice_usage() TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.has_role(uuid, public.app_role) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.credit_user_balance(uuid, integer, text) TO service_role;
GRANT EXECUTE ON FUNCTION public.increment_3d_usage() TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.get_my_balance() TO authenticated, service_role;