
-- Replace permissive INSERT policy with one that forces safe defaults
DROP POLICY IF EXISTS "Users insert own subscription" ON public.subscriptions;

CREATE POLICY "Users insert own subscription as inactive"
ON public.subscriptions
FOR INSERT
TO authenticated
WITH CHECK (
  auth.uid() = user_id
  AND status = 'inactive'
  AND paypal_subscription_id IS NULL
  AND current_period_end IS NULL
  AND cancelled_at IS NULL
);

-- Explicitly deny direct UPDATE/DELETE from authenticated users.
-- Server-side code uses the service role (supabaseAdmin), which bypasses RLS.
DROP POLICY IF EXISTS "No direct updates by users" ON public.subscriptions;
CREATE POLICY "No direct updates by users"
ON public.subscriptions
FOR UPDATE
TO authenticated
USING (false)
WITH CHECK (false);

DROP POLICY IF EXISTS "No direct deletes by users" ON public.subscriptions;
CREATE POLICY "No direct deletes by users"
ON public.subscriptions
FOR DELETE
TO authenticated
USING (false);
