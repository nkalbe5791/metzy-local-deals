-- ============ AVIS / NOTES ============
CREATE TABLE public.merchant_reviews (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  merchant_id uuid NOT NULL REFERENCES public.merchants(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  rating smallint NOT NULL CHECK (rating BETWEEN 1 AND 5),
  comment text,
  author_name text NOT NULL DEFAULT 'Membre METZY',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (merchant_id, user_id)
);

CREATE INDEX idx_merchant_reviews_merchant ON public.merchant_reviews(merchant_id, created_at DESC);

GRANT SELECT ON public.merchant_reviews TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.merchant_reviews TO authenticated;
GRANT ALL ON public.merchant_reviews TO service_role;

ALTER TABLE public.merchant_reviews ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Avis des commerces approuvés visibles"
ON public.merchant_reviews FOR SELECT TO anon, authenticated
USING (EXISTS (SELECT 1 FROM public.merchants m WHERE m.id = merchant_id AND m.status = 'APPROVED'));

CREATE POLICY "Avis après utilisation d'une offre"
ON public.merchant_reviews FOR INSERT TO authenticated
WITH CHECK (
  user_id = auth.uid()
  AND EXISTS (
    SELECT 1 FROM public.offer_redemptions r
    WHERE r.user_id = auth.uid() AND r.merchant_id = merchant_reviews.merchant_id
  )
);

CREATE POLICY "Modifier son propre avis"
ON public.merchant_reviews FOR UPDATE TO authenticated
USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());

CREATE POLICY "Supprimer son avis ou modération admin"
ON public.merchant_reviews FOR DELETE TO authenticated
USING (user_id = auth.uid() OR public.is_admin());

CREATE TRIGGER trg_merchant_reviews_updated
BEFORE UPDATE ON public.merchant_reviews
FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE OR REPLACE FUNCTION public.merchant_reviews_set_author()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  SELECT COALESCE(NULLIF(btrim(p.display_name), ''), 'Membre METZY')
    INTO NEW.author_name
  FROM public.profiles p WHERE p.id = NEW.user_id;
  IF NEW.author_name IS NULL THEN NEW.author_name := 'Membre METZY'; END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_merchant_reviews_author
BEFORE INSERT ON public.merchant_reviews
FOR EACH ROW EXECUTE FUNCTION public.merchant_reviews_set_author();

CREATE OR REPLACE FUNCTION public.merchant_rating(_merchant_id uuid)
RETURNS TABLE(average numeric, total integer)
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT ROUND(AVG(rating)::numeric, 2), COUNT(*)::int
  FROM public.merchant_reviews WHERE merchant_id = _merchant_id;
$$;

REVOKE ALL ON FUNCTION public.merchant_rating(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.merchant_rating(uuid) TO anon, authenticated, service_role;

-- ============ NOTIFICATIONS ============
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS notify_new_offers boolean NOT NULL DEFAULT true;

CREATE TABLE public.notifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  kind text NOT NULL DEFAULT 'new_offer',
  title text NOT NULL,
  body text,
  offer_id uuid REFERENCES public.offers(id) ON DELETE CASCADE,
  merchant_id uuid REFERENCES public.merchants(id) ON DELETE CASCADE,
  read_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_notifications_user ON public.notifications(user_id, created_at DESC);

GRANT SELECT, UPDATE, DELETE ON public.notifications TO authenticated;
GRANT ALL ON public.notifications TO service_role;

ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Voir ses notifications"
ON public.notifications FOR SELECT TO authenticated
USING (user_id = auth.uid());

CREATE POLICY "Marquer ses notifications comme lues"
ON public.notifications FOR UPDATE TO authenticated
USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());

CREATE POLICY "Supprimer ses notifications"
ON public.notifications FOR DELETE TO authenticated
USING (user_id = auth.uid());

CREATE OR REPLACE FUNCTION public.notify_new_active_offer()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE m public.merchants;
BEGIN
  IF NEW.status <> 'ACTIVE' THEN RETURN NEW; END IF;
  IF TG_OP = 'UPDATE' AND OLD.status = 'ACTIVE' THEN RETURN NEW; END IF;
  IF now() > NEW.ends_at THEN RETURN NEW; END IF;

  SELECT * INTO m FROM public.merchants WHERE id = NEW.merchant_id;
  IF m IS NULL OR m.status <> 'APPROVED' THEN RETURN NEW; END IF;

  INSERT INTO public.notifications (user_id, kind, title, body, offer_id, merchant_id)
  SELECT p.id, 'new_offer',
         'Nouvelle offre près de toi',
         m.name || ' — ' || NEW.discount_label,
         NEW.id, m.id
  FROM public.profiles p
  WHERE p.notify_new_offers
    AND p.status = 'ACTIVE'
    AND (m.city_id IS NULL OR p.city_id IS NULL OR p.city_id = m.city_id)
    AND p.id <> m.owner_id;

  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_offers_notify
AFTER INSERT OR UPDATE OF status ON public.offers
FOR EACH ROW EXECUTE FUNCTION public.notify_new_active_offer();
