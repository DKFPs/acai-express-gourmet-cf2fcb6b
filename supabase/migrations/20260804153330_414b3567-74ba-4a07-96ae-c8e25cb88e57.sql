CREATE OR REPLACE FUNCTION app_private.check_system_functions()
RETURNS TABLE(schema_name text, function_name text, arguments text, status text, detail text)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public, app_private, pg_catalog
AS $fn$
DECLARE
  r record;
  v_oid oid;
  v_secdef boolean;
  v_config text[];
  v_missing text[];
  v_excess text[];
  role_name text;
BEGIN
  FOR r IN
    SELECT * FROM (VALUES
      ('app_private','current_company_id','', true,  ARRAY['authenticated','service_role'], ARRAY['anon']),
      ('app_private','is_company_admin','',   true,  ARRAY['authenticated','service_role'], ARRAY['anon']),
      ('app_private','has_role','_user_id uuid, _role app_role', true, ARRAY['authenticated','service_role'], ARRAY['anon']),
      ('app_private','produce_batch','_recipe_id uuid, _batches numeric, _produced_at timestamp with time zone, _responsible_id uuid, _notes text', true, ARRAY['authenticated','service_role'], ARRAY['anon']),
      ('app_private','discard_batch','_batch_id uuid, _quantity numeric, _reason text', true, ARRAY['authenticated','service_role'], ARRAY['anon']),
      ('public','current_company_id','', false, ARRAY['authenticated','service_role'], ARRAY['anon']),
      ('public','is_company_admin','',   false, ARRAY['authenticated','service_role'], ARRAY['anon']),
      ('public','has_role','_user_id uuid, _role app_role', false, ARRAY['authenticated','service_role'], ARRAY['anon']),
      ('public','produce_batch','_recipe_id uuid, _batches numeric, _produced_at timestamp with time zone, _responsible_id uuid, _notes text', false, ARRAY['authenticated','service_role'], ARRAY['anon']),
      ('public','discard_batch','_batch_id uuid, _quantity numeric, _reason text', false, ARRAY['authenticated','service_role'], ARRAY['anon']),
      ('public','customer_stats','', false, ARRAY['authenticated','service_role'], ARRAY['anon']),
      ('public','recalc_recipe_costs','_recipe_id uuid, _reason text', true, ARRAY['service_role'], ARRAY['anon']),
      ('public','set_updated_at','', false, ARRAY['service_role'], ARRAY['anon','authenticated']),
      ('public','handle_new_user','', true, ARRAY['service_role'], ARRAY['anon','authenticated']),
      ('public','guard_profile_self_update','', true, ARRAY['service_role'], ARRAY['anon','authenticated']),
      ('public','write_audit_log','', true, ARRAY['service_role'], ARRAY['anon','authenticated']),
      ('public','apply_stock_movement','', true, ARRAY['service_role'], ARRAY['anon','authenticated']),
      ('public','apply_finished_movement','', true, ARRAY['service_role'], ARRAY['anon','authenticated']),
      ('public','apply_purchase','', true, ARRAY['service_role'], ARRAY['anon','authenticated']),
      ('public','consume_stock_on_order_item','', true, ARRAY['service_role'], ARRAY['anon','authenticated']),
      ('public','restore_stock_on_cancel','', true, ARRAY['service_role'], ARRAY['anon','authenticated']),
      ('public','log_order_status','', true, ARRAY['service_role'], ARRAY['anon','authenticated']),
      ('public','notify_low_stock','', true, ARRAY['service_role'], ARRAY['anon','authenticated']),
      ('public','notify_new_order','', true, ARRAY['service_role'], ARRAY['anon','authenticated']),
      ('public','recalc_cash_session','', true, ARRAY['service_role'], ARRAY['anon','authenticated']),
      ('public','recalc_order_subtotal','', true, ARRAY['service_role'], ARRAY['anon','authenticated']),
      ('public','recalc_recipe_on_items','', true, ARRAY['service_role'], ARRAY['anon','authenticated']),
      ('public','recalc_recipe_on_recipe','', true, ARRAY['service_role'], ARRAY['anon','authenticated']),
      ('public','recalc_recipes_for_ingredient','', true, ARRAY['service_role'], ARRAY['anon','authenticated']),
      ('public','recalc_recipes_for_packaging','', true, ARRAY['service_role'], ARRAY['anon','authenticated'])
    ) AS t(nsp, fname, args, secdef, expect_roles, forbid_roles)
  LOOP
    schema_name := r.nsp::text;
    function_name := r.fname::text;
    arguments := r.args::text;

    SELECT p.oid, p.prosecdef, p.proconfig
      INTO v_oid, v_secdef, v_config
      FROM pg_proc p
      JOIN pg_namespace n ON n.oid = p.pronamespace
     WHERE n.nspname = r.nsp
       AND p.proname = r.fname
       AND pg_get_function_identity_arguments(p.oid) = r.args
     LIMIT 1;

    IF v_oid IS NULL THEN
      status := 'ausente';
      detail := format('Função %I.%I(%s) não existe no banco.', r.nsp, r.fname, r.args);
      RETURN NEXT;
      CONTINUE;
    END IF;

    v_missing := ARRAY[]::text[];
    v_excess := ARRAY[]::text[];

    FOREACH role_name IN ARRAY r.expect_roles LOOP
      IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = role_name)
         AND NOT has_function_privilege(role_name, v_oid, 'EXECUTE') THEN
        v_missing := v_missing || role_name;
      END IF;
    END LOOP;

    FOREACH role_name IN ARRAY r.forbid_roles LOOP
      IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = role_name)
         AND has_function_privilege(role_name, v_oid, 'EXECUTE') THEN
        v_excess := v_excess || role_name;
      END IF;
    END LOOP;

    IF array_length(v_missing, 1) IS NOT NULL THEN
      status := 'permissao_faltando';
      detail := format('Sem permissão de execução para: %s.', array_to_string(v_missing, ', '));
      RETURN NEXT;
      CONTINUE;
    END IF;

    IF array_length(v_excess, 1) IS NOT NULL THEN
      status := 'permissao_excessiva';
      detail := format('Execução liberada indevidamente para: %s.', array_to_string(v_excess, ', '));
      RETURN NEXT;
      CONTINUE;
    END IF;

    IF v_secdef IS DISTINCT FROM r.secdef THEN
      status := 'modo_seguranca_divergente';
      detail := format('Esperado security definer = %s, encontrado %s.', r.secdef, v_secdef);
      RETURN NEXT;
      CONTINUE;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM unnest(COALESCE(v_config, ARRAY[]::text[])) c WHERE c LIKE 'search_path=%') THEN
      status := 'search_path_inseguro';
      detail := 'Função sem search_path fixo.';
      RETURN NEXT;
      CONTINUE;
    END IF;

    status := 'ok';
    detail := 'Função existe com permissões corretas.';
    RETURN NEXT;
  END LOOP;
END; $fn$;

REVOKE ALL ON FUNCTION app_private.check_system_functions() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION app_private.check_system_functions() TO authenticated, service_role;

CREATE OR REPLACE FUNCTION public.check_system_functions()
RETURNS TABLE(schema_name text, function_name text, arguments text, status text, detail text)
LANGUAGE plpgsql
STABLE
SET search_path = public, app_private
AS $fn$
BEGIN
  IF NOT public.is_company_admin() THEN
    RAISE EXCEPTION 'Apenas administradores podem executar a verificação.';
  END IF;
  RETURN QUERY SELECT * FROM app_private.check_system_functions();
END; $fn$;

REVOKE ALL ON FUNCTION public.check_system_functions() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.check_system_functions() TO authenticated, service_role;

CREATE TABLE IF NOT EXISTS public.system_health_checks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid REFERENCES public.companies(id) ON DELETE CASCADE,
  source text NOT NULL DEFAULT 'manual',
  passed boolean NOT NULL,
  total integer NOT NULL DEFAULT 0,
  failures jsonb NOT NULL DEFAULT '[]'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT ON public.system_health_checks TO authenticated;
GRANT ALL ON public.system_health_checks TO service_role;

ALTER TABLE public.system_health_checks ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admins leem verificações" ON public.system_health_checks;
CREATE POLICY "Admins leem verificações"
ON public.system_health_checks FOR SELECT TO authenticated
USING (public.is_company_admin() AND (company_id IS NULL OR company_id = public.current_company_id()));

CREATE INDEX IF NOT EXISTS system_health_checks_created_idx
  ON public.system_health_checks (created_at DESC);

CREATE EXTENSION IF NOT EXISTS pg_cron;
CREATE EXTENSION IF NOT EXISTS pg_net;

SELECT cron.unschedule('verify-db-functions')
WHERE EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'verify-db-functions');

SELECT cron.schedule(
  'verify-db-functions',
  '0 7 * * *',
  $cron$
  SELECT net.http_post(
    url := 'https://project--f5497ed2-ab98-41ba-bc2f-13bee16cc0b5.lovable.app/api/public/health/db-functions',
    headers := '{"Content-Type": "application/json", "apikey": "sb_publishable_3UgO3VKAodQuN-WTRxPR7A_jPSZ9fPQ"}'::jsonb,
    body := '{"source": "cron"}'::jsonb
  );
  $cron$
);