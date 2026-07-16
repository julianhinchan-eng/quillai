
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS strike_count integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS suspended_until timestamptz;

CREATE TABLE IF NOT EXISTS public.user_strikes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  category text NOT NULL,
  reason text,
  content text,
  created_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT ON public.user_strikes TO authenticated;
GRANT ALL ON public.user_strikes TO service_role;

ALTER TABLE public.user_strikes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read their own strikes"
  ON public.user_strikes FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);
