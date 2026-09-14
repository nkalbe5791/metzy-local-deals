CREATE TABLE public.admin_allowlist (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  email text NOT NULL,
  role app_role NOT NULL DEFAULT 'admin',
  note text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX admin_allowlist_email_role_key ON public.admin_allowlist (lower(email), role);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.admin_allowlist TO authenticated;
GRANT ALL ON public.admin_allowlist TO service_role;

ALTER TABLE public.admin_allowlist ENABLE ROW LEVEL SECURITY;

CREATE POLICY allowlist_admin_all ON public.admin_allowlist
  FOR ALL TO authenticated USING (public.is_admin()) WITH CHECK (public.is_admin());

CREATE TRIGGER trg_allowlist_updated BEFORE UPDATE ON public.admin_allowlist
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE OR REPLACE FUNCTION public.grant_roles_from_allowlist()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.email_confirmed_at IS NULL OR NEW.email IS NULL THEN
    RETURN NEW;
  END IF;

  INSERT INTO public.user_roles (user_id, role)
  SELECT NEW.id, a.role
  FROM public.admin_allowlist a
  WHERE lower(a.email) = lower(NEW.email)
  ON CONFLICT (user_id, role) DO NOTHING;

  RETURN NEW;
END;
$$;

CREATE TRIGGER on_auth_user_created_allowlist
AFTER INSERT ON auth.users
FOR EACH ROW EXECUTE FUNCTION public.grant_roles_from_allowlist();

CREATE TRIGGER on_auth_user_confirmed_allowlist
AFTER UPDATE OF email_confirmed_at ON auth.users
FOR EACH ROW
WHEN (OLD.email_confirmed_at IS NULL AND NEW.email_confirmed_at IS NOT NULL)
EXECUTE FUNCTION public.grant_roles_from_allowlist();

INSERT INTO public.admin_allowlist (email, role, note)
VALUES ('djibril5791@gmail.com', 'admin', 'Administrateur fondateur METZY')
ON CONFLICT DO NOTHING;

INSERT INTO public.user_roles (user_id, role)
SELECT u.id, a.role
FROM auth.users u
JOIN public.admin_allowlist a ON lower(a.email) = lower(u.email)
WHERE u.email_confirmed_at IS NOT NULL
ON CONFLICT (user_id, role) DO NOTHING;

CREATE OR REPLACE FUNCTION public.admin_revoke_role(_user_id uuid, _role app_role)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT public.is_admin() THEN
    RETURN jsonb_build_object('ok', false, 'code', 'FORBIDDEN');
  END IF;
  IF _role = 'admin' AND _user_id = auth.uid() THEN
    RETURN jsonb_build_object('ok', false, 'code', 'SELF_REVOKE');
  END IF;

  DELETE FROM public.user_roles WHERE user_id = _user_id AND role = _role;

  INSERT INTO public.audit_logs (actor_id, action, resource_type, resource_id, result, context)
  VALUES (auth.uid(), 'role.revoked', 'user', _user_id, 'ok', jsonb_build_object('role', _role));

  RETURN jsonb_build_object('ok', true);
END;
$$;

REVOKE ALL ON FUNCTION public.grant_roles_from_allowlist() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.admin_revoke_role(uuid, app_role) TO authenticated;
