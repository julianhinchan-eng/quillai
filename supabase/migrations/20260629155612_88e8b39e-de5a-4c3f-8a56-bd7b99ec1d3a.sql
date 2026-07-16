
-- 1. Admin role for user
INSERT INTO public.user_roles (user_id, role)
SELECT u.id, 'admin'::public.app_role
FROM auth.users u
WHERE u.email = 'julianhinchan@gmail.com'
ON CONFLICT (user_id, role) DO NOTHING;

-- 2. Extend status check to allow human_handled
ALTER TABLE public.support_conversations DROP CONSTRAINT IF EXISTS support_conversations_status_check;
ALTER TABLE public.support_conversations
  ADD CONSTRAINT support_conversations_status_check
  CHECK (status = ANY (ARRAY['ai','human_required','human_handled','closed']));

-- 3. Add unread_for_admin flag for dashboard sorting
ALTER TABLE public.support_conversations
  ADD COLUMN IF NOT EXISTS unread_admin boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS unread_user boolean NOT NULL DEFAULT false;

-- 4. Public read of own conversation / messages via client_token is enforced in server functions
-- using the admin client. The existing admin-only SELECT policies stay as-is. We add an INSERT
-- policy for admins to update conversations (already exists) and allow admins to delete if needed.
DROP POLICY IF EXISTS "Admins delete conversations" ON public.support_conversations;
CREATE POLICY "Admins delete conversations" ON public.support_conversations
  FOR DELETE TO authenticated USING (has_role(auth.uid(), 'admin'::app_role));

-- 5. Helpful index
CREATE INDEX IF NOT EXISTS support_conversations_status_updated_idx
  ON public.support_conversations (status, updated_at DESC);
