
-- Drop functions whose return signature changes
DROP FUNCTION IF EXISTS public.increment_premium_usage(text);
DROP FUNCTION IF EXISTS public.get_voice_usage();
DROP FUNCTION IF EXISTS public.consume_voice_seconds(integer);

-- 1. Balance column on profiles
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS balance_cents integer NOT NULL DEFAULT 0;

-- 2. Ledger (idempotency + audit)
CREATE TABLE IF NOT EXISTS public.balance_ledger (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  delta_cents integer NOT NULL,
  reason text NOT NULL,
  ref text,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (reason, ref)
);
GRANT SELECT ON public.balance_ledger TO authenticated;
GRANT ALL ON public.balance_ledger TO service_role;
ALTER TABLE public.balance_ledger ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "users see own ledger" ON public.balance_ledger;
CREATE POLICY "users see own ledger" ON public.balance_ledger
  FOR SELECT TO authenticated USING (auth.uid() = user_id);

-- 3. Read own balance
CREATE OR REPLACE FUNCTION public.get_my_balance()
RETURNS integer LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT COALESCE((SELECT balance_cents FROM public.profiles WHERE id = auth.uid()), 0);
$$;
GRANT EXECUTE ON FUNCTION public.get_my_balance() TO authenticated;

-- 4. Admin credit (idempotent per PayPal order id)
CREATE OR REPLACE FUNCTION public.credit_user_balance(_user_id uuid, _cents integer, _ref text)
RETURNS integer LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  new_balance int;
  inserted boolean;
BEGIN
  IF _cents <= 0 THEN RAISE EXCEPTION 'BAD_AMOUNT'; END IF;
  IF _user_id IS NULL THEN RAISE EXCEPTION 'BAD_USER'; END IF;

  BEGIN
    INSERT INTO public.balance_ledger(user_id, delta_cents, reason, ref)
    VALUES (_user_id, _cents, 'topup_paypal', _ref);
    inserted := true;
  EXCEPTION WHEN unique_violation THEN
    inserted := false;
  END;

  IF inserted THEN
    UPDATE public.profiles SET balance_cents = balance_cents + _cents, updated_at = now()
      WHERE id = _user_id RETURNING balance_cents INTO new_balance;
  ELSE
    SELECT balance_cents INTO new_balance FROM public.profiles WHERE id = _user_id;
  END IF;

  RETURN COALESCE(new_balance, 0);
END;
$$;
REVOKE ALL ON FUNCTION public.credit_user_balance(uuid, integer, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.credit_user_balance(uuid, integer, text) TO service_role;

-- 5. Image/Video usage with balance fallback
CREATE OR REPLACE FUNCTION public.increment_premium_usage(_kind text)
RETURNS TABLE(images_generated integer, videos_generated integer, period_start date, charged_cents integer, balance_cents integer)
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
#variable_conflict use_column
DECLARE
  uid uuid := auth.uid();
  ps date := date_trunc('month', now() AT TIME ZONE 'UTC')::date;
  cur_imgs int := 0;
  cur_vids int := 0;
  user_tier text;
  img_limit int;
  vid_limit int;
  cost int := 0;
  bal int := 0;
  charged int := 0;
BEGIN
  IF uid IS NULL THEN RAISE EXCEPTION 'NOT_AUTHENTICATED'; END IF;
  IF _kind NOT IN ('image','video') THEN RAISE EXCEPTION 'bad kind'; END IF;

  SELECT s.tier INTO user_tier FROM public.subscriptions s
    WHERE s.user_id = uid AND s.status = 'active'
      AND (s.current_period_end IS NULL OR s.current_period_end > now())
    LIMIT 1;
  IF user_tier IS NULL THEN RAISE EXCEPTION 'PREMIUM_REQUIRED'; END IF;

  IF user_tier = 'standard' THEN img_limit := 500; vid_limit := 0;
  ELSE img_limit := 900; vid_limit := 15; END IF;

  INSERT INTO public.premium_usage(user_id, period_start, images_generated, videos_generated)
    VALUES (uid, ps, 0, 0)
    ON CONFLICT (user_id, period_start) DO NOTHING;

  SELECT pu.images_generated, pu.videos_generated INTO cur_imgs, cur_vids
    FROM public.premium_usage pu WHERE pu.user_id = uid AND pu.period_start = ps FOR UPDATE;

  IF _kind = 'image' THEN
    IF cur_imgs >= img_limit THEN cost := 3; END IF;
  ELSE
    IF cur_vids >= vid_limit THEN cost := 40; END IF;
  END IF;

  IF cost > 0 THEN
    SELECT p.balance_cents INTO bal FROM public.profiles p WHERE p.id = uid FOR UPDATE;
    IF COALESCE(bal, 0) < cost THEN
      IF _kind = 'image' THEN RAISE EXCEPTION 'MONTHLY_IMAGE_LIMIT'; END IF;
      RAISE EXCEPTION 'MONTHLY_VIDEO_LIMIT';
    END IF;
    UPDATE public.profiles SET balance_cents = balance_cents - cost, updated_at = now()
      WHERE id = uid RETURNING balance_cents INTO bal;
    INSERT INTO public.balance_ledger(user_id, delta_cents, reason, ref)
      VALUES (uid, -cost, _kind, gen_random_uuid()::text);
    charged := cost;
  ELSE
    SELECT p.balance_cents INTO bal FROM public.profiles p WHERE p.id = uid;
  END IF;

  UPDATE public.premium_usage pu
    SET images_generated = pu.images_generated + CASE WHEN _kind='image' THEN 1 ELSE 0 END,
        videos_generated = pu.videos_generated + CASE WHEN _kind='video' THEN 1 ELSE 0 END,
        updated_at = now()
    WHERE pu.user_id = uid AND pu.period_start = ps
    RETURNING pu.images_generated, pu.videos_generated, pu.period_start
    INTO cur_imgs, cur_vids, ps;

  RETURN QUERY SELECT cur_imgs, cur_vids, ps, charged, COALESCE(bal, 0);
END;
$$;

-- 6. Voice consumption with balance fallback (all paid tiers)
CREATE OR REPLACE FUNCTION public.consume_voice_seconds(_seconds integer)
RETURNS TABLE(voice_seconds_used integer, monthly_limit_seconds integer, period_start date, balance_cents integer, charged_cents integer)
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
#variable_conflict use_column
DECLARE
  uid uuid := auth.uid();
  ps date := date_trunc('month', now() AT TIME ZONE 'UTC')::date;
  cur int := 0;
  lim int := 1200;
  user_tier text;
  add_secs int := GREATEST(0, COALESCE(_seconds, 0));
  free_avail int;
  free_used int := 0;
  paid_secs int := 0;
  cost int := 0;
  bal int := 0;
BEGIN
  IF uid IS NULL THEN RAISE EXCEPTION 'NOT_AUTHENTICATED'; END IF;

  SELECT s.tier INTO user_tier FROM public.subscriptions s
    WHERE s.user_id = uid AND s.status = 'active'
      AND (s.current_period_end IS NULL OR s.current_period_end > now())
    LIMIT 1;
  IF user_tier IS NULL THEN RAISE EXCEPTION 'PREMIUM_REQUIRED'; END IF;

  INSERT INTO public.premium_usage(user_id, period_start, images_generated, videos_generated, models_3d_generated, voice_seconds_used)
    VALUES (uid, ps, 0, 0, 0, 0)
    ON CONFLICT (user_id, period_start) DO NOTHING;

  SELECT pu.voice_seconds_used INTO cur
    FROM public.premium_usage pu WHERE pu.user_id = uid AND pu.period_start = ps FOR UPDATE;

  IF user_tier = 'ultimate' THEN
    free_avail := GREATEST(0, lim - cur);
  ELSE
    free_avail := 0;
  END IF;

  free_used := LEAST(add_secs, free_avail);
  paid_secs := add_secs - free_used;

  IF paid_secs > 0 THEN
    cost := (paid_secs * 20 + 59) / 60;
    SELECT p.balance_cents INTO bal FROM public.profiles p WHERE p.id = uid FOR UPDATE;
    IF COALESCE(bal, 0) < cost THEN
      paid_secs := GREATEST(0, (COALESCE(bal, 0) * 60) / 20);
      cost := (paid_secs * 20 + 59) / 60;
      IF cost > COALESCE(bal, 0) THEN cost := COALESCE(bal, 0); END IF;
    END IF;
    IF cost > 0 THEN
      UPDATE public.profiles SET balance_cents = balance_cents - cost, updated_at = now()
        WHERE id = uid RETURNING balance_cents INTO bal;
      INSERT INTO public.balance_ledger(user_id, delta_cents, reason, ref)
        VALUES (uid, -cost, 'voice', gen_random_uuid()::text);
    END IF;
  ELSE
    SELECT p.balance_cents INTO bal FROM public.profiles p WHERE p.id = uid;
  END IF;

  IF free_used > 0 THEN
    UPDATE public.premium_usage pu
      SET voice_seconds_used = LEAST(lim, pu.voice_seconds_used + free_used),
          updated_at = now()
      WHERE pu.user_id = uid AND pu.period_start = ps
      RETURNING pu.voice_seconds_used INTO cur;
  END IF;

  RETURN QUERY SELECT cur, lim, ps, COALESCE(bal, 0), cost;
END;
$$;

-- 7. get_voice_usage: now returns balance too
CREATE OR REPLACE FUNCTION public.get_voice_usage()
RETURNS TABLE(voice_seconds_used integer, monthly_limit_seconds integer, period_start date, balance_cents integer)
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
#variable_conflict use_column
DECLARE
  uid uuid := auth.uid();
  ps date := date_trunc('month', now() AT TIME ZONE 'UTC')::date;
  cur int := 0;
  lim int := 1200;
  bal int := 0;
BEGIN
  IF uid IS NULL THEN RAISE EXCEPTION 'NOT_AUTHENTICATED'; END IF;

  INSERT INTO public.premium_usage(user_id, period_start, images_generated, videos_generated, models_3d_generated, voice_seconds_used)
    VALUES (uid, ps, 0, 0, 0, 0)
    ON CONFLICT (user_id, period_start) DO NOTHING;

  SELECT pu.voice_seconds_used INTO cur
    FROM public.premium_usage pu WHERE pu.user_id = uid AND pu.period_start = ps;
  SELECT p.balance_cents INTO bal FROM public.profiles p WHERE p.id = uid;

  RETURN QUERY SELECT COALESCE(cur, 0), lim, ps, COALESCE(bal, 0);
END;
$$;
