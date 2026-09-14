CREATE OR REPLACE FUNCTION public.merchant_default_coordinates()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  IF NEW.lat IS NULL OR NEW.lng IS NULL THEN
    SELECT c.center_lat, c.center_lng INTO NEW.lat, NEW.lng
    FROM public.cities c WHERE c.id = NEW.city_id;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS merchants_default_coordinates ON public.merchants;
CREATE TRIGGER merchants_default_coordinates
BEFORE INSERT OR UPDATE OF lat, lng, city_id ON public.merchants
FOR EACH ROW EXECUTE FUNCTION public.merchant_default_coordinates();

UPDATE public.merchants m
SET lat = c.center_lat, lng = c.center_lng
FROM public.cities c
WHERE c.id = m.city_id AND (m.lat IS NULL OR m.lng IS NULL);
