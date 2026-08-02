-- =========================================================
-- 1. MULTI-TENANT FOUNDATION
-- =========================================================

CREATE OR REPLACE FUNCTION public.current_company_id()
RETURNS uuid
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT company_id FROM public.profiles WHERE id = auth.uid()
$$;

CREATE OR REPLACE FUNCTION public.is_company_admin()
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT public.has_role(auth.uid(), 'administrador'::public.app_role)
$$;

-- Backfill company_id on every tenant table
DO $$
DECLARE
  v_company uuid;
  t text;
  tables text[] := ARRAY['cash_register','cash_sessions','categories','customers','dashboard_goals',
                         'expense_categories','financial_entries','ingredients','orders','products',
                         'profiles','stock_movements','suppliers'];
BEGIN
  SELECT id INTO v_company FROM public.companies ORDER BY created_at LIMIT 1;
  IF v_company IS NULL THEN
    INSERT INTO public.companies (name) VALUES ('Minha Empresa') RETURNING id INTO v_company;
  END IF;

  FOREACH t IN ARRAY tables LOOP
    EXECUTE format('UPDATE public.%I SET company_id = %L WHERE company_id IS NULL', t, v_company);
    EXECUTE format('ALTER TABLE public.%I ALTER COLUMN company_id SET NOT NULL', t);
  END LOOP;

  FOREACH t IN ARRAY ARRAY['cash_register','cash_sessions','categories','customers','dashboard_goals',
                           'expense_categories','financial_entries','ingredients','orders','products',
                           'stock_movements','suppliers'] LOOP
    EXECUTE format('ALTER TABLE public.%I ALTER COLUMN company_id SET DEFAULT public.current_company_id()', t);
    EXECUTE format('CREATE INDEX IF NOT EXISTS %I ON public.%I (company_id)', 'idx_'||t||'_company', t);
  END LOOP;
END $$;

-- Drop every existing policy on tenant tables (rebuilt below)
DO $$
DECLARE r record;
BEGIN
  FOR r IN
    SELECT tablename, policyname FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename IN ('cash_register','cash_sessions','cash_transactions','categories','companies',
                        'customers','dashboard_goals','expense_categories','financial_entries','ingredients',
                        'order_items','order_status_history','orders','payments','product_ingredients',
                        'products','profiles','stock_movements','suppliers','user_roles')
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.%I', r.policyname, r.tablename);
  END LOOP;
END $$;

-- ---------- companies ----------
CREATE POLICY companies_select ON public.companies FOR SELECT TO authenticated
  USING (id = public.current_company_id());
CREATE POLICY companies_update ON public.companies FOR UPDATE TO authenticated
  USING (id = public.current_company_id() AND public.is_company_admin())
  WITH CHECK (id = public.current_company_id() AND public.is_company_admin());

-- ---------- profiles ----------
CREATE POLICY profiles_select ON public.profiles FOR SELECT TO authenticated
  USING (id = auth.uid() OR (company_id = public.current_company_id() AND public.is_company_admin()));
CREATE POLICY profiles_insert ON public.profiles FOR INSERT TO authenticated
  WITH CHECK (id = auth.uid());
CREATE POLICY profiles_update ON public.profiles FOR UPDATE TO authenticated
  USING (id = auth.uid() OR (company_id = public.current_company_id() AND public.is_company_admin()))
  WITH CHECK (id = auth.uid() OR (company_id = public.current_company_id() AND public.is_company_admin()));
CREATE POLICY profiles_delete ON public.profiles FOR DELETE TO authenticated
  USING (company_id = public.current_company_id() AND public.is_company_admin() AND id <> auth.uid());

-- ---------- user_roles ----------
CREATE POLICY user_roles_select ON public.user_roles FOR SELECT TO authenticated
  USING (user_id = auth.uid() OR (public.is_company_admin()
    AND EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = user_roles.user_id AND p.company_id = public.current_company_id())));
CREATE POLICY user_roles_insert ON public.user_roles FOR INSERT TO authenticated
  WITH CHECK (public.is_company_admin()
    AND EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = user_roles.user_id AND p.company_id = public.current_company_id()));
CREATE POLICY user_roles_update ON public.user_roles FOR UPDATE TO authenticated
  USING (public.is_company_admin()
    AND EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = user_roles.user_id AND p.company_id = public.current_company_id()))
  WITH CHECK (public.is_company_admin());
CREATE POLICY user_roles_delete ON public.user_roles FOR DELETE TO authenticated
  USING (public.is_company_admin() AND user_id <> auth.uid()
    AND EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = user_roles.user_id AND p.company_id = public.current_company_id()));

-- ---------- generic tenant tables ----------
DO $$
DECLARE
  t text;
  admin_delete text[] := ARRAY['cash_register','cash_sessions','customers','dashboard_goals',
                               'financial_entries','ingredients','orders','stock_movements','suppliers'];
  admin_write  text[] := ARRAY['categories','expense_categories','products'];
  open_write   text[] := ARRAY['cash_register','cash_sessions','customers','financial_entries',
                               'ingredients','orders','suppliers'];
BEGIN
  FOREACH t IN ARRAY (admin_delete || admin_write) LOOP
    EXECUTE format('CREATE POLICY %I ON public.%I FOR SELECT TO authenticated USING (company_id = public.current_company_id())', t||'_select', t);
  END LOOP;

  FOREACH t IN ARRAY open_write LOOP
    EXECUTE format('CREATE POLICY %I ON public.%I FOR INSERT TO authenticated WITH CHECK (company_id = public.current_company_id())', t||'_insert', t);
    EXECUTE format('CREATE POLICY %I ON public.%I FOR UPDATE TO authenticated USING (company_id = public.current_company_id()) WITH CHECK (company_id = public.current_company_id())', t||'_update', t);
  END LOOP;

  FOREACH t IN ARRAY admin_write LOOP
    EXECUTE format('CREATE POLICY %I ON public.%I FOR INSERT TO authenticated WITH CHECK (company_id = public.current_company_id() AND public.is_company_admin())', t||'_insert', t);
    EXECUTE format('CREATE POLICY %I ON public.%I FOR UPDATE TO authenticated USING (company_id = public.current_company_id() AND public.is_company_admin()) WITH CHECK (company_id = public.current_company_id() AND public.is_company_admin())', t||'_update', t);
    EXECUTE format('CREATE POLICY %I ON public.%I FOR DELETE TO authenticated USING (company_id = public.current_company_id() AND public.is_company_admin())', t||'_delete', t);
  END LOOP;

  FOREACH t IN ARRAY admin_delete LOOP
    EXECUTE format('CREATE POLICY %I ON public.%I FOR DELETE TO authenticated USING (company_id = public.current_company_id() AND public.is_company_admin())', t||'_delete', t);
  END LOOP;
END $$;

-- dashboard_goals + stock_movements writes
CREATE POLICY dashboard_goals_insert ON public.dashboard_goals FOR INSERT TO authenticated
  WITH CHECK (company_id = public.current_company_id() AND public.is_company_admin());
CREATE POLICY dashboard_goals_update ON public.dashboard_goals FOR UPDATE TO authenticated
  USING (company_id = public.current_company_id() AND public.is_company_admin())
  WITH CHECK (company_id = public.current_company_id() AND public.is_company_admin());
CREATE POLICY stock_movements_insert ON public.stock_movements FOR INSERT TO authenticated
  WITH CHECK (company_id = public.current_company_id());

-- ---------- child tables scoped through parents ----------
CREATE POLICY order_items_select ON public.order_items FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM public.orders o WHERE o.id = order_items.order_id AND o.company_id = public.current_company_id()));
CREATE POLICY order_items_insert ON public.order_items FOR INSERT TO authenticated
  WITH CHECK (EXISTS (SELECT 1 FROM public.orders o WHERE o.id = order_items.order_id AND o.company_id = public.current_company_id()));
CREATE POLICY order_items_update ON public.order_items FOR UPDATE TO authenticated
  USING (EXISTS (SELECT 1 FROM public.orders o WHERE o.id = order_items.order_id AND o.company_id = public.current_company_id()))
  WITH CHECK (EXISTS (SELECT 1 FROM public.orders o WHERE o.id = order_items.order_id AND o.company_id = public.current_company_id()));
CREATE POLICY order_items_delete ON public.order_items FOR DELETE TO authenticated
  USING (EXISTS (SELECT 1 FROM public.orders o WHERE o.id = order_items.order_id AND o.company_id = public.current_company_id()));

CREATE POLICY order_status_history_select ON public.order_status_history FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM public.orders o WHERE o.id = order_status_history.order_id AND o.company_id = public.current_company_id()));
CREATE POLICY order_status_history_insert ON public.order_status_history FOR INSERT TO authenticated
  WITH CHECK (EXISTS (SELECT 1 FROM public.orders o WHERE o.id = order_status_history.order_id AND o.company_id = public.current_company_id()));

CREATE POLICY payments_select ON public.payments FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM public.orders o WHERE o.id = payments.order_id AND o.company_id = public.current_company_id()));
CREATE POLICY payments_insert ON public.payments FOR INSERT TO authenticated
  WITH CHECK (EXISTS (SELECT 1 FROM public.orders o WHERE o.id = payments.order_id AND o.company_id = public.current_company_id()));
CREATE POLICY payments_update ON public.payments FOR UPDATE TO authenticated
  USING (EXISTS (SELECT 1 FROM public.orders o WHERE o.id = payments.order_id AND o.company_id = public.current_company_id()))
  WITH CHECK (EXISTS (SELECT 1 FROM public.orders o WHERE o.id = payments.order_id AND o.company_id = public.current_company_id()));
CREATE POLICY payments_delete ON public.payments FOR DELETE TO authenticated
  USING (public.is_company_admin() AND EXISTS (SELECT 1 FROM public.orders o WHERE o.id = payments.order_id AND o.company_id = public.current_company_id()));

CREATE POLICY cash_transactions_select ON public.cash_transactions FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM public.cash_sessions s WHERE s.id = cash_transactions.session_id AND s.company_id = public.current_company_id()));
CREATE POLICY cash_transactions_insert ON public.cash_transactions FOR INSERT TO authenticated
  WITH CHECK (EXISTS (SELECT 1 FROM public.cash_sessions s WHERE s.id = cash_transactions.session_id AND s.company_id = public.current_company_id()));
CREATE POLICY cash_transactions_update ON public.cash_transactions FOR UPDATE TO authenticated
  USING (EXISTS (SELECT 1 FROM public.cash_sessions s WHERE s.id = cash_transactions.session_id AND s.company_id = public.current_company_id()))
  WITH CHECK (EXISTS (SELECT 1 FROM public.cash_sessions s WHERE s.id = cash_transactions.session_id AND s.company_id = public.current_company_id()));
CREATE POLICY cash_transactions_delete ON public.cash_transactions FOR DELETE TO authenticated
  USING (public.is_company_admin() AND EXISTS (SELECT 1 FROM public.cash_sessions s WHERE s.id = cash_transactions.session_id AND s.company_id = public.current_company_id()));

CREATE POLICY product_ingredients_select ON public.product_ingredients FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM public.products p WHERE p.id = product_ingredients.product_id AND p.company_id = public.current_company_id()));
CREATE POLICY product_ingredients_write ON public.product_ingredients FOR ALL TO authenticated
  USING (public.is_company_admin() AND EXISTS (SELECT 1 FROM public.products p WHERE p.id = product_ingredients.product_id AND p.company_id = public.current_company_id()))
  WITH CHECK (public.is_company_admin() AND EXISTS (SELECT 1 FROM public.products p WHERE p.id = product_ingredients.product_id AND p.company_id = public.current_company_id()));

-- customer_stats scoped to the caller's company
CREATE OR REPLACE FUNCTION public.customer_stats()
RETURNS TABLE(customer_id uuid, orders_count bigint, total_spent numeric, last_purchase timestamp with time zone)
LANGUAGE sql STABLE SET search_path = public
AS $$
  SELECT o.customer_id, COUNT(*)::bigint, COALESCE(SUM(o.total),0)::numeric, MAX(o.created_at)
  FROM public.orders o
  WHERE o.customer_id IS NOT NULL AND o.status <> 'cancelado'
    AND o.company_id = public.current_company_id()
  GROUP BY o.customer_id
$$;

-- =========================================================
-- 2. COMPANY SETTINGS
-- =========================================================
CREATE TABLE public.company_settings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL UNIQUE REFERENCES public.companies(id) ON DELETE CASCADE,
  logo_url text,
  primary_color text NOT NULL DEFAULT '#6D28D9',
  currency text NOT NULL DEFAULT 'BRL',
  timezone text NOT NULL DEFAULT 'America/Sao_Paulo',
  opening_hours jsonb NOT NULL DEFAULT '{"seg":{"open":"09:00","close":"22:00","closed":false},"ter":{"open":"09:00","close":"22:00","closed":false},"qua":{"open":"09:00","close":"22:00","closed":false},"qui":{"open":"09:00","close":"22:00","closed":false},"sex":{"open":"09:00","close":"23:00","closed":false},"sab":{"open":"09:00","close":"23:00","closed":false},"dom":{"open":"12:00","close":"20:00","closed":false}}'::jsonb,
  delivery_fee numeric NOT NULL DEFAULT 0,
  free_delivery_above numeric,
  min_order_value numeric NOT NULL DEFAULT 0,
  payment_methods text[] NOT NULL DEFAULT ARRAY['dinheiro','pix','cartao_credito','cartao_debito'],
  whatsapp_number text,
  whatsapp_template text NOT NULL DEFAULT 'Olá {cliente}! Seu pedido #{numero} está {status}. Total: {total}.',
  whatsapp_enabled boolean NOT NULL DEFAULT true,
  low_stock_alerts boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.company_settings TO authenticated;
GRANT ALL ON public.company_settings TO service_role;
ALTER TABLE public.company_settings ENABLE ROW LEVEL SECURITY;
CREATE POLICY company_settings_select ON public.company_settings FOR SELECT TO authenticated
  USING (company_id = public.current_company_id());
CREATE POLICY company_settings_insert ON public.company_settings FOR INSERT TO authenticated
  WITH CHECK (company_id = public.current_company_id() AND public.is_company_admin());
CREATE POLICY company_settings_update ON public.company_settings FOR UPDATE TO authenticated
  USING (company_id = public.current_company_id() AND public.is_company_admin())
  WITH CHECK (company_id = public.current_company_id() AND public.is_company_admin());
CREATE TRIGGER trg_company_settings_updated BEFORE UPDATE ON public.company_settings
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

INSERT INTO public.company_settings (company_id) SELECT id FROM public.companies ON CONFLICT DO NOTHING;

-- =========================================================
-- 3. AUDIT LOGS
-- =========================================================
CREATE TABLE public.audit_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid,
  user_id uuid,
  user_name text,
  table_name text NOT NULL,
  record_id uuid,
  action text NOT NULL,
  old_data jsonb,
  new_data jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.audit_logs TO authenticated;
GRANT ALL ON public.audit_logs TO service_role;
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;
CREATE POLICY audit_logs_select ON public.audit_logs FOR SELECT TO authenticated
  USING (company_id = public.current_company_id() AND public.is_company_admin());
CREATE INDEX idx_audit_logs_company_created ON public.audit_logs (company_id, created_at DESC);

CREATE OR REPLACE FUNCTION public.write_audit_log()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_company uuid;
  v_record uuid;
  v_old jsonb;
  v_new jsonb;
BEGIN
  IF TG_OP = 'DELETE' THEN v_old := to_jsonb(OLD); ELSE v_new := to_jsonb(NEW); END IF;
  IF TG_OP = 'UPDATE' THEN v_old := to_jsonb(OLD); END IF;

  v_record := COALESCE((v_new->>'id')::uuid, (v_old->>'id')::uuid);
  v_company := COALESCE((v_new->>'company_id')::uuid, (v_old->>'company_id')::uuid, public.current_company_id());

  INSERT INTO public.audit_logs (company_id, user_id, user_name, table_name, record_id, action, old_data, new_data)
  VALUES (
    v_company, auth.uid(),
    (SELECT full_name FROM public.profiles WHERE id = auth.uid()),
    TG_TABLE_NAME, v_record, lower(TG_OP), v_old, v_new
  );
  RETURN NULL;
END; $$;

DO $$
DECLARE t text;
BEGIN
  FOREACH t IN ARRAY ARRAY['products','orders','customers','ingredients','financial_entries',
                           'cash_sessions','suppliers','categories','company_settings','user_roles','profiles'] LOOP
    EXECUTE format('CREATE TRIGGER trg_audit_%s AFTER INSERT OR UPDATE OR DELETE ON public.%I FOR EACH ROW EXECUTE FUNCTION public.write_audit_log()', t, t);
  END LOOP;
END $$;

-- =========================================================
-- 4. NOTIFICATIONS
-- =========================================================
CREATE TABLE public.notifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL DEFAULT public.current_company_id(),
  user_id uuid,
  title text NOT NULL,
  message text,
  type text NOT NULL DEFAULT 'info',
  link text,
  read_by uuid[] NOT NULL DEFAULT '{}',
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.notifications TO authenticated;
GRANT ALL ON public.notifications TO service_role;
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;
CREATE POLICY notifications_select ON public.notifications FOR SELECT TO authenticated
  USING (company_id = public.current_company_id() AND (user_id IS NULL OR user_id = auth.uid()));
CREATE POLICY notifications_insert ON public.notifications FOR INSERT TO authenticated
  WITH CHECK (company_id = public.current_company_id());
CREATE POLICY notifications_update ON public.notifications FOR UPDATE TO authenticated
  USING (company_id = public.current_company_id()) WITH CHECK (company_id = public.current_company_id());
CREATE POLICY notifications_delete ON public.notifications FOR DELETE TO authenticated
  USING (company_id = public.current_company_id() AND public.is_company_admin());
CREATE INDEX idx_notifications_company_created ON public.notifications (company_id, created_at DESC);

CREATE OR REPLACE FUNCTION public.notify_new_order()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  INSERT INTO public.notifications (company_id, title, message, type, link)
  VALUES (NEW.company_id, 'Novo pedido #' || NEW.order_number,
          COALESCE(NEW.customer_name, 'Cliente não identificado'), 'order', '/pedidos/' || NEW.id);
  RETURN NULL;
END; $$;
CREATE TRIGGER trg_notify_new_order AFTER INSERT ON public.orders
  FOR EACH ROW EXECUTE FUNCTION public.notify_new_order();

CREATE OR REPLACE FUNCTION public.notify_low_stock()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NEW.quantity <= NEW.min_stock AND (OLD.quantity IS NULL OR OLD.quantity > OLD.min_stock) THEN
    INSERT INTO public.notifications (company_id, title, message, type, link)
    VALUES (NEW.company_id, 'Estoque crítico: ' || NEW.name,
            'Restam ' || NEW.quantity || ' ' || NEW.unit, 'stock', '/estoque');
  END IF;
  RETURN NULL;
END; $$;
CREATE TRIGGER trg_notify_low_stock AFTER UPDATE ON public.ingredients
  FOR EACH ROW EXECUTE FUNCTION public.notify_low_stock();

ALTER PUBLICATION supabase_realtime ADD TABLE public.notifications;

-- =========================================================
-- 5. FAVORITES + PREFERENCES
-- =========================================================
CREATE TABLE public.user_favorites (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL DEFAULT auth.uid(),
  label text NOT NULL,
  path text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, path)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.user_favorites TO authenticated;
GRANT ALL ON public.user_favorites TO service_role;
ALTER TABLE public.user_favorites ENABLE ROW LEVEL SECURITY;
CREATE POLICY user_favorites_all ON public.user_favorites FOR ALL TO authenticated
  USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());

CREATE TABLE public.user_preferences (
  user_id uuid PRIMARY KEY DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  theme text NOT NULL DEFAULT 'dark',
  sidebar_collapsed boolean NOT NULL DEFAULT false,
  notifications_enabled boolean NOT NULL DEFAULT true,
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.user_preferences TO authenticated;
GRANT ALL ON public.user_preferences TO service_role;
ALTER TABLE public.user_preferences ENABLE ROW LEVEL SECURITY;
CREATE POLICY user_preferences_all ON public.user_preferences FOR ALL TO authenticated
  USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());
CREATE TRIGGER trg_user_preferences_updated BEFORE UPDATE ON public.user_preferences
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- =========================================================
-- 6. SIGNUP: create company per new tenant owner
-- =========================================================
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_company uuid;
  v_invite uuid;
  v_role public.app_role;
BEGIN
  v_invite := NULLIF(NEW.raw_user_meta_data ->> 'company_id', '')::uuid;

  IF v_invite IS NOT NULL AND EXISTS (SELECT 1 FROM public.companies WHERE id = v_invite) THEN
    v_company := v_invite;
    v_role := 'funcionario';
  ELSE
    INSERT INTO public.companies (name)
    VALUES (COALESCE(NULLIF(NEW.raw_user_meta_data ->> 'company_name', ''), 'Minha Empresa'))
    RETURNING id INTO v_company;
    INSERT INTO public.company_settings (company_id) VALUES (v_company);
    v_role := 'administrador';
  END IF;

  INSERT INTO public.profiles (id, full_name, company_id)
  VALUES (NEW.id, COALESCE(NEW.raw_user_meta_data ->> 'full_name', ''), v_company);

  INSERT INTO public.user_roles (user_id, role) VALUES (NEW.id, v_role);
  RETURN NEW;
END; $$;