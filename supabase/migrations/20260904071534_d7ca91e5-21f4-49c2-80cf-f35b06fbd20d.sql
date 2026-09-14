CREATE OR REPLACE FUNCTION public.gen_short_code(_len int DEFAULT 6)
RETURNS text LANGUAGE plpgsql VOLATILE SECURITY DEFINER SET search_path TO 'public','extensions'
AS $function$
DECLARE alphabet text := 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; out_code text := ''; i int;
BEGIN
  FOR i IN 1.._len LOOP
    out_code := out_code || substr(alphabet, 1 + floor(random() * length(alphabet))::int, 1);
  END LOOP;
  RETURN out_code;
END; $function$;
REVOKE ALL ON FUNCTION public.gen_short_code(int) FROM PUBLIC, anon, authenticated;

CREATE OR REPLACE FUNCTION public.create_redemption_token(_offer_id uuid)
 RETURNS TABLE(token text, expires_at timestamp with time zone)
 LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public','extensions'
AS $function$
DECLARE uid uuid := auth.uid(); o public.offers; m public.merchants; sub public.subscriptions;
        prof public.profiles; new_token text; exp timestamptz; tries int := 0;
BEGIN
  IF uid IS NULL THEN RAISE EXCEPTION 'AUTH_REQUIRED'; END IF;
  SELECT * INTO prof FROM public.profiles WHERE id = uid;
  IF prof.status <> 'ACTIVE' THEN RAISE EXCEPTION 'ACCOUNT_SUSPENDED'; END IF;
  IF public.subscriptions_enforced() THEN
    SELECT * INTO sub FROM public.subscriptions WHERE user_id = uid;
    IF sub IS NULL OR sub.status NOT IN ('ACTIVE','TRIALING') THEN RAISE EXCEPTION 'SUBSCRIPTION_REQUIRED'; END IF;
    IF sub.current_period_end IS NOT NULL AND sub.current_period_end <= now() THEN
      RAISE EXCEPTION 'SUBSCRIPTION_REQUIRED';
    END IF;
  END IF;
  SELECT * INTO o FROM public.offers WHERE id = _offer_id;
  IF o IS NULL OR o.status <> 'ACTIVE' THEN RAISE EXCEPTION 'OFFER_UNAVAILABLE'; END IF;
  IF now() < o.starts_at OR now() > o.ends_at THEN RAISE EXCEPTION 'OFFER_EXPIRED'; END IF;
  SELECT * INTO m FROM public.merchants WHERE id = o.merchant_id;
  IF m IS NULL OR m.status <> 'APPROVED' THEN RAISE EXCEPTION 'MERCHANT_UNAVAILABLE'; END IF;
  IF NOT public.can_use_offer(uid, _offer_id) THEN RAISE EXCEPTION 'LIMIT_REACHED'; END IF;

  DELETE FROM public.redemption_tokens WHERE user_id = uid AND offer_id = _offer_id AND consumed_at IS NULL;
  DELETE FROM public.redemption_tokens WHERE consumed_at IS NULL AND expires_at <= now() - interval '1 hour';

  exp := now() + interval '3 minutes';
  LOOP
    tries := tries + 1;
    new_token := public.gen_short_code(6);
    EXIT WHEN NOT EXISTS (SELECT 1 FROM public.redemption_tokens WHERE token = new_token);
    IF tries > 40 THEN RAISE EXCEPTION 'TOKEN_GENERATION_FAILED'; END IF;
  END LOOP;

  INSERT INTO public.redemption_tokens (token, user_id, offer_id, expires_at)
  VALUES (new_token, uid, _offer_id, exp);
  INSERT INTO public.audit_logs (actor_id, action, resource_type, resource_id, result)
  VALUES (uid, 'redemption_token.created', 'offer', _offer_id, 'ok');
  RETURN QUERY SELECT new_token, exp;
END; $function$;
REVOKE ALL ON FUNCTION public.create_redemption_token(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.create_redemption_token(uuid) TO authenticated;
