
ALTER TABLE public.premium_usage ADD COLUMN IF NOT EXISTS models_3d_generated integer NOT NULL DEFAULT 0;
ALTER TABLE public.premium_usage DROP CONSTRAINT IF EXISTS premium_usage_check;
ALTER TABLE public.premium_usage ADD CONSTRAINT premium_usage_check CHECK (images_generated >= 0 AND videos_generated >= 0 AND models_3d_generated >= 0);

CREATE OR REPLACE FUNCTION public.increment_3d_usage()
RETURNS TABLE(models_3d_generated integer, period_start date, monthly_limit integer)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
#variable_conflict use_column
DECLARE
  uid uuid := auth.uid();
  ps date := date_trunc('month', now() AT TIME ZONE 'UTC')::date;
  cur int := 0;
  user_tier text;
  lim int := 20;
BEGIN
  IF uid IS NULL THEN RAISE EXCEPTION 'NOT_AUTHENTICATED'; END IF;

  SELECT s.tier INTO user_tier
  FROM public.subscriptions s
  WHERE s.user_id = uid
    AND s.status = 'active'
    AND (s.current_period_end IS NULL OR s.current_period_end > now())
  LIMIT 1;

  IF user_tier IS NULL OR user_tier <> 'ultimate' THEN
    RAISE EXCEPTION 'ULTIMATE_REQUIRED';
  END IF;

  INSERT INTO public.premium_usage(user_id, period_start, images_generated, videos_generated, models_3d_generated)
  VALUES (uid, ps, 0, 0, 0)
  ON CONFLICT (user_id, period_start) DO NOTHING;

  SELECT pu.models_3d_generated INTO cur
  FROM public.premium_usage pu
  WHERE pu.user_id = uid AND pu.period_start = ps
  FOR UPDATE;

  IF cur >= lim THEN RAISE EXCEPTION 'MONTHLY_3D_LIMIT'; END IF;

  UPDATE public.premium_usage pu
  SET models_3d_generated = pu.models_3d_generated + 1,
      updated_at = now()
  WHERE pu.user_id = uid AND pu.period_start = ps
  RETURNING pu.models_3d_generated, pu.period_start
  INTO cur, ps;

  RETURN QUERY SELECT cur, ps, lim;
END;
$$;
