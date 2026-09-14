REVOKE ALL ON FUNCTION public.get_xp(uuid) FROM anon, authenticated;
REVOKE ALL ON FUNCTION public.can_use_offer(uuid, uuid) FROM anon, authenticated;
REVOKE ALL ON FUNCTION public.handle_new_user() FROM anon, authenticated;
