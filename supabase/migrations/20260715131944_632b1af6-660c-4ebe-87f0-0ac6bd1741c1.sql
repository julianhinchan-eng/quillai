
-- Lustify separate crypto wallet (Coinbase Commerce)
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS lustify_balance_cents integer NOT NULL DEFAULT 0;

CREATE TABLE IF NOT EXISTS public.lustify_ledger (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  delta_cents integer NOT NULL,
  reason text NOT NULL,
  ref text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (reason, ref)
);

GRANT SELECT ON public.lustify_ledger TO authenticated;
GRANT ALL ON public.lustify_ledger TO service_role;
ALTER TABLE public.lustify_ledger ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users read own lustify ledger"
  ON public.lustify_ledger FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE INDEX IF NOT EXISTS lustify_ledger_user_created_idx
  ON public.lustify_ledger(user_id, created_at DESC);

-- Idempotent credit from Coinbase Commerce webhook
CREATE OR REPLACE FUNCTION public.credit_lustify_balance(_user_id uuid, _cents integer, _ref text)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  new_balance int;
  inserted boolean;
BEGIN
  IF _cents <= 0 THEN RAISE EXCEPTION 'BAD_AMOUNT'; END IF;
  IF _user_id IS NULL THEN RAISE EXCEPTION 'BAD_USER'; END IF;

  BEGIN
    INSERT INTO public.lustify_ledger(user_id, delta_cents, reason, ref)
    VALUES (_user_id, _cents, 'topup_coinbase', _ref);
    inserted := true;
  EXCEPTION WHEN unique_violation THEN
    inserted := false;
  END;

  IF inserted THEN
    UPDATE public.profiles SET lustify_balance_cents = lustify_balance_cents + _cents, updated_at = now()
      WHERE id = _user_id RETURNING lustify_balance_cents INTO new_balance;
  ELSE
    SELECT lustify_balance_cents INTO new_balance FROM public.profiles WHERE id = _user_id;
  END IF;

  RETURN COALESCE(new_balance, 0);
END;
$$;

-- Consume 1 Lustify image (5 cents / 0.05 EUR)
CREATE OR REPLACE FUNCTION public.consume_lustify_image()
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  uid uuid := auth.uid();
  cost int := 5;
  bal int := 0;
BEGIN
  IF uid IS NULL THEN RAISE EXCEPTION 'NOT_AUTHENTICATED'; END IF;

  SELECT lustify_balance_cents INTO bal FROM public.profiles WHERE id = uid FOR UPDATE;
  IF COALESCE(bal, 0) < cost THEN RAISE EXCEPTION 'LUSTIFY_BALANCE_EMPTY'; END IF;

  UPDATE public.profiles SET lustify_balance_cents = lustify_balance_cents - cost, updated_at = now()
    WHERE id = uid RETURNING lustify_balance_cents INTO bal;

  INSERT INTO public.lustify_ledger(user_id, delta_cents, reason, ref)
    VALUES (uid, -cost, 'image_lustify', gen_random_uuid()::text);

  RETURN bal;
END;
$$;

CREATE OR REPLACE FUNCTION public.get_my_lustify_balance()
RETURNS integer
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COALESCE((SELECT lustify_balance_cents FROM public.profiles WHERE id = auth.uid()), 0);
$$;
