
ALTER TABLE public.premium_usage
  ADD COLUMN IF NOT EXISTS voice_seconds_used integer NOT NULL DEFAULT 0;

CREATE OR REPLACE FUNCTION public.get_voice_usage()
RETURNS TABLE(voice_seconds_used integer, monthly_limit_seconds integer, period_start date)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
#variable_conflict use_column
DECLARE
  uid uuid := auth.uid();
  ps date := date_trunc('month', now() AT TIME ZONE 'UTC')::date;
  cur int := 0;
  lim int := 1200;
BEGIN
  IF uid IS NULL THEN RAISE EXCEPTION 'NOT_AUTHENTICATED'; END IF;

  INSERT INTO public.premium_usage(user_id, period_start, images_generated, videos_generated, models_3d_generated, voice_seconds_used)
  VALUES (uid, ps, 0, 0, 0, 0)
  ON CONFLICT (user_id, period_start) DO NOTHING;

  SELECT pu.voice_seconds_used INTO cur
  FROM public.premium_usage pu
  WHERE pu.user_id = uid AND pu.period_start = ps;

  RETURN QUERY SELECT COALESCE(cur, 0), lim, ps;
END;
$$;

CREATE OR REPLACE FUNCTION public.consume_voice_seconds(_seconds integer)
RETURNS TABLE(voice_seconds_used integer, monthly_limit_seconds integer, period_start date)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
#variable_conflict use_column
DECLARE
  uid uuid := auth.uid();
  ps date := date_trunc('month', now() AT TIME ZONE 'UTC')::date;
  cur int := 0;
  lim int := 1200;
  user_tier text;
  add_secs int := GREATEST(0, COALESCE(_seconds, 0));
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

  INSERT INTO public.premium_usage(user_id, period_start, images_generated, videos_generated, models_3d_generated, voice_seconds_used)
  VALUES (uid, ps, 0, 0, 0, 0)
  ON CONFLICT (user_id, period_start) DO NOTHING;

  SELECT pu.voice_seconds_used INTO cur
  FROM public.premium_usage pu
  WHERE pu.user_id = uid AND pu.period_start = ps
  FOR UPDATE;

  IF cur >= lim THEN
    RETURN QUERY SELECT cur, lim, ps;
    RETURN;
  END IF;

  UPDATE public.premium_usage pu
  SET voice_seconds_used = LEAST(lim, pu.voice_seconds_used + add_secs),
      updated_at = now()
  WHERE pu.user_id = uid AND pu.period_start = ps
  RETURNING pu.voice_seconds_used, pu.period_start
  INTO cur, ps;

  RETURN QUERY SELECT cur, lim, ps;
END;
$$;
