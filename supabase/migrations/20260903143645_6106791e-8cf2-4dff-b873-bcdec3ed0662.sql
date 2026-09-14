CREATE TABLE public.offer_favorites (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  offer_id uuid not null references public.offers(id) on delete cascade,
  created_at timestamptz not null default now(),
  unique (user_id, offer_id)
);

GRANT SELECT, INSERT, DELETE ON public.offer_favorites TO authenticated;
GRANT ALL ON public.offer_favorites TO service_role;

ALTER TABLE public.offer_favorites ENABLE ROW LEVEL SECURITY;

CREATE POLICY favorites_select_own ON public.offer_favorites FOR SELECT TO authenticated USING (user_id = auth.uid());
CREATE POLICY favorites_insert_own ON public.offer_favorites FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid());
CREATE POLICY favorites_delete_own ON public.offer_favorites FOR DELETE TO authenticated USING (user_id = auth.uid());

CREATE INDEX offer_favorites_user_idx ON public.offer_favorites(user_id);
