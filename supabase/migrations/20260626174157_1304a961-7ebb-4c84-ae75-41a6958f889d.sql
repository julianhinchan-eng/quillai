CREATE TABLE public.premium_usage (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  period_start date NOT NULL,
  images_generated integer NOT NULL DEFAULT 0,
  videos_generated integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, period_start),
  CHECK (images_generated >= 0 AND videos_generated >= 0)
);

GRANT SELECT, INSERT, UPDATE ON public.premium_usage TO authenticated;
GRANT ALL ON public.premium_usage TO service_role;

ALTER TABLE public.premium_usage ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users view own usage" ON public.premium_usage
  FOR SELECT TO authenticated USING (auth.uid() = user_id);

CREATE POLICY "Users insert own usage" ON public.premium_usage
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users update own usage" ON public.premium_usage
  FOR UPDATE TO authenticated
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE TRIGGER update_premium_usage_updated_at
  BEFORE UPDATE ON public.premium_usage
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Atomic increment with monthly limit enforcement
CREATE OR REPLACE FUNCTION public.increment_premium_usage(_user_id uuid, _kind text)
RETURNS TABLE(images_generated int, videos_generated int, period_start date)
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  ps date := date_trunc('month', now() AT TIME ZONE 'UTC')::date;
  cur_imgs int := 0;
  cur_vids int := 0;
  img_limit constant int := 100;
  vid_limit constant int := 15;
BEGIN
  IF _kind NOT IN ('image','video') THEN
    RAISE EXCEPTION 'bad kind';
  END IF;

  INSERT INTO public.premium_usage(user_id, period_start, images_generated, videos_generated)
  VALUES (_user_id, ps, 0, 0)
  ON CONFLICT (user_id, period_start) DO NOTHING;

  SELECT pu.images_generated, pu.videos_generated INTO cur_imgs, cur_vids
  FROM public.premium_usage pu
  WHERE pu.user_id = _user_id AND pu.period_start = ps
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
  WHERE pu.user_id = _user_id AND pu.period_start = ps
  RETURNING pu.images_generated, pu.videos_generated, pu.period_start
  INTO cur_imgs, cur_vids, ps;

  RETURN QUERY SELECT cur_imgs, cur_vids, ps;
END;
$$;

REVOKE ALL ON FUNCTION public.increment_premium_usage(uuid, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.increment_premium_usage(uuid, text) TO authenticated, service_role;