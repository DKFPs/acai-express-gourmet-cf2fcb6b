CREATE OR REPLACE FUNCTION public.check_system_functions()
RETURNS TABLE(schema_name text, function_name text, arguments text, status text, detail text)
LANGUAGE plpgsql
STABLE
SET search_path = public, app_private
AS $fn$
BEGIN
  IF COALESCE(current_setting('request.jwt.claim.role', true), current_user) <> 'service_role'
     AND NOT public.is_company_admin() THEN
    RAISE EXCEPTION 'Apenas administradores podem executar a verificação.';
  END IF;
  RETURN QUERY SELECT * FROM app_private.check_system_functions();
END; $fn$;

REVOKE ALL ON FUNCTION public.check_system_functions() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.check_system_functions() TO authenticated, service_role;