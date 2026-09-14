-- ENUMS
CREATE TYPE public.app_role AS ENUM ('client','merchant','admin');
CREATE TYPE public.member_role AS ENUM ('OWNER','MANAGER','STAFF');
CREATE TYPE public.merchant_status AS ENUM ('PENDING','APPROVED','REJECTED','SUSPENDED');
CREATE TYPE public.offer_status AS ENUM ('DRAFT','PENDING_REVIEW','ACTIVE','PAUSED','EXPIRED','REJECTED');
CREATE TYPE public.limit_type AS ENUM ('ONCE','DAILY','WEEKLY','MONTHLY','UNLIMITED');
CREATE TYPE public.account_status AS ENUM ('ACTIVE','SUSPENDED');
CREATE TYPE public.sub_status AS ENUM ('NONE','ACTIVE','PAST_DUE','CANCELED','TRIALING');
CREATE TYPE public.risk_level AS ENUM ('LOW','MEDIUM','HIGH');

CREATE OR REPLACE FUNCTION public.set_updated_at() RETURNS TRIGGER
LANGUAGE plpgsql SET search_path = public AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END; $$;

-- CITIES
CREATE TABLE public.cities (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  code text NOT NULL UNIQUE,
  center_lat double precision,
  center_lng double precision,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.cities TO anon;
GRANT SELECT ON public.cities TO authenticated;
GRANT ALL ON public.cities TO service_role;
ALTER TABLE public.cities ENABLE ROW LEVEL SECURITY;

-- CATEGORIES
CREATE TABLE public.categories (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  code text NOT NULL UNIQUE,
  emoji text,
  is_active boolean NOT NULL DEFAULT true,
  position integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.categories TO anon;
GRANT SELECT ON public.categories TO authenticated;
GRANT ALL ON public.categories TO service_role;
ALTER TABLE public.categories ENABLE ROW LEVEL SECURITY;

-- PROFILES
CREATE TABLE public.profiles (
  id uuid PRIMARY KEY REFERENCES auth.users ON DELETE CASCADE,
  display_name text NOT NULL DEFAULT '',
  birth_date date,
  city_id uuid REFERENCES public.cities(id),
  referral_code text NOT NULL UNIQUE DEFAULT upper(substr(replace(gen_random_uuid()::text,'-',''),1,8)),
  referred_by uuid REFERENCES auth.users,
  status public.account_status NOT NULL DEFAULT 'ACTIVE',
  accepted_terms_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE ON public.profiles TO authenticated;
GRANT ALL ON public.profiles TO service_role;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
CREATE TRIGGER trg_profiles_updated BEFORE UPDATE ON public.profiles FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- USER ROLES
CREATE TABLE public.user_roles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users ON DELETE CASCADE,
  role public.app_role NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, role)
);
GRANT SELECT ON public.user_roles TO authenticated;
GRANT ALL ON public.user_roles TO service_role;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role public.app_role)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role = _role);
$$;

CREATE OR REPLACE FUNCTION public.is_admin() RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT public.has_role(auth.uid(), 'admin');
$$;

-- LEVELS
CREATE TABLE public.levels (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  min_xp integer NOT NULL,
  position integer NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.levels TO anon;
GRANT SELECT ON public.levels TO authenticated;
GRANT ALL ON public.levels TO service_role;
ALTER TABLE public.levels ENABLE ROW LEVEL SECURITY;

-- APP SETTINGS
CREATE TABLE public.app_settings (
  key text PRIMARY KEY,
  value jsonb NOT NULL,
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.app_settings TO anon;
GRANT SELECT ON public.app_settings TO authenticated;
GRANT ALL ON public.app_settings TO service_role;
ALTER TABLE public.app_settings ENABLE ROW LEVEL SECURITY;

-- SUBSCRIPTIONS (client)
CREATE TABLE public.subscriptions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL UNIQUE REFERENCES auth.users ON DELETE CASCADE,
  plan text,
  status public.sub_status NOT NULL DEFAULT 'NONE',
  stripe_customer_id text,
  stripe_subscription_id text,
  current_period_end timestamptz,
  cancel_at_period_end boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.subscriptions TO authenticated;
GRANT ALL ON public.subscriptions TO service_role;
ALTER TABLE public.subscriptions ENABLE ROW LEVEL SECURITY;

-- MERCHANTS
CREATE TABLE public.merchants (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id uuid NOT NULL REFERENCES auth.users ON DELETE CASCADE,
  name text NOT NULL,
  description text,
  logo_url text,
  photos text[] NOT NULL DEFAULT '{}',
  address text,
  city_id uuid REFERENCES public.cities(id),
  category_id uuid REFERENCES public.categories(id),
  lat double precision,
  lng double precision,
  opening_hours jsonb NOT NULL DEFAULT '{}'::jsonb,
  phone text,
  status public.merchant_status NOT NULL DEFAULT 'PENDING',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_merchants_city ON public.merchants(city_id);
CREATE INDEX idx_merchants_status ON public.merchants(status);
GRANT SELECT, INSERT, UPDATE ON public.merchants TO authenticated;
GRANT SELECT ON public.merchants TO anon;
GRANT ALL ON public.merchants TO service_role;
ALTER TABLE public.merchants ENABLE ROW LEVEL SECURITY;
CREATE TRIGGER trg_merchants_updated BEFORE UPDATE ON public.merchants FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- MERCHANT MEMBERS
CREATE TABLE public.merchant_members (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  merchant_id uuid NOT NULL REFERENCES public.merchants(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users ON DELETE CASCADE,
  role public.member_role NOT NULL DEFAULT 'STAFF',
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (merchant_id, user_id)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.merchant_members TO authenticated;
GRANT ALL ON public.merchant_members TO service_role;
ALTER TABLE public.merchant_members ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.is_merchant_member(_merchant_id uuid, _min_owner boolean DEFAULT false)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.merchant_members m
    WHERE m.merchant_id = _merchant_id AND m.user_id = auth.uid()
      AND (NOT _min_owner OR m.role IN ('OWNER','MANAGER'))
  );
$$;

-- MERCHANT SUBSCRIPTIONS
CREATE TABLE public.merchant_subscriptions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  merchant_id uuid NOT NULL UNIQUE REFERENCES public.merchants(id) ON DELETE CASCADE,
  plan text NOT NULL DEFAULT 'BUSINESS',
  status public.sub_status NOT NULL DEFAULT 'NONE',
  stripe_customer_id text,
  stripe_subscription_id text,
  current_period_end timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.merchant_subscriptions TO authenticated;
GRANT ALL ON public.merchant_subscriptions TO service_role;
ALTER TABLE public.merchant_subscriptions ENABLE ROW LEVEL SECURITY;

-- OFFERS
CREATE TABLE public.offers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  merchant_id uuid NOT NULL REFERENCES public.merchants(id) ON DELETE CASCADE,
  title text NOT NULL,
  description text,
  photo_url text,
  discount_label text NOT NULL,
  terms text,
  category_id uuid REFERENCES public.categories(id),
  starts_at timestamptz NOT NULL DEFAULT now(),
  ends_at timestamptz NOT NULL,
  limit_type public.limit_type NOT NULL DEFAULT 'ONCE',
  limit_count integer NOT NULL DEFAULT 1,
  xp_reward integer NOT NULL DEFAULT 100,
  status public.offer_status NOT NULL DEFAULT 'DRAFT',
  views_count integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_offers_merchant ON public.offers(merchant_id);
CREATE INDEX idx_offers_status ON public.offers(status);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.offers TO authenticated;
GRANT SELECT ON public.offers TO anon;
GRANT ALL ON public.offers TO service_role;
ALTER TABLE public.offers ENABLE ROW LEVEL SECURITY;
CREATE TRIGGER trg_offers_updated BEFORE UPDATE ON public.offers FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE OR REPLACE FUNCTION public.offers_validate_dates() RETURNS TRIGGER
LANGUAGE plpgsql SET search_path = public AS $$
BEGIN
  IF NEW.ends_at <= NEW.starts_at THEN
    RAISE EXCEPTION 'La date de fin doit être postérieure à la date de début';
  END IF;
  IF NEW.xp_reward < 0 OR NEW.xp_reward > 10000 THEN
    RAISE EXCEPTION 'Nombre de points invalide';
  END IF;
  RETURN NEW;
END; $$;
CREATE TRIGGER trg_offers_validate BEFORE INSERT OR UPDATE ON public.offers FOR EACH ROW EXECUTE FUNCTION public.offers_validate_dates();

-- REDEMPTION TOKENS
CREATE TABLE public.redemption_tokens (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  token text NOT NULL UNIQUE,
  user_id uuid NOT NULL REFERENCES auth.users ON DELETE CASCADE,
  offer_id uuid NOT NULL REFERENCES public.offers(id) ON DELETE CASCADE,
  expires_at timestamptz NOT NULL,
  consumed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_tokens_user ON public.redemption_tokens(user_id);
GRANT SELECT ON public.redemption_tokens TO authenticated;
GRANT ALL ON public.redemption_tokens TO service_role;
ALTER TABLE public.redemption_tokens ENABLE ROW LEVEL SECURITY;

-- OFFER REDEMPTIONS
CREATE TABLE public.offer_redemptions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  token_id uuid NOT NULL UNIQUE REFERENCES public.redemption_tokens(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users ON DELETE CASCADE,
  offer_id uuid NOT NULL REFERENCES public.offers(id) ON DELETE CASCADE,
  merchant_id uuid NOT NULL REFERENCES public.merchants(id) ON DELETE CASCADE,
  validated_by uuid REFERENCES auth.users,
  discount_label text NOT NULL,
  xp_awarded integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_red_user_offer ON public.offer_redemptions(user_id, offer_id, created_at DESC);
CREATE INDEX idx_red_merchant ON public.offer_redemptions(merchant_id, created_at DESC);
GRANT SELECT ON public.offer_redemptions TO authenticated;
GRANT ALL ON public.offer_redemptions TO service_role;
ALTER TABLE public.offer_redemptions ENABLE ROW LEVEL SECURITY;

-- POINTS TRANSACTIONS
CREATE TABLE public.points_transactions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users ON DELETE CASCADE,
  amount integer NOT NULL,
  reason text NOT NULL,
  redemption_id uuid UNIQUE REFERENCES public.offer_redemptions(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_points_user ON public.points_transactions(user_id);
GRANT SELECT ON public.points_transactions TO authenticated;
GRANT ALL ON public.points_transactions TO service_role;
ALTER TABLE public.points_transactions ENABLE ROW LEVEL SECURITY;

-- AUDIT LOGS
CREATE TABLE public.audit_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  actor_id uuid,
  action text NOT NULL,
  resource_type text,
  resource_id uuid,
  result text,
  context jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_audit_created ON public.audit_logs(created_at DESC);
GRANT SELECT ON public.audit_logs TO authenticated;
GRANT ALL ON public.audit_logs TO service_role;
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;

-- FRAUD EVENTS
CREATE TABLE public.fraud_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users ON DELETE SET NULL,
  merchant_id uuid REFERENCES public.merchants(id) ON DELETE SET NULL,
  event_type text NOT NULL,
  risk public.risk_level NOT NULL DEFAULT 'LOW',
  reason text,
  action_taken text,
  context jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_fraud_created ON public.fraud_events(created_at DESC);
GRANT SELECT ON public.fraud_events TO authenticated;
GRANT ALL ON public.fraud_events TO service_role;
ALTER TABLE public.fraud_events ENABLE ROW LEVEL SECURITY;

-- ============ POLICIES ============
CREATE POLICY "cities_public_read" ON public.cities FOR SELECT USING (true);
CREATE POLICY "cities_admin_all" ON public.cities FOR ALL TO authenticated USING (public.is_admin()) WITH CHECK (public.is_admin());

CREATE POLICY "categories_public_read" ON public.categories FOR SELECT USING (true);
CREATE POLICY "categories_admin_all" ON public.categories FOR ALL TO authenticated USING (public.is_admin()) WITH CHECK (public.is_admin());

CREATE POLICY "levels_public_read" ON public.levels FOR SELECT USING (true);
CREATE POLICY "levels_admin_all" ON public.levels FOR ALL TO authenticated USING (public.is_admin()) WITH CHECK (public.is_admin());

CREATE POLICY "settings_public_read" ON public.app_settings FOR SELECT USING (true);
CREATE POLICY "settings_admin_all" ON public.app_settings FOR ALL TO authenticated USING (public.is_admin()) WITH CHECK (public.is_admin());

CREATE POLICY "profiles_select_own" ON public.profiles FOR SELECT TO authenticated USING (id = auth.uid() OR public.is_admin());
CREATE POLICY "profiles_insert_own" ON public.profiles FOR INSERT TO authenticated WITH CHECK (id = auth.uid());
CREATE POLICY "profiles_update_own" ON public.profiles FOR UPDATE TO authenticated USING (id = auth.uid() OR public.is_admin()) WITH CHECK (id = auth.uid() OR public.is_admin());

CREATE POLICY "roles_select_own" ON public.user_roles FOR SELECT TO authenticated USING (user_id = auth.uid() OR public.is_admin());

CREATE POLICY "subs_select_own" ON public.subscriptions FOR SELECT TO authenticated USING (user_id = auth.uid() OR public.is_admin());

CREATE POLICY "merchants_public_read" ON public.merchants FOR SELECT USING (status = 'APPROVED');
CREATE POLICY "merchants_member_read" ON public.merchants FOR SELECT TO authenticated USING (owner_id = auth.uid() OR public.is_merchant_member(id) OR public.is_admin());
CREATE POLICY "merchants_insert_own" ON public.merchants FOR INSERT TO authenticated WITH CHECK (owner_id = auth.uid());
CREATE POLICY "merchants_update_owner" ON public.merchants FOR UPDATE TO authenticated USING (owner_id = auth.uid() OR public.is_admin()) WITH CHECK (owner_id = auth.uid() OR public.is_admin());

CREATE POLICY "members_read" ON public.merchant_members FOR SELECT TO authenticated USING (user_id = auth.uid() OR public.is_merchant_member(merchant_id) OR public.is_admin());
CREATE POLICY "members_owner_write" ON public.merchant_members FOR INSERT TO authenticated WITH CHECK (public.is_merchant_member(merchant_id, true) OR public.is_admin() OR user_id = auth.uid());
CREATE POLICY "members_owner_update" ON public.merchant_members FOR UPDATE TO authenticated USING (public.is_merchant_member(merchant_id, true) OR public.is_admin()) WITH CHECK (public.is_merchant_member(merchant_id, true) OR public.is_admin());
CREATE POLICY "members_owner_delete" ON public.merchant_members FOR DELETE TO authenticated USING (public.is_merchant_member(merchant_id, true) OR public.is_admin());

CREATE POLICY "msubs_read_member" ON public.merchant_subscriptions FOR SELECT TO authenticated USING (public.is_merchant_member(merchant_id, true) OR public.is_admin());

CREATE POLICY "offers_public_read" ON public.offers FOR SELECT USING (
  status = 'ACTIVE' AND EXISTS (SELECT 1 FROM public.merchants m WHERE m.id = offers.merchant_id AND m.status = 'APPROVED')
);
CREATE POLICY "offers_member_read" ON public.offers FOR SELECT TO authenticated USING (public.is_merchant_member(merchant_id) OR public.is_admin());
CREATE POLICY "offers_manager_insert" ON public.offers FOR INSERT TO authenticated WITH CHECK (public.is_merchant_member(merchant_id, true) OR public.is_admin());
CREATE POLICY "offers_manager_update" ON public.offers FOR UPDATE TO authenticated USING (public.is_merchant_member(merchant_id, true) OR public.is_admin()) WITH CHECK (public.is_merchant_member(merchant_id, true) OR public.is_admin());
CREATE POLICY "offers_manager_delete" ON public.offers FOR DELETE TO authenticated USING (public.is_merchant_member(merchant_id, true) OR public.is_admin());

CREATE POLICY "tokens_select_own" ON public.redemption_tokens FOR SELECT TO authenticated USING (user_id = auth.uid() OR public.is_admin());

CREATE POLICY "red_select_own" ON public.offer_redemptions FOR SELECT TO authenticated USING (
  user_id = auth.uid() OR public.is_merchant_member(merchant_id) OR public.is_admin()
);

CREATE POLICY "points_select_own" ON public.points_transactions FOR SELECT TO authenticated USING (user_id = auth.uid() OR public.is_admin());

CREATE POLICY "audit_admin_read" ON public.audit_logs FOR SELECT TO authenticated USING (public.is_admin());
CREATE POLICY "fraud_admin_read" ON public.fraud_events FOR SELECT TO authenticated USING (public.is_admin());

-- ============ CORE FUNCTIONS ============
CREATE OR REPLACE FUNCTION public.handle_new_user() RETURNS TRIGGER
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  INSERT INTO public.profiles (id, display_name, accepted_terms_at)
  VALUES (NEW.id, COALESCE(NEW.raw_user_meta_data->>'display_name', split_part(NEW.email,'@',1)), now())
  ON CONFLICT (id) DO NOTHING;
  INSERT INTO public.user_roles (user_id, role) VALUES (NEW.id, 'client') ON CONFLICT DO NOTHING;
  INSERT INTO public.subscriptions (user_id) VALUES (NEW.id) ON CONFLICT DO NOTHING;
  RETURN NEW;
END; $$;
CREATE TRIGGER on_auth_user_created AFTER INSERT ON auth.users FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

CREATE OR REPLACE FUNCTION public.get_xp(_user_id uuid)
RETURNS integer LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT COALESCE(SUM(amount),0)::int FROM public.points_transactions WHERE user_id = _user_id;
$$;

-- Checks whether a user may still use an offer given its limit rules
CREATE OR REPLACE FUNCTION public.can_use_offer(_user_id uuid, _offer_id uuid)
RETURNS boolean LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
DECLARE o public.offers; used integer;
BEGIN
  SELECT * INTO o FROM public.offers WHERE id = _offer_id;
  IF o IS NULL THEN RETURN false; END IF;
  IF o.limit_type = 'UNLIMITED' THEN RETURN true; END IF;
  SELECT count(*) INTO used FROM public.offer_redemptions r
   WHERE r.user_id = _user_id AND r.offer_id = _offer_id
     AND CASE o.limit_type
           WHEN 'ONCE' THEN true
           WHEN 'DAILY' THEN r.created_at >= date_trunc('day', now())
           WHEN 'WEEKLY' THEN r.created_at >= date_trunc('week', now())
           WHEN 'MONTHLY' THEN r.created_at >= date_trunc('month', now())
           ELSE true
         END;
  RETURN used < GREATEST(o.limit_count, 1);
END; $$;

-- Generates an opaque short-lived token. Server-side authority only.
CREATE OR REPLACE FUNCTION public.create_redemption_token(_offer_id uuid)
RETURNS TABLE (token text, expires_at timestamptz)
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE uid uuid := auth.uid(); o public.offers; m public.merchants; sub public.subscriptions;
        prof public.profiles; new_token text; exp timestamptz;
BEGIN
  IF uid IS NULL THEN RAISE EXCEPTION 'AUTH_REQUIRED'; END IF;
  SELECT * INTO prof FROM public.profiles WHERE id = uid;
  IF prof.status <> 'ACTIVE' THEN RAISE EXCEPTION 'ACCOUNT_SUSPENDED'; END IF;
  SELECT * INTO sub FROM public.subscriptions WHERE user_id = uid;
  IF sub IS NULL OR sub.status NOT IN ('ACTIVE','TRIALING') THEN RAISE EXCEPTION 'SUBSCRIPTION_REQUIRED'; END IF;
  SELECT * INTO o FROM public.offers WHERE id = _offer_id;
  IF o IS NULL OR o.status <> 'ACTIVE' THEN RAISE EXCEPTION 'OFFER_UNAVAILABLE'; END IF;
  IF now() < o.starts_at OR now() > o.ends_at THEN RAISE EXCEPTION 'OFFER_EXPIRED'; END IF;
  SELECT * INTO m FROM public.merchants WHERE id = o.merchant_id;
  IF m IS NULL OR m.status <> 'APPROVED' THEN RAISE EXCEPTION 'MERCHANT_UNAVAILABLE'; END IF;
  IF NOT public.can_use_offer(uid, _offer_id) THEN RAISE EXCEPTION 'LIMIT_REACHED'; END IF;

  UPDATE public.redemption_tokens SET consumed_at = consumed_at
    WHERE user_id = uid AND offer_id = _offer_id AND consumed_at IS NULL AND expires_at > now();
  DELETE FROM public.redemption_tokens
    WHERE user_id = uid AND offer_id = _offer_id AND consumed_at IS NULL;

  new_token := encode(gen_random_bytes(24), 'hex');
  exp := now() + interval '3 minutes';
  INSERT INTO public.redemption_tokens (token, user_id, offer_id, expires_at)
  VALUES (new_token, uid, _offer_id, exp);
  INSERT INTO public.audit_logs (actor_id, action, resource_type, resource_id, result)
  VALUES (uid, 'redemption_token.created', 'offer', _offer_id, 'ok');
  RETURN QUERY SELECT new_token, exp;
END; $$;

-- Atomic validation by the merchant. Single authority for consuming a discount.
CREATE OR REPLACE FUNCTION public.validate_redemption(_token text)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
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
END; $$;

REVOKE ALL ON FUNCTION public.create_redemption_token(uuid) FROM anon;
REVOKE ALL ON FUNCTION public.validate_redemption(text) FROM anon;
GRANT EXECUTE ON FUNCTION public.create_redemption_token(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.validate_redemption(text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_xp(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.can_use_offer(uuid, uuid) TO authenticated;

-- ============ SEED (référentiels) ============
INSERT INTO public.cities (name, code, center_lat, center_lng, is_active) VALUES
  ('Metz','metz',49.1193,6.1757,true),
  ('Nancy','nancy',48.6921,6.1844,false),
  ('Strasbourg','strasbourg',48.5734,7.7521,false);

INSERT INTO public.categories (name, code, emoji, position) VALUES
  ('Restaurants','restaurants','🍔',1),
  ('Sorties','sorties','🍹',2),
  ('Sport','sport','🏋️',3),
  ('Beauté','beaute','💇',4),
  ('Loisirs','loisirs','🎬',5),
  ('Shopping','shopping','🛍️',6);

INSERT INTO public.levels (name, min_xp, position) VALUES
  ('Curieux',0,1),('Habitué',1000,2),('Explorateur',3000,3);

INSERT INTO public.app_settings (key, value) VALUES
  ('client_plan_monthly_eur','5'::jsonb),
  ('client_plan_yearly_eur','39'::jsonb),
  ('merchant_plan_business_eur','50'::jsonb),
  ('offer_default_status','"PENDING_REVIEW"'::jsonb),
  ('token_ttl_seconds','180'::jsonb);
