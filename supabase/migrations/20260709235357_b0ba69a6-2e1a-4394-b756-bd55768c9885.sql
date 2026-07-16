-- Internal helpers used only by RLS policies: no direct call needed by clients.
REVOKE EXECUTE ON FUNCTION public.has_role(uuid, public.app_role) FROM authenticated;
REVOKE EXECUTE ON FUNCTION public.has_active_subscription(uuid) FROM authenticated;