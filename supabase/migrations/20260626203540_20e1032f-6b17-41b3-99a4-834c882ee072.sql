-- 1. premium_usage: remove client INSERT/UPDATE; only SECURITY DEFINER fn writes
DROP POLICY IF EXISTS "Users insert own usage" ON public.premium_usage;
DROP POLICY IF EXISTS "Users update own usage" ON public.premium_usage;

-- 2. profiles: restrict SELECT to own row (hides strike_count/suspended_until from others)
DROP POLICY IF EXISTS "Profiles viewable by authenticated" ON public.profiles;
CREATE POLICY "Users view own profile" ON public.profiles
  FOR SELECT TO authenticated
  USING (auth.uid() = id);

-- 3. media bucket: restrict SELECT to owner's folder
DROP POLICY IF EXISTS "Authenticated can read media" ON storage.objects;
CREATE POLICY "Users read own media" ON storage.objects
  FOR SELECT TO authenticated
  USING (bucket_id = 'media' AND (storage.foldername(name))[1] = (auth.uid())::text);

-- 4. SECURITY DEFINER functions: lock down EXECUTE privileges
REVOKE ALL ON FUNCTION public.update_updated_at_column() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.handle_new_user() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.has_active_subscription(uuid) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.increment_premium_usage(text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.increment_premium_usage(text) TO authenticated;
