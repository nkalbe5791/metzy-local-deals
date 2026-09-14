-- 1) Nouveaux comptes : essai gratuit de 14 jours
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  INSERT INTO public.profiles (id, display_name, accepted_terms_at)
  VALUES (NEW.id, COALESCE(NEW.raw_user_meta_data->>'display_name', split_part(NEW.email,'@',1)), now())
  ON CONFLICT (id) DO NOTHING;
  INSERT INTO public.user_roles (user_id, role) VALUES (NEW.id, 'client') ON CONFLICT DO NOTHING;
  INSERT INTO public.subscriptions (user_id, plan, status, current_period_end)
  VALUES (NEW.id, 'TRIAL', 'TRIALING', now() + interval '14 days')
  ON CONFLICT DO NOTHING;
  RETURN NEW;
END; $function$;

-- 2) Comptes existants sans abonnement actif : même essai
UPDATE public.subscriptions
SET plan = 'TRIAL', status = 'TRIALING', current_period_end = now() + interval '14 days', updated_at = now()
WHERE status = 'NONE';

-- 3) Un essai expiré ne permet plus de générer de QR
CREATE OR REPLACE FUNCTION public.create_redemption_token(_offer_id uuid)
RETURNS TABLE(token text, expires_at timestamp with time zone)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE uid uuid := auth.uid(); o public.offers; m public.merchants; sub public.subscriptions;
        prof public.profiles; new_token text; exp timestamptz;
BEGIN
  IF uid IS NULL THEN RAISE EXCEPTION 'AUTH_REQUIRED'; END IF;
  SELECT * INTO prof FROM public.profiles WHERE id = uid;
  IF prof.status <> 'ACTIVE' THEN RAISE EXCEPTION 'ACCOUNT_SUSPENDED'; END IF;
  SELECT * INTO sub FROM public.subscriptions WHERE user_id = uid;
  IF sub IS NULL OR sub.status NOT IN ('ACTIVE','TRIALING') THEN RAISE EXCEPTION 'SUBSCRIPTION_REQUIRED'; END IF;
  IF sub.current_period_end IS NOT NULL AND sub.current_period_end <= now() THEN
    RAISE EXCEPTION 'SUBSCRIPTION_REQUIRED';
  END IF;
  SELECT * INTO o FROM public.offers WHERE id = _offer_id;
  IF o IS NULL OR o.status <> 'ACTIVE' THEN RAISE EXCEPTION 'OFFER_UNAVAILABLE'; END IF;
  IF now() < o.starts_at OR now() > o.ends_at THEN RAISE EXCEPTION 'OFFER_EXPIRED'; END IF;
  SELECT * INTO m FROM public.merchants WHERE id = o.merchant_id;
  IF m IS NULL OR m.status <> 'APPROVED' THEN RAISE EXCEPTION 'MERCHANT_UNAVAILABLE'; END IF;
  IF NOT public.can_use_offer(uid, _offer_id) THEN RAISE EXCEPTION 'LIMIT_REACHED'; END IF;

  DELETE FROM public.redemption_tokens
    WHERE user_id = uid AND offer_id = _offer_id AND consumed_at IS NULL;

  new_token := encode(gen_random_bytes(24), 'hex');
  exp := now() + interval '3 minutes';
  INSERT INTO public.redemption_tokens (token, user_id, offer_id, expires_at)
  VALUES (new_token, uid, _offer_id, exp);
  INSERT INTO public.audit_logs (actor_id, action, resource_type, resource_id, result)
  VALUES (uid, 'redemption_token.created', 'offer', _offer_id, 'ok');
  RETURN QUERY SELECT new_token, exp;
END; $function$;

-- 4) Une validation refuse aussi un essai expiré
CREATE OR REPLACE FUNCTION public.validate_redemption(_token text)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE uid uuid := auth.uid(); t public.redemption_tokens; o public.offers; m public.merchants;
        sub public.subscriptions; prof public.profiles; red_id uuid; err text;
BEGIN
  IF uid IS NULL THEN RETURN jsonb_build_object('ok',false,'code','AUTH_REQUIRED'); END IF;

  SELECT * INTO t FROM public.redemption_tokens WHERE token = _token FOR UPDATE;
  IF t IS NULL THEN
    INSERT INTO public.fraud_events (user_id, event_type, risk, reason)
    VALUES (uid, 'scan.invalid_token', 'MEDIUM', 'Jeton inconnu');
    RETURN jsonb_build_object('ok',false,'code','INVALID_TOKEN');
  END IF;

  SELECT * INTO o FROM public.offers WHERE id = t.offer_id;
  SELECT * INTO m FROM public.merchants WHERE id = o.merchant_id;

  IF NOT (public.is_merchant_member(m.id) OR public.is_admin()) THEN
    INSERT INTO public.fraud_events (user_id, merchant_id, event_type, risk, reason)
    VALUES (uid, m.id, 'scan.wrong_merchant', 'HIGH', 'Scan par un commerce non autorisé');
    RETURN jsonb_build_object('ok',false,'code','WRONG_MERCHANT');
  END IF;

  err := NULL;
  IF t.consumed_at IS NOT NULL THEN err := 'ALREADY_USED';
  ELSIF t.expires_at <= now() THEN err := 'TOKEN_EXPIRED';
  ELSIF m.status <> 'APPROVED' THEN err := 'MERCHANT_SUSPENDED';
  ELSIF o.status <> 'ACTIVE' THEN err := 'OFFER_INACTIVE';
  ELSIF now() < o.starts_at OR now() > o.ends_at THEN err := 'OFFER_EXPIRED';
  END IF;

  IF err IS NULL THEN
    SELECT * INTO prof FROM public.profiles WHERE id = t.user_id;
    SELECT * INTO sub FROM public.subscriptions WHERE user_id = t.user_id;
    IF prof IS NULL OR prof.status <> 'ACTIVE' THEN err := 'ACCOUNT_SUSPENDED';
    ELSIF sub IS NULL OR sub.status NOT IN ('ACTIVE','TRIALING') THEN err := 'SUBSCRIPTION_INVALID';
    ELSIF sub.current_period_end IS NOT NULL AND sub.current_period_end <= now() THEN err := 'SUBSCRIPTION_INVALID';
    ELSIF NOT public.can_use_offer(t.user_id, t.offer_id) THEN err := 'LIMIT_REACHED';
    END IF;
  END IF;

  IF err IS NOT NULL THEN
    INSERT INTO public.fraud_events (user_id, merchant_id, event_type, risk, reason)
    VALUES (t.user_id, m.id, 'scan.refused', CASE WHEN err='ALREADY_USED' THEN 'MEDIUM' ELSE 'LOW' END, err);
    INSERT INTO public.audit_logs (actor_id, action, resource_type, resource_id, result, context)
    VALUES (uid, 'redemption.refused', 'offer', o.id, err, jsonb_build_object('token_id', t.id));
    RETURN jsonb_build_object('ok',false,'code',err);
  END IF;

  UPDATE public.redemption_tokens SET consumed_at = now()
    WHERE id = t.id AND consumed_at IS NULL;
  IF NOT FOUND THEN
    RETURN jsonb_build_object('ok',false,'code','ALREADY_USED');
  END IF;

  INSERT INTO public.offer_redemptions (token_id, user_id, offer_id, merchant_id, validated_by, discount_label, xp_awarded)
  VALUES (t.id, t.user_id, t.offer_id, m.id, uid, o.discount_label, o.xp_reward)
  RETURNING id INTO red_id;

  INSERT INTO public.points_transactions (user_id, amount, reason, redemption_id)
  VALUES (t.user_id, o.xp_reward, 'offer_redeemed', red_id);

  INSERT INTO public.audit_logs (actor_id, action, resource_type, resource_id, result, context)
  VALUES (uid, 'redemption.validated', 'offer', o.id, 'ok', jsonb_build_object('redemption_id', red_id, 'user_id', t.user_id));

  SELECT * INTO prof FROM public.profiles WHERE id = t.user_id;
  RETURN jsonb_build_object(
    'ok', true,
    'offer_title', o.title,
    'discount_label', o.discount_label,
    'xp_awarded', o.xp_reward,
    'customer_name', prof.display_name,
    'validated_at', now()
  );
END; $function$;
