
-- ENUMS
CREATE TYPE public.order_status AS ENUM ('recebido','preparando','saiu_entrega','entregue','cancelado');
CREATE TYPE public.payment_method AS ENUM ('dinheiro','pix','cartao_credito','cartao_debito','outro');
CREATE TYPE public.payment_status AS ENUM ('pendente','pago','estornado');

-- CUSTOMERS
CREATE TABLE public.customers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid REFERENCES public.companies(id) ON DELETE SET NULL,
  name text NOT NULL,
  phone text,
  email text,
  address text,
  notes text,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.customers TO authenticated;
GRANT ALL ON public.customers TO service_role;
ALTER TABLE public.customers ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Autenticados veem clientes" ON public.customers FOR SELECT TO authenticated USING (true);
CREATE POLICY "Autenticados criam clientes" ON public.customers FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Autenticados atualizam clientes" ON public.customers FOR UPDATE TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Admins removem clientes" ON public.customers FOR DELETE TO authenticated USING (public.has_role(auth.uid(),'administrador'));

-- ORDERS
CREATE SEQUENCE public.order_number_seq START 1000;
CREATE TABLE public.orders (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid REFERENCES public.companies(id) ON DELETE SET NULL,
  order_number bigint NOT NULL DEFAULT nextval('public.order_number_seq') UNIQUE,
  customer_id uuid REFERENCES public.customers(id) ON DELETE SET NULL,
  customer_name text,
  customer_phone text,
  delivery_address text,
  status public.order_status NOT NULL DEFAULT 'recebido',
  payment_method public.payment_method NOT NULL DEFAULT 'dinheiro',
  payment_status public.payment_status NOT NULL DEFAULT 'pendente',
  notes text,
  subtotal numeric NOT NULL DEFAULT 0,
  delivery_fee numeric NOT NULL DEFAULT 0,
  discount numeric NOT NULL DEFAULT 0,
  total numeric GENERATED ALWAYS AS (GREATEST(subtotal + delivery_fee - discount, 0)) STORED,
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.orders TO authenticated;
GRANT ALL ON public.orders TO service_role;
GRANT USAGE, SELECT ON SEQUENCE public.order_number_seq TO authenticated, service_role;
ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Autenticados veem pedidos" ON public.orders FOR SELECT TO authenticated USING (true);
CREATE POLICY "Autenticados criam pedidos" ON public.orders FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Autenticados atualizam pedidos" ON public.orders FOR UPDATE TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Admins removem pedidos" ON public.orders FOR DELETE TO authenticated USING (public.has_role(auth.uid(),'administrador'));

-- ORDER ITEMS
CREATE TABLE public.order_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id uuid NOT NULL REFERENCES public.orders(id) ON DELETE CASCADE,
  product_id uuid REFERENCES public.products(id) ON DELETE SET NULL,
  product_name text NOT NULL,
  quantity numeric NOT NULL DEFAULT 1,
  unit_price numeric NOT NULL DEFAULT 0,
  notes text,
  line_total numeric GENERATED ALWAYS AS (quantity * unit_price) STORED,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.order_items TO authenticated;
GRANT ALL ON public.order_items TO service_role;
ALTER TABLE public.order_items ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Autenticados veem itens" ON public.order_items FOR SELECT TO authenticated USING (true);
CREATE POLICY "Autenticados criam itens" ON public.order_items FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Autenticados atualizam itens" ON public.order_items FOR UPDATE TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Autenticados removem itens" ON public.order_items FOR DELETE TO authenticated USING (true);

-- PAYMENTS
CREATE TABLE public.payments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id uuid NOT NULL REFERENCES public.orders(id) ON DELETE CASCADE,
  amount numeric NOT NULL DEFAULT 0,
  method public.payment_method NOT NULL DEFAULT 'dinheiro',
  status public.payment_status NOT NULL DEFAULT 'pendente',
  paid_at timestamptz,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.payments TO authenticated;
GRANT ALL ON public.payments TO service_role;
ALTER TABLE public.payments ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Autenticados veem pagamentos" ON public.payments FOR SELECT TO authenticated USING (true);
CREATE POLICY "Autenticados criam pagamentos" ON public.payments FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Autenticados atualizam pagamentos" ON public.payments FOR UPDATE TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Admins removem pagamentos" ON public.payments FOR DELETE TO authenticated USING (public.has_role(auth.uid(),'administrador'));

-- ORDER STATUS HISTORY (timeline)
CREATE TABLE public.order_status_history (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id uuid NOT NULL REFERENCES public.orders(id) ON DELETE CASCADE,
  status public.order_status NOT NULL,
  note text,
  changed_by uuid,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT ON public.order_status_history TO authenticated;
GRANT ALL ON public.order_status_history TO service_role;
ALTER TABLE public.order_status_history ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Autenticados veem historico" ON public.order_status_history FOR SELECT TO authenticated USING (true);
CREATE POLICY "Autenticados criam historico" ON public.order_status_history FOR INSERT TO authenticated WITH CHECK (true);

-- INDEXES
CREATE INDEX idx_orders_status ON public.orders(status);
CREATE INDEX idx_orders_created_at ON public.orders(created_at DESC);
CREATE INDEX idx_order_items_order ON public.order_items(order_id);
CREATE INDEX idx_payments_order ON public.payments(order_id);
CREATE INDEX idx_history_order ON public.order_status_history(order_id, created_at);

-- TRIGGERS
CREATE TRIGGER set_customers_updated_at BEFORE UPDATE ON public.customers FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE TRIGGER set_orders_updated_at BEFORE UPDATE ON public.orders FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE TRIGGER set_payments_updated_at BEFORE UPDATE ON public.payments FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- Recalcula subtotal do pedido a partir dos itens
CREATE OR REPLACE FUNCTION public.recalc_order_subtotal()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_order uuid;
BEGIN
  v_order := COALESCE(NEW.order_id, OLD.order_id);
  UPDATE public.orders o
     SET subtotal = COALESCE((SELECT SUM(i.line_total) FROM public.order_items i WHERE i.order_id = v_order), 0)
   WHERE o.id = v_order;
  RETURN NULL;
END; $$;
REVOKE EXECUTE ON FUNCTION public.recalc_order_subtotal() FROM public, anon, authenticated;

CREATE TRIGGER order_items_recalc
AFTER INSERT OR UPDATE OR DELETE ON public.order_items
FOR EACH ROW EXECUTE FUNCTION public.recalc_order_subtotal();

-- Histórico automático de status
CREATE OR REPLACE FUNCTION public.log_order_status()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    INSERT INTO public.order_status_history (order_id, status, changed_by) VALUES (NEW.id, NEW.status, auth.uid());
  ELSIF NEW.status IS DISTINCT FROM OLD.status THEN
    INSERT INTO public.order_status_history (order_id, status, changed_by) VALUES (NEW.id, NEW.status, auth.uid());
  END IF;
  RETURN NULL;
END; $$;
REVOKE EXECUTE ON FUNCTION public.log_order_status() FROM public, anon, authenticated;

CREATE TRIGGER orders_status_log
AFTER INSERT OR UPDATE OF status ON public.orders
FOR EACH ROW EXECUTE FUNCTION public.log_order_status();

-- SEED clientes
INSERT INTO public.customers (company_id, name, phone, address)
SELECT (SELECT id FROM public.companies ORDER BY created_at LIMIT 1), v.name, v.phone, v.address
FROM (VALUES
  ('Maria Souza','(11) 98888-1010','Rua das Flores, 120 - Centro'),
  ('João Pereira','(11) 97777-2020','Av. Brasil, 900 - Jardim'),
  ('Ana Lima','(11) 96666-3030','Rua Acácias, 45 - Vila Nova')
) AS v(name, phone, address);
