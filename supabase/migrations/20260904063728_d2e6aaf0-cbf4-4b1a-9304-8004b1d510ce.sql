-- Durcissement des droits d'exécution des fonctions sensibles
REVOKE EXECUTE ON FUNCTION public.admin_revoke_role(uuid, public.app_role) FROM anon, public;
REVOKE EXECUTE ON FUNCTION public.has_role(uuid, public.app_role) FROM anon, authenticated, public;
GRANT EXECUTE ON FUNCTION public.has_role(uuid, public.app_role) TO service_role;
GRANT EXECUTE ON FUNCTION public.is_admin() TO authenticated;

-- Contrôle des rôles d'un utilisateur pour lui-même uniquement
CREATE OR REPLACE FUNCTION public.my_roles()
RETURNS SETOF public.app_role
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT role FROM public.user_roles WHERE user_id = auth.uid();
$$;
REVOKE EXECUTE ON FUNCTION public.my_roles() FROM anon, public;
GRANT EXECUTE ON FUNCTION public.my_roles() TO authenticated, service_role;

-- Table de signalements / support (retours utilisateurs et commerçants)
CREATE TABLE IF NOT EXISTS public.support_tickets (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  email text,
  subject text NOT NULL,
  message text NOT NULL,
  kind text NOT NULL DEFAULT 'question',
  status text NOT NULL DEFAULT 'OPEN',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT ON public.support_tickets TO authenticated;
GRANT ALL ON public.support_tickets TO service_role;
ALTER TABLE public.support_tickets ENABLE ROW LEVEL SECURITY;

CREATE POLICY "tickets_insert_self" ON public.support_tickets
  FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid());
CREATE POLICY "tickets_select_self" ON public.support_tickets
  FOR SELECT TO authenticated USING (user_id = auth.uid() OR public.is_admin());
CREATE POLICY "tickets_update_admin" ON public.support_tickets
  FOR UPDATE TO authenticated USING (public.is_admin()) WITH CHECK (public.is_admin());

CREATE TRIGGER trg_support_tickets_updated
  BEFORE UPDATE ON public.support_tickets
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE INDEX IF NOT EXISTS support_tickets_status_idx ON public.support_tickets (status, created_at DESC);

-- Suppression de compte à la demande de l'utilisateur (RGPD) : anonymisation
CREATE OR REPLACE FUNCTION public.request_account_deletion()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE uid uuid := auth.uid();
BEGIN
  IF uid IS NULL THEN
    RETURN jsonb_build_object('ok', false, 'code', 'AUTH_REQUIRED');
  END IF;

  UPDATE public.profiles
  SET status = 'SUSPENDED',
      display_name = 'Compte supprimé',
      first_name = 'Compte',
      last_name = 'supprimé',
      phone = NULL,
      address_line1 = NULL,
      postal_code = NULL,
      city_name = NULL,
      updated_at = now()
  WHERE id = uid;

  DELETE FROM public.offer_favorites WHERE user_id = uid;
  DELETE FROM public.redemption_tokens WHERE user_id = uid AND consumed_at IS NULL;

  INSERT INTO public.audit_logs (actor_id, action, resource_type, resource_id, result)
  VALUES (uid, 'account.deletion_requested', 'profile', uid, 'ok');

  RETURN jsonb_build_object('ok', true);
END;
$$;
REVOKE EXECUTE ON FUNCTION public.request_account_deletion() FROM anon, public;
GRANT EXECUTE ON FUNCTION public.request_account_deletion() TO authenticated, service_role;
