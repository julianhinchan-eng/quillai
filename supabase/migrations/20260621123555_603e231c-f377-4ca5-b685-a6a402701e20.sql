CREATE OR REPLACE FUNCTION public.remove_heart_on_thumbs()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  DELETE FROM public.likes WHERE post_id = NEW.post_id AND user_id = NEW.user_id;
  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.remove_thumbs_on_heart()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  DELETE FROM public.thumbs_up WHERE post_id = NEW.post_id AND user_id = NEW.user_id;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_thumbs_exclusive ON public.thumbs_up;
CREATE TRIGGER trg_thumbs_exclusive
BEFORE INSERT ON public.thumbs_up
FOR EACH ROW EXECUTE FUNCTION public.remove_heart_on_thumbs();

DROP TRIGGER IF EXISTS trg_heart_exclusive ON public.likes;
CREATE TRIGGER trg_heart_exclusive
BEFORE INSERT ON public.likes
FOR EACH ROW EXECUTE FUNCTION public.remove_thumbs_on_heart();