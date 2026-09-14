REVOKE ALL ON FUNCTION public.set_updated_at() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.handle_new_user() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.offers_validate_dates() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.has_role(uuid, public.app_role) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.is_admin() FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.is_merchant_member(uuid, boolean) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.get_xp(uuid) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.can_use_offer(uuid, uuid) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.create_redemption_token(uuid) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.validate_redemption(text) FROM PUBLIC, anon;

GRANT EXECUTE ON FUNCTION public.has_role(uuid, public.app_role) TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_admin() TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_merchant_member(uuid, boolean) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_xp(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.can_use_offer(uuid, uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.create_redemption_token(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.validate_redemption(text) TO authenticated;
