CREATE OR REPLACE FUNCTION public.apply_referral_code(_code text)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _uid uuid := auth.uid();
  _referrer uuid;
BEGIN
  IF _uid IS NULL THEN
    RETURN jsonb_build_object('ok', false, 'code', 'AUTH_REQUIRED');
  END IF;

  IF _code IS NULL OR length(btrim(_code)) < 4 THEN
    RETURN jsonb_build_object('ok', false, 'code', 'INVALID_CODE');
  END IF;

  SELECT id INTO _referrer
  FROM public.profiles
  WHERE upper(referral_code) = upper(btrim(_code))
  LIMIT 1;

  IF _referrer IS NULL THEN
    RETURN jsonb_build_object('ok', false, 'code', 'INVALID_CODE');
  END IF;

  IF _referrer = _uid THEN
    RETURN jsonb_build_object('ok', false, 'code', 'SELF_REFERRAL');
  END IF;

  UPDATE public.profiles
  SET referred_by = _referrer, updated_at = now()
  WHERE id = _uid AND referred_by IS NULL;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('ok', false, 'code', 'ALREADY_REFERRED');
  END IF;

  INSERT INTO public.audit_logs (actor_id, action, resource_type, resource_id, result)
  VALUES (_uid, 'referral_applied', 'profile', _referrer, 'ok');

  RETURN jsonb_build_object('ok', true);
END;
$$;

REVOKE ALL ON FUNCTION public.apply_referral_code(text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.apply_referral_code(text) TO authenticated;
