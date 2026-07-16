
ALTER TABLE public.subscriptions
  ADD COLUMN IF NOT EXISTS tier text NOT NULL DEFAULT 'ultimate';

ALTER TABLE public.subscriptions
  DROP CONSTRAINT IF EXISTS subscriptions_tier_check;
ALTER TABLE public.subscriptions
  ADD CONSTRAINT subscriptions_tier_check CHECK (tier IN ('standard','ultimate'));

CREATE OR REPLACE FUNCTION public.increment_premium_usage(_kind text)
RETURNS TABLE(images_generated integer, videos_generated integer, period_start date)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
#variable_conflict use_column
DECLARE
  uid uuid := auth.uid();
  ps date := date_trunc('month', now() AT TIME ZONE 'UTC')::date;
  cur_imgs int := 0;
  cur_vids int := 0;
  user_tier text;
  img_limit int;
  vid_limit int;
BEGIN
  IF uid IS NULL THEN RAISE EXCEPTION 'NOT_AUTHENTICATED'; END IF;
  IF _kind NOT IN ('image','video') THEN RAISE EXCEPTION 'bad kind'; END IF;

  SELECT s.tier INTO user_tier
  FROM public.subscriptions s
  WHERE s.user_id = uid
    AND s.status = 'active'
    AND (s.current_period_end IS NULL OR s.current_period_end > now())
  LIMIT 1;

  IF user_tier IS NULL THEN RAISE EXCEPTION 'PREMIUM_REQUIRED'; END IF;

  IF user_tier = 'standard' THEN
    img_limit := 500;
    vid_limit := 0;
  ELSE
    img_limit := 900;
    vid_limit := 15;
  END IF;

  IF _kind = 'video' AND vid_limit = 0 THEN RAISE EXCEPTION 'VIDEO_REQUIRES_ULTIMATE'; END IF;

  INSERT INTO public.premium_usage(user_id, period_start, images_generated, videos_generated)
  VALUES (uid, ps, 0, 0)
  ON CONFLICT (user_id, period_start) DO NOTHING;

  SELECT pu.images_generated, pu.videos_generated INTO cur_imgs, cur_vids
  FROM public.premium_usage pu
  WHERE pu.user_id = uid AND pu.period_start = ps
  FOR UPDATE;

  IF _kind = 'image' AND cur_imgs >= img_limit THEN RAISE EXCEPTION 'MONTHLY_IMAGE_LIMIT'; END IF;
  IF _kind = 'video' AND cur_vids >= vid_limit THEN RAISE EXCEPTION 'MONTHLY_VIDEO_LIMIT'; END IF;

  UPDATE public.premium_usage pu
  SET images_generated = pu.images_generated + CASE WHEN _kind = 'image' THEN 1 ELSE 0 END,
      videos_generated = pu.videos_generated + CASE WHEN _kind = 'video' THEN 1 ELSE 0 END,
      updated_at = now()
  WHERE pu.user_id = uid AND pu.period_start = ps
  RETURNING pu.images_generated, pu.videos_generated, pu.period_start
  INTO cur_imgs, cur_vids, ps;

  RETURN QUERY SELECT cur_imgs, cur_vids, ps;
END;
$function$;
