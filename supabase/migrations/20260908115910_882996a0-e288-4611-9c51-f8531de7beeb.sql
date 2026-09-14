CREATE OR REPLACE FUNCTION public.admin_export_clients()
RETURNS TABLE(
  user_id uuid, username text, first_name text, last_name text, email text,
  phone text, address_line1 text, postal_code text, city_name text,
  status text, subscription_status text, lifetime_points integer,
  points_balance integer, notify_new_offers boolean, created_at timestamptz
)
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NOT public.is_admin() THEN
    RAISE EXCEPTION 'FORBIDDEN';
  END IF;
  RETURN QUERY
  SELECT p.id, p.username, p.first_name, p.last_name, u.email::text,
         p.phone_e164, p.address_line1, p.postal_code, p.city_name,
         p.status::text, COALESCE(s.status::text, 'NONE'),
         COALESCE((SELECT SUM(t.amount) FILTER (WHERE t.amount > 0) FROM public.points_transactions t WHERE t.user_id = p.id), 0)::int,
         COALESCE((SELECT SUM(t.amount) FROM public.points_transactions t WHERE t.user_id = p.id), 0)::int,
         p.notify_new_offers, p.created_at
  FROM public.profiles p
  JOIN auth.users u ON u.id = p.id
  LEFT JOIN public.subscriptions s ON s.user_id = p.id
  ORDER BY p.created_at DESC;
END; $$;
REVOKE ALL ON FUNCTION public.admin_export_clients() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.admin_export_clients() TO authenticated, service_role;

CREATE OR REPLACE FUNCTION public.admin_export_merchants()
RETURNS TABLE(
  merchant_id uuid, merchant_name text, status text, category text, city text,
  address text, merchant_phone text, owner_first_name text, owner_last_name text,
  owner_email text, owner_phone text, offers_count integer, redemptions_count integer,
  subscription_status text, created_at timestamptz
)
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NOT public.is_admin() THEN
    RAISE EXCEPTION 'FORBIDDEN';
  END IF;
  RETURN QUERY
  SELECT m.id, m.name, m.status::text, c.name, ci.name, m.address, m.phone,
         p.first_name, p.last_name, u.email::text, p.phone_e164,
         COALESCE((SELECT COUNT(*) FROM public.offers o WHERE o.merchant_id = m.id), 0)::int,
         COALESCE((SELECT COUNT(*) FROM public.offer_redemptions r WHERE r.merchant_id = m.id), 0)::int,
         COALESCE(ms.status::text, 'NONE'), m.created_at
  FROM public.merchants m
  LEFT JOIN public.categories c ON c.id = m.category_id
  LEFT JOIN public.cities ci ON ci.id = m.city_id
  LEFT JOIN public.profiles p ON p.id = m.owner_id
  LEFT JOIN auth.users u ON u.id = m.owner_id
  LEFT JOIN public.merchant_subscriptions ms ON ms.merchant_id = m.id
  ORDER BY m.created_at DESC;
END; $$;
REVOKE ALL ON FUNCTION public.admin_export_merchants() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.admin_export_merchants() TO authenticated, service_role;

CREATE OR REPLACE FUNCTION public.admin_log_export(_kind text, _rows integer)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NOT public.is_admin() THEN
    RAISE EXCEPTION 'FORBIDDEN';
  END IF;
  INSERT INTO public.audit_logs (actor_id, action, resource_type, result, context)
  VALUES (auth.uid(), 'ADMIN_EXPORT', _kind, 'OK', jsonb_build_object('rows', _rows));
END; $$;
REVOKE ALL ON FUNCTION public.admin_log_export(text, integer) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.admin_log_export(text, integer) TO authenticated, service_role;
