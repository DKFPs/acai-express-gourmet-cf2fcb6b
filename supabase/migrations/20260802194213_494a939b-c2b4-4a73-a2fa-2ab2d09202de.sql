CREATE SCHEMA IF NOT EXISTS app_private;
REVOKE ALL ON SCHEMA app_private FROM PUBLIC;
GRANT USAGE ON SCHEMA app_private TO authenticated, service_role;

ALTER FUNCTION public.current_company_id() SET SCHEMA app_private;
ALTER FUNCTION public.has_role(uuid, public.app_role) SET SCHEMA app_private;
ALTER FUNCTION public.is_company_admin() SET SCHEMA app_private;
ALTER FUNCTION public.produce_batch(uuid, numeric, timestamptz, uuid, text) SET SCHEMA app_private;
ALTER FUNCTION public.discard_batch(uuid, numeric, text) SET SCHEMA app_private;

CREATE OR REPLACE FUNCTION app_private.is_company_admin()
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path TO 'public', 'app_private'
AS $$ SELECT app_private.has_role(auth.uid(), 'administrador'::public.app_role) $$;

CREATE OR REPLACE FUNCTION app_private.discard_batch(_batch_id uuid, _quantity numeric DEFAULT NULL::numeric, _reason text DEFAULT 'Descarte por vencimento'::text)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public', 'app_private'
AS $$
DECLARE
  v_company uuid := app_private.current_company_id();
  v_batch public.production_batches%ROWTYPE;
  v_fp uuid;
  v_qty numeric;
BEGIN
  IF v_company IS NULL THEN RAISE EXCEPTION 'Empresa não identificada'; END IF;
  IF NOT app_private.is_company_admin() THEN RAISE EXCEPTION 'Permissão negada'; END IF;

  SELECT * INTO v_batch FROM public.production_batches WHERE id = _batch_id AND company_id = v_company;
  IF NOT FOUND THEN RAISE EXCEPTION 'Lote não encontrado'; END IF;

  v_qty := COALESCE(_quantity, v_batch.produced_quantity - v_batch.discarded_quantity);
  IF v_qty <= 0 THEN RAISE EXCEPTION 'Nada a descartar neste lote'; END IF;

  SELECT id INTO v_fp FROM public.finished_products WHERE company_id = v_company AND recipe_id = v_batch.recipe_id;
  IF v_fp IS NULL THEN RAISE EXCEPTION 'Produto pronto não encontrado'; END IF;

  INSERT INTO public.finished_product_movements (company_id, finished_product_id, batch_id, type, quantity, reason, created_by)
  VALUES (v_company, v_fp, _batch_id, 'descarte', v_qty, _reason, auth.uid());

  UPDATE public.production_batches
     SET discarded_quantity = discarded_quantity + v_qty,
         status = CASE WHEN discarded_quantity + v_qty >= produced_quantity THEN 'descartado' ELSE status END
   WHERE id = _batch_id;

  INSERT INTO public.notifications (company_id, title, message, type, link)
  VALUES (v_company, 'Perda registrada no lote ' || COALESCE(v_batch.batch_code, ''),
          v_qty || ' un descartadas — ' || _reason, 'production', '/producao');
END; $$;

REVOKE ALL ON FUNCTION app_private.current_company_id() FROM PUBLIC;
REVOKE ALL ON FUNCTION app_private.has_role(uuid, public.app_role) FROM PUBLIC;
REVOKE ALL ON FUNCTION app_private.is_company_admin() FROM PUBLIC;
REVOKE ALL ON FUNCTION app_private.produce_batch(uuid, numeric, timestamptz, uuid, text) FROM PUBLIC;
REVOKE ALL ON FUNCTION app_private.discard_batch(uuid, numeric, text) FROM PUBLIC;

GRANT EXECUTE ON FUNCTION app_private.current_company_id() TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION app_private.has_role(uuid, public.app_role) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION app_private.is_company_admin() TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION app_private.produce_batch(uuid, numeric, timestamptz, uuid, text) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION app_private.discard_batch(uuid, numeric, text) TO authenticated, service_role;

CREATE OR REPLACE FUNCTION public.produce_batch(_recipe_id uuid, _batches numeric, _produced_at timestamptz DEFAULT now(), _responsible_id uuid DEFAULT NULL::uuid, _notes text DEFAULT NULL::text)
RETURNS uuid LANGUAGE sql SECURITY INVOKER SET search_path TO 'public', 'app_private'
AS $$ SELECT app_private.produce_batch(_recipe_id, _batches, _produced_at, _responsible_id, _notes) $$;

CREATE OR REPLACE FUNCTION public.discard_batch(_batch_id uuid, _quantity numeric DEFAULT NULL::numeric, _reason text DEFAULT 'Descarte por vencimento'::text)
RETURNS void LANGUAGE plpgsql SECURITY INVOKER SET search_path TO 'public', 'app_private'
AS $$ BEGIN PERFORM app_private.discard_batch(_batch_id, _quantity, _reason); END; $$;

REVOKE ALL ON FUNCTION public.produce_batch(uuid, numeric, timestamptz, uuid, text) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.discard_batch(uuid, numeric, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.produce_batch(uuid, numeric, timestamptz, uuid, text) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.discard_batch(uuid, numeric, text) TO authenticated, service_role;

DROP POLICY IF EXISTS cash_transactions_delete ON public.cash_transactions;
CREATE POLICY cash_transactions_delete ON public.cash_transactions
FOR DELETE TO authenticated
USING (
  app_private.is_company_admin()
  AND EXISTS (
    SELECT 1 FROM public.cash_sessions s
    WHERE s.id = cash_transactions.session_id
      AND s.company_id = app_private.current_company_id()
      AND s.status = 'aberto'::public.cash_register_status
  )
);

DROP POLICY IF EXISTS "Autenticados veem imagens de produtos" ON storage.objects;
DROP POLICY IF EXISTS "Admins enviam imagens de produtos" ON storage.objects;
DROP POLICY IF EXISTS "Admins atualizam imagens de produtos" ON storage.objects;
DROP POLICY IF EXISTS "Admins removem imagens de produtos" ON storage.objects;

CREATE POLICY "product_images_select_own_company" ON storage.objects
FOR SELECT TO authenticated
USING (
  bucket_id = 'product-images'
  AND (storage.foldername(name))[1] = app_private.current_company_id()::text
);

CREATE POLICY "product_images_insert_own_company" ON storage.objects
FOR INSERT TO authenticated
WITH CHECK (
  bucket_id = 'product-images'
  AND app_private.is_company_admin()
  AND (storage.foldername(name))[1] = app_private.current_company_id()::text
);

CREATE POLICY "product_images_update_own_company" ON storage.objects
FOR UPDATE TO authenticated
USING (
  bucket_id = 'product-images'
  AND app_private.is_company_admin()
  AND (storage.foldername(name))[1] = app_private.current_company_id()::text
)
WITH CHECK (
  bucket_id = 'product-images'
  AND app_private.is_company_admin()
  AND (storage.foldername(name))[1] = app_private.current_company_id()::text
);

CREATE POLICY "product_images_delete_own_company" ON storage.objects
FOR DELETE TO authenticated
USING (
  bucket_id = 'product-images'
  AND app_private.is_company_admin()
  AND (storage.foldername(name))[1] = app_private.current_company_id()::text
);