-- ============ 1. PSEUDO + TELEPHONE UNIQUES ============
CREATE OR REPLACE FUNCTION public.normalize_phone(_phone text)
RETURNS text LANGUAGE sql IMMUTABLE SET search_path = public AS $$
  SELECT CASE
    WHEN _phone IS NULL OR btrim(_phone) = '' THEN NULL
    WHEN regexp_replace(_phone, '\D', '', 'g') = '' THEN NULL
    WHEN left(regexp_replace(_phone, '\D', '', 'g'), 2) = '33'
      AND length(regexp_replace(_phone, '\D', '', 'g')) = 11
      THEN '+' || regexp_replace(_phone, '\D', '', 'g')
    WHEN left(regexp_replace(_phone, '\D', '', 'g'), 1) = '0'
      AND length(regexp_replace(_phone, '\D', '', 'g')) = 10
      THEN '+33' || substr(regexp_replace(_phone, '\D', '', 'g'), 2)
    ELSE '+' || regexp_replace(_phone, '\D', '', 'g')
  END;
$$;

CREATE OR REPLACE FUNCTION public.normalize_username(_username text)
RETURNS text LANGUAGE sql IMMUTABLE SET search_path = public AS $$
  SELECT NULLIF(lower(regexp_replace(COALESCE(_username, ''), '[^A-Za-z0-9_.]', '', 'g')), '');
$$;

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS username text,
  ADD COLUMN IF NOT EXISTS phone_e164 text;

UPDATE public.profiles
SET username = COALESCE(username, 'membre_' || substr(replace(id::text, '-', ''), 1, 8)),
    phone_e164 = COALESCE(phone_e164, public.normalize_phone(phone));

ALTER TABLE public.profiles ALTER COLUMN username SET NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS profiles_username_unique ON public.profiles (lower(username));
CREATE UNIQUE INDEX IF NOT EXISTS profiles_phone_unique ON public.profiles (phone_e164) WHERE phone_e164 IS NOT NULL;

CREATE OR REPLACE FUNCTION public.profiles_normalize()
RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$
BEGIN
  NEW.username := COALESCE(public.normalize_username(NEW.username), 'membre_' || substr(replace(NEW.id::text, '-', ''), 1, 8));
  IF length(NEW.username) < 3 THEN
    RAISE EXCEPTION 'USERNAME_TOO_SHORT';
  END IF;
  NEW.phone_e164 := public.normalize_phone(NEW.phone);
  RETURN NEW;
END; $$;

DROP TRIGGER IF EXISTS trg_profiles_normalize ON public.profiles;
CREATE TRIGGER trg_profiles_normalize BEFORE INSERT OR UPDATE ON public.profiles
FOR EACH ROW EXECUTE FUNCTION public.profiles_normalize();

CREATE OR REPLACE FUNCTION public.signup_availability(_username text, _phone text)
RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
DECLARE u text := public.normalize_username(_username); p text := public.normalize_phone(_phone);
BEGIN
  RETURN jsonb_build_object(
    'username_valid', u IS NOT NULL AND length(u) >= 3,
    'username_available', u IS NULL OR NOT EXISTS (SELECT 1 FROM public.profiles WHERE lower(username) = u),
    'phone_available', p IS NULL OR NOT EXISTS (SELECT 1 FROM public.profiles WHERE phone_e164 = p),
    'normalized_username', u,
    'normalized_phone', p
  );
END; $$;
REVOKE ALL ON FUNCTION public.signup_availability(text, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.signup_availability(text, text) TO anon, authenticated, service_role;

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  meta jsonb := COALESCE(NEW.raw_user_meta_data, '{}'::jsonb);
  _first text := btrim(COALESCE(meta->>'first_name',''));
  _last text := btrim(COALESCE(meta->>'last_name',''));
  _display text := COALESCE(NULLIF(btrim(COALESCE(meta->>'display_name','')),''), NULLIF(_first,''), split_part(NEW.email,'@',1));
  _username text := public.normalize_username(COALESCE(meta->>'username', split_part(NEW.email,'@',1)));
BEGIN
  IF _username IS NULL OR length(_username) < 3 THEN
    _username := 'membre_' || substr(replace(NEW.id::text, '-', ''), 1, 8);
  END IF;
  IF EXISTS (SELECT 1 FROM public.profiles WHERE lower(username) = _username) THEN
    _username := _username || substr(replace(NEW.id::text, '-', ''), 1, 4);
  END IF;

  INSERT INTO public.profiles (id, display_name, username, first_name, last_name, phone, address_line1, postal_code, city_name, accepted_terms_at)
  VALUES (
    NEW.id, _display, _username, _first, _last,
    NULLIF(btrim(COALESCE(meta->>'phone','')),''),
    NULLIF(btrim(COALESCE(meta->>'address_line1','')),''),
    NULLIF(btrim(COALESCE(meta->>'postal_code','')),''),
    NULLIF(btrim(COALESCE(meta->>'city_name','')),''),
    now()
  )
  ON CONFLICT (id) DO NOTHING;

  INSERT INTO public.user_roles (user_id, role) VALUES (NEW.id, 'client') ON CONFLICT DO NOTHING;
  IF COALESCE(meta->>'account_type','') = 'pro' THEN
    INSERT INTO public.user_roles (user_id, role) VALUES (NEW.id, 'merchant') ON CONFLICT DO NOTHING;
  END IF;

  INSERT INTO public.subscriptions (user_id, plan, status)
  VALUES (NEW.id, NULL, 'NONE')
  ON CONFLICT DO NOTHING;

  RETURN NEW;
END; $$;

-- ============ 2. POINTS : SOLDE VS CUMUL A VIE ============
CREATE OR REPLACE FUNCTION public.get_lifetime_xp(_user_id uuid)
RETURNS integer LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT COALESCE(SUM(amount),0)::int FROM public.points_transactions WHERE user_id = _user_id AND amount > 0;
$$;
REVOKE ALL ON FUNCTION public.get_lifetime_xp(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_lifetime_xp(uuid) TO authenticated, service_role;

-- ============ 3. CADEAUX FIDELITE ============
CREATE TYPE public.reward_kind AS ENUM ('COUPON', 'SHIPPED');
CREATE TYPE public.reward_status AS ENUM ('READY', 'USED', 'PENDING_SHIPMENT', 'SHIPPED', 'CANCELED');

CREATE TABLE public.rewards (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  description text,
  image_url text,
  cost_points integer NOT NULL CHECK (cost_points > 0),
  kind public.reward_kind NOT NULL DEFAULT 'COUPON',
  stock integer,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.rewards TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.rewards TO authenticated;
GRANT ALL ON public.rewards TO service_role;
ALTER TABLE public.rewards ENABLE ROW LEVEL SECURITY;
CREATE POLICY "rewards_public_read" ON public.rewards FOR SELECT TO anon, authenticated USING (is_active OR public.is_admin());
CREATE POLICY "rewards_admin_write" ON public.rewards FOR ALL TO authenticated USING (public.is_admin()) WITH CHECK (public.is_admin());
CREATE TRIGGER trg_rewards_updated BEFORE UPDATE ON public.rewards FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TABLE public.reward_redemptions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  reward_id uuid NOT NULL REFERENCES public.rewards(id),
  reward_name text NOT NULL,
  cost_points integer NOT NULL,
  kind public.reward_kind NOT NULL,
  status public.reward_status NOT NULL,
  code text UNIQUE,
  shipping_info jsonb NOT NULL DEFAULT '{}'::jsonb,
  consumed_at timestamptz,
  consumed_by uuid REFERENCES auth.users(id),
  merchant_id uuid REFERENCES public.merchants(id),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.reward_redemptions TO authenticated;
GRANT ALL ON public.reward_redemptions TO service_role;
ALTER TABLE public.reward_redemptions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "reward_redemptions_own_read" ON public.reward_redemptions FOR SELECT TO authenticated
  USING (user_id = auth.uid() OR public.is_admin());
CREATE TRIGGER trg_reward_redemptions_updated BEFORE UPDATE ON public.reward_redemptions
FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE INDEX ON public.reward_redemptions (user_id, created_at DESC);

CREATE OR REPLACE FUNCTION public.redeem_reward(_reward_id uuid)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, extensions AS $$
DECLARE uid uuid := auth.uid(); r public.rewards; prof public.profiles; balance int;
        new_code text; new_status public.reward_status; red_id uuid;
BEGIN
  IF uid IS NULL THEN RETURN jsonb_build_object('ok', false, 'code', 'AUTH_REQUIRED'); END IF;
  SELECT * INTO prof FROM public.profiles WHERE id = uid;
  IF prof IS NULL OR prof.status <> 'ACTIVE' THEN RETURN jsonb_build_object('ok', false, 'code', 'ACCOUNT_SUSPENDED'); END IF;

  SELECT * INTO r FROM public.rewards WHERE id = _reward_id FOR UPDATE;
  IF r IS NULL OR NOT r.is_active THEN RETURN jsonb_build_object('ok', false, 'code', 'REWARD_UNAVAILABLE'); END IF;
  IF r.stock IS NOT NULL AND r.stock <= 0 THEN RETURN jsonb_build_object('ok', false, 'code', 'REWARD_OUT_OF_STOCK'); END IF;

  SELECT public.get_xp(uid) INTO balance;
  IF balance < r.cost_points THEN RETURN jsonb_build_object('ok', false, 'code', 'NOT_ENOUGH_POINTS'); END IF;

  IF r.kind = 'COUPON' THEN
    new_code := upper(encode(extensions.gen_random_bytes(6), 'hex'));
    new_status := 'READY';
  ELSE
    new_code := NULL;
    new_status := 'PENDING_SHIPMENT';
  END IF;

  INSERT INTO public.reward_redemptions (user_id, reward_id, reward_name, cost_points, kind, status, code, shipping_info)
  VALUES (uid, r.id, r.name, r.cost_points, r.kind, new_status, new_code,
    CASE WHEN r.kind = 'SHIPPED' THEN jsonb_build_object(
      'first_name', prof.first_name, 'last_name', prof.last_name, 'phone', prof.phone,
      'address_line1', prof.address_line1, 'postal_code', prof.postal_code, 'city_name', prof.city_name
    ) ELSE '{}'::jsonb END)
  RETURNING id INTO red_id;

  INSERT INTO public.points_transactions (user_id, amount, reason)
  VALUES (uid, -r.cost_points, 'reward_redeemed');

  IF r.stock IS NOT NULL THEN
    UPDATE public.rewards SET stock = stock - 1 WHERE id = r.id;
  END IF;

  IF r.kind = 'SHIPPED' THEN
    INSERT INTO public.notifications (user_id, kind, title, body)
    SELECT ur.user_id, 'reward_request', 'Cadeau à expédier',
           r.name || ' — ' || COALESCE(prof.first_name,'') || ' ' || COALESCE(prof.last_name,'')
    FROM public.user_roles ur WHERE ur.role = 'admin';
  END IF;

  INSERT INTO public.audit_logs (actor_id, action, resource_type, resource_id, result, context)
  VALUES (uid, 'reward.redeemed', 'reward', r.id, 'ok', jsonb_build_object('redemption_id', red_id, 'cost', r.cost_points));

  RETURN jsonb_build_object('ok', true, 'id', red_id, 'code', new_code, 'status', new_status, 'kind', r.kind);
END; $$;
REVOKE ALL ON FUNCTION public.redeem_reward(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.redeem_reward(uuid) TO authenticated, service_role;

CREATE OR REPLACE FUNCTION public.validate_reward_coupon(_code text)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE uid uuid := auth.uid(); rr public.reward_redemptions; prof public.profiles; mid uuid;
BEGIN
  IF uid IS NULL THEN RETURN jsonb_build_object('ok', false, 'code', 'AUTH_REQUIRED'); END IF;

  SELECT m.id INTO mid FROM public.merchants m
  WHERE m.status = 'APPROVED' AND (m.owner_id = uid OR public.is_merchant_member(m.id))
  LIMIT 1;
  IF mid IS NULL AND NOT public.is_admin() THEN
    RETURN jsonb_build_object('ok', false, 'code', 'NOT_A_MERCHANT');
  END IF;

  SELECT * INTO rr FROM public.reward_redemptions WHERE code = upper(btrim(_code)) FOR UPDATE;
  IF rr IS NULL THEN RETURN jsonb_build_object('ok', false, 'code', 'INVALID_TOKEN'); END IF;
  IF rr.status <> 'READY' THEN RETURN jsonb_build_object('ok', false, 'code', 'ALREADY_USED'); END IF;

  UPDATE public.reward_redemptions
  SET status = 'USED', consumed_at = now(), consumed_by = uid, merchant_id = mid
  WHERE id = rr.id AND status = 'READY';
  IF NOT FOUND THEN RETURN jsonb_build_object('ok', false, 'code', 'ALREADY_USED'); END IF;

  SELECT * INTO prof FROM public.profiles WHERE id = rr.user_id;

  INSERT INTO public.audit_logs (actor_id, action, resource_type, resource_id, result, context)
  VALUES (uid, 'reward.validated', 'reward', rr.reward_id, 'ok', jsonb_build_object('redemption_id', rr.id));

  RETURN jsonb_build_object('ok', true, 'reward_name', rr.reward_name,
    'customer_name', COALESCE(prof.display_name, 'Membre METZY'), 'validated_at', now());
END; $$;
REVOKE ALL ON FUNCTION public.validate_reward_coupon(text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.validate_reward_coupon(text) TO authenticated, service_role;

CREATE OR REPLACE FUNCTION public.admin_set_reward_shipped(_redemption_id uuid)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NOT public.is_admin() THEN RETURN jsonb_build_object('ok', false, 'code', 'FORBIDDEN'); END IF;
  UPDATE public.reward_redemptions SET status = 'SHIPPED' WHERE id = _redemption_id AND status = 'PENDING_SHIPMENT';
  IF NOT FOUND THEN RETURN jsonb_build_object('ok', false, 'code', 'INVALID_STATE'); END IF;
  INSERT INTO public.audit_logs (actor_id, action, resource_type, resource_id, result)
  VALUES (auth.uid(), 'reward.shipped', 'reward_redemption', _redemption_id, 'ok');
  RETURN jsonb_build_object('ok', true);
END; $$;
REVOKE ALL ON FUNCTION public.admin_set_reward_shipped(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.admin_set_reward_shipped(uuid) TO authenticated, service_role;

-- ============ 4. AMIS ============
CREATE TYPE public.friendship_status AS ENUM ('PENDING', 'ACCEPTED', 'DECLINED');

CREATE TABLE public.friendships (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  requester_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  addressee_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  status public.friendship_status NOT NULL DEFAULT 'PENDING',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CHECK (requester_id <> addressee_id),
  UNIQUE (requester_id, addressee_id)
);
GRANT SELECT ON public.friendships TO authenticated;
GRANT ALL ON public.friendships TO service_role;
ALTER TABLE public.friendships ENABLE ROW LEVEL SECURITY;
CREATE POLICY "friendships_own_read" ON public.friendships FOR SELECT TO authenticated
  USING (requester_id = auth.uid() OR addressee_id = auth.uid());
CREATE TRIGGER trg_friendships_updated BEFORE UPDATE ON public.friendships
FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE OR REPLACE FUNCTION public.search_members(_query text)
RETURNS TABLE(id uuid, username text, display_name text)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT p.id, p.username, p.display_name
  FROM public.profiles p
  WHERE auth.uid() IS NOT NULL
    AND p.status = 'ACTIVE'
    AND p.id <> auth.uid()
    AND length(btrim(COALESCE(_query, ''))) >= 3
    AND lower(p.username) LIKE lower(btrim(_query)) || '%'
  ORDER BY p.username
  LIMIT 10;
$$;
REVOKE ALL ON FUNCTION public.search_members(text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.search_members(text) TO authenticated, service_role;

CREATE OR REPLACE FUNCTION public.send_friend_request(_username text)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE uid uuid := auth.uid(); target uuid; u text := public.normalize_username(_username); existing public.friendships;
BEGIN
  IF uid IS NULL THEN RETURN jsonb_build_object('ok', false, 'code', 'AUTH_REQUIRED'); END IF;
  IF u IS NULL OR length(u) < 3 THEN RETURN jsonb_build_object('ok', false, 'code', 'INVALID_USERNAME'); END IF;

  SELECT id INTO target FROM public.profiles WHERE lower(username) = u AND status = 'ACTIVE';
  IF target IS NULL THEN RETURN jsonb_build_object('ok', false, 'code', 'MEMBER_NOT_FOUND'); END IF;
  IF target = uid THEN RETURN jsonb_build_object('ok', false, 'code', 'SELF_REQUEST'); END IF;

  SELECT * INTO existing FROM public.friendships
  WHERE (requester_id = uid AND addressee_id = target) OR (requester_id = target AND addressee_id = uid);

  IF existing.id IS NOT NULL THEN
    IF existing.status = 'ACCEPTED' THEN RETURN jsonb_build_object('ok', false, 'code', 'ALREADY_FRIENDS'); END IF;
    IF existing.status = 'PENDING' THEN
      IF existing.requester_id = target THEN
        UPDATE public.friendships SET status = 'ACCEPTED' WHERE id = existing.id;
        RETURN jsonb_build_object('ok', true, 'status', 'ACCEPTED');
      END IF;
      RETURN jsonb_build_object('ok', false, 'code', 'ALREADY_PENDING');
    END IF;
    UPDATE public.friendships SET requester_id = uid, addressee_id = target, status = 'PENDING' WHERE id = existing.id;
    RETURN jsonb_build_object('ok', true, 'status', 'PENDING');
  END IF;

  INSERT INTO public.friendships (requester_id, addressee_id, status) VALUES (uid, target, 'PENDING');
  INSERT INTO public.notifications (user_id, kind, title, body)
  VALUES (target, 'friend_request', 'Nouvelle demande d''ami',
          (SELECT '@' || username || ' souhaite t''ajouter' FROM public.profiles WHERE id = uid));
  RETURN jsonb_build_object('ok', true, 'status', 'PENDING');
END; $$;
REVOKE ALL ON FUNCTION public.send_friend_request(text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.send_friend_request(text) TO authenticated, service_role;

CREATE OR REPLACE FUNCTION public.respond_friend_request(_request_id uuid, _accept boolean)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE uid uuid := auth.uid();
BEGIN
  IF uid IS NULL THEN RETURN jsonb_build_object('ok', false, 'code', 'AUTH_REQUIRED'); END IF;
  UPDATE public.friendships
  SET status = CASE WHEN _accept THEN 'ACCEPTED'::public.friendship_status ELSE 'DECLINED'::public.friendship_status END
  WHERE id = _request_id AND addressee_id = uid AND status = 'PENDING';
  IF NOT FOUND THEN RETURN jsonb_build_object('ok', false, 'code', 'REQUEST_NOT_FOUND'); END IF;
  RETURN jsonb_build_object('ok', true);
END; $$;
REVOKE ALL ON FUNCTION public.respond_friend_request(uuid, boolean) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.respond_friend_request(uuid, boolean) TO authenticated, service_role;

CREATE OR REPLACE FUNCTION public.remove_friend(_friend_id uuid)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE uid uuid := auth.uid();
BEGIN
  IF uid IS NULL THEN RETURN jsonb_build_object('ok', false, 'code', 'AUTH_REQUIRED'); END IF;
  DELETE FROM public.friendships
  WHERE (requester_id = uid AND addressee_id = _friend_id) OR (requester_id = _friend_id AND addressee_id = uid);
  RETURN jsonb_build_object('ok', true);
END; $$;
REVOKE ALL ON FUNCTION public.remove_friend(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.remove_friend(uuid) TO authenticated, service_role;

CREATE OR REPLACE FUNCTION public.my_friends()
RETURNS TABLE(friendship_id uuid, friend_id uuid, username text, display_name text, xp integer, level_name text)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT f.id,
         p.id,
         p.username,
         p.display_name,
         public.get_lifetime_xp(p.id),
         (SELECT l.name FROM public.levels l WHERE l.min_xp <= public.get_lifetime_xp(p.id) ORDER BY l.min_xp DESC LIMIT 1)
  FROM public.friendships f
  JOIN public.profiles p
    ON p.id = CASE WHEN f.requester_id = auth.uid() THEN f.addressee_id ELSE f.requester_id END
  WHERE auth.uid() IS NOT NULL
    AND f.status = 'ACCEPTED'
    AND (f.requester_id = auth.uid() OR f.addressee_id = auth.uid())
  ORDER BY public.get_lifetime_xp(p.id) DESC;
$$;
REVOKE ALL ON FUNCTION public.my_friends() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.my_friends() TO authenticated, service_role;

CREATE OR REPLACE FUNCTION public.my_friend_requests()
RETURNS TABLE(request_id uuid, from_user_id uuid, username text, display_name text, created_at timestamptz)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT f.id, p.id, p.username, p.display_name, f.created_at
  FROM public.friendships f
  JOIN public.profiles p ON p.id = f.requester_id
  WHERE auth.uid() IS NOT NULL AND f.addressee_id = auth.uid() AND f.status = 'PENDING'
  ORDER BY f.created_at DESC;
$$;
REVOKE ALL ON FUNCTION public.my_friend_requests() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.my_friend_requests() TO authenticated, service_role;

-- Cadeaux de démarrage
INSERT INTO public.rewards (name, description, cost_points, kind, stock, is_active) VALUES
  ('Café offert chez un partenaire', 'Présente ton coupon dans n''importe quel commerce partenaire METZY.', 200, 'COUPON', NULL, true),
  ('Dessert offert', 'Un dessert offert dans un commerce partenaire METZY.', 350, 'COUPON', NULL, true),
  ('Tote bag METZY', 'Le tote bag officiel METZY, envoyé chez toi.', 1200, 'SHIPPED', 50, true);
