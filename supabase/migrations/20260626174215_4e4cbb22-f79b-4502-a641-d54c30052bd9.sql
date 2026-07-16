DROP FUNCTION IF EXISTS public.increment_premium_usage(uuid, text);

CREATE OR REPLACE FUNCTION public.increment_premium_usage(_kind text)
RETURNS TABLE(images_generated int, videos_generated int, period_start date)
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  uid uuid := auth.uid();
  ps date := date_trunc('month', now() AT TIME ZONE 'UTC')::date;
  cur_imgs int := 0;
  cur_vids int := 0;
  img_limit constant int := 100;
  vid_limit constant int := 15;
BEGIN
  IF uid IS NULL THEN
    RAISE EXCEPTION 'NOT_AUTHENTICATED';
  END IF;
  IF _kind NOT IN ('image','video') THEN
    RAISE EXCEPTION 'bad kind';
  END IF;

  INSERT INTO public.premium_usage(user_id, period_start, images_generated, videos_generated)
  VALUES (uid, ps, 0, 0)
  ON CONFLICT (user_id, period_start) DO NOTHING;

  SELECT pu.images_generated, pu.videos_generated INTO cur_imgs, cur_vids
  FROM public.premium_usage pu
  WHERE pu.user_id = uid AND pu.period_start = ps
  FOR UPDATE;

  IF _kind = 'image' AND cur_imgs >= img_limit THEN
    RAISE EXCEPTION 'MONTHLY_IMAGE_LIMIT';
  END IF;
  IF _kind = 'video' AND cur_vids >= vid_limit THEN
    RAISE EXCEPTION 'MONTHLY_VIDEO_LIMIT';
  END IF;

  UPDATE public.premium_usage pu
  SET images_generated = pu.images_generated + CASE WHEN _kind = 'image' THEN 1 ELSE 0 END,
      videos_generated = pu.videos_generated + CASE WHEN _kind = 'video' THEN 1 ELSE 0 END,
      updated_at = now()
  WHERE pu.user_id = uid AND pu.period_start = ps
  RETURNING pu.images_generated, pu.videos_generated, pu.period_start
  INTO cur_imgs, cur_vids, ps;

  RETURN QUERY SELECT cur_imgs, cur_vids, ps;
END;
$$;

REVOKE ALL ON FUNCTION public.increment_premium_usage(text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.increment_premium_usage(text) TO authenticated, service_role;