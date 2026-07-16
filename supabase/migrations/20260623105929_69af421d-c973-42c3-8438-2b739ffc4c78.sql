CREATE OR REPLACE FUNCTION public.get_or_create_conversation(_other_user uuid)
RETURNS uuid
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path TO 'public'
AS $function$
DECLARE
  me uuid := auth.uid();
  a uuid;
  b uuid;
  conv_id uuid;
BEGIN
  IF me IS NULL THEN RAISE EXCEPTION 'Not authenticated'; END IF;
  IF _other_user IS NULL OR _other_user = me THEN RAISE EXCEPTION 'Invalid recipient'; END IF;
  IF me < _other_user THEN a := me; b := _other_user; ELSE a := _other_user; b := me; END IF;

  SELECT id INTO conv_id FROM public.conversations WHERE user_a = a AND user_b = b;
  IF conv_id IS NULL THEN
    INSERT INTO public.conversations(user_a, user_b) VALUES (a, b) RETURNING id INTO conv_id;
  END IF;
  RETURN conv_id;
END;
$function$;