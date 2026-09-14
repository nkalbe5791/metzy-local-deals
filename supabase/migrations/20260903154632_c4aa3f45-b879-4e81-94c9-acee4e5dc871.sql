-- 1) Merchants: hide phone + owner_id from anonymous visitors (column-level grants)
REVOKE SELECT ON public.merchants FROM anon;
GRANT SELECT (id, name, description, logo_url, photos, address, city_id, category_id, lat, lng, opening_hours, status, created_at, updated_at)
  ON public.merchants TO anon;

-- 2) app_settings: only pricing keys are publicly readable
DROP POLICY IF EXISTS settings_public_read ON public.app_settings;

CREATE POLICY settings_public_prices_read ON public.app_settings
  FOR SELECT TO anon
  USING (key IN ('client_plan_monthly_eur', 'client_plan_yearly_eur', 'merchant_plan_business_eur'));

CREATE POLICY settings_authenticated_read ON public.app_settings
  FOR SELECT TO authenticated
  USING (true);
