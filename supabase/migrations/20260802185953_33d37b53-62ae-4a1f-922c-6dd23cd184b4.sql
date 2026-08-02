CREATE OR REPLACE FUNCTION public.guard_profile_self_update()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  IF auth.uid() = NEW.id AND NOT public.is_company_admin() THEN
    NEW.is_active := OLD.is_active;
    NEW.company_id := OLD.company_id;
  END IF;
  RETURN NEW;
END; $$;

REVOKE ALL ON FUNCTION public.guard_profile_self_update() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.guard_profile_self_update() TO service_role;

DROP TRIGGER IF EXISTS guard_profile_self_update ON public.profiles;
CREATE TRIGGER guard_profile_self_update
BEFORE UPDATE ON public.profiles
FOR EACH ROW EXECUTE FUNCTION public.guard_profile_self_update();