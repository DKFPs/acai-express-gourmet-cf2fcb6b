
CREATE TYPE public.movement_type AS ENUM ('entrada', 'saida', 'ajuste');

-- SUPPLIERS
CREATE TABLE public.suppliers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid REFERENCES public.companies(id),
  name text NOT NULL,
  document text,
  phone text,
  email text,
  address text,
  notes text,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.suppliers TO authenticated;
GRANT ALL ON public.suppliers TO service_role;
ALTER TABLE public.suppliers ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Autenticados veem fornecedores" ON public.suppliers FOR SELECT TO authenticated USING (true);
CREATE POLICY "Autenticados criam fornecedores" ON public.suppliers FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Autenticados atualizam fornecedores" ON public.suppliers FOR UPDATE TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Admins removem fornecedores" ON public.suppliers FOR DELETE TO authenticated USING (has_role(auth.uid(), 'administrador'::app_role));

-- INGREDIENTS
CREATE TABLE public.ingredients (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid REFERENCES public.companies(id),
  category_id uuid REFERENCES public.categories(id),
  supplier_id uuid REFERENCES public.suppliers(id),
  name text NOT NULL,
  unit text NOT NULL DEFAULT 'kg',
  quantity numeric NOT NULL DEFAULT 0,
  min_stock numeric NOT NULL DEFAULT 0,
  purchase_price numeric NOT NULL DEFAULT 0,
  notes text,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.ingredients TO authenticated;
GRANT ALL ON public.ingredients TO service_role;
ALTER TABLE public.ingredients ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Autenticados veem ingredientes" ON public.ingredients FOR SELECT TO authenticated USING (true);
CREATE POLICY "Autenticados criam ingredientes" ON public.ingredients FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Autenticados atualizam ingredientes" ON public.ingredients FOR UPDATE TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Admins removem ingredientes" ON public.ingredients FOR DELETE TO authenticated USING (has_role(auth.uid(), 'administrador'::app_role));

-- RECIPES
CREATE TABLE public.product_ingredients (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id uuid NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
  ingredient_id uuid NOT NULL REFERENCES public.ingredients(id) ON DELETE CASCADE,
  quantity numeric NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (product_id, ingredient_id)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.product_ingredients TO authenticated;
GRANT ALL ON public.product_ingredients TO service_role;
ALTER TABLE public.product_ingredients ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Autenticados veem receitas" ON public.product_ingredients FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admins gerenciam receitas" ON public.product_ingredients FOR ALL TO authenticated USING (has_role(auth.uid(), 'administrador'::app_role)) WITH CHECK (has_role(auth.uid(), 'administrador'::app_role));

-- MOVEMENTS
CREATE TABLE public.stock_movements (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid REFERENCES public.companies(id),
  ingredient_id uuid NOT NULL REFERENCES public.ingredients(id) ON DELETE CASCADE,
  type public.movement_type NOT NULL,
  quantity numeric NOT NULL,
  unit_cost numeric NOT NULL DEFAULT 0,
  total_cost numeric GENERATED ALWAYS AS (quantity * unit_cost) STORED,
  reason text,
  order_id uuid REFERENCES public.orders(id) ON DELETE SET NULL,
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_stock_movements_ingredient ON public.stock_movements(ingredient_id, created_at DESC);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.stock_movements TO authenticated;
GRANT ALL ON public.stock_movements TO service_role;
ALTER TABLE public.stock_movements ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Autenticados veem movimentacoes" ON public.stock_movements FOR SELECT TO authenticated USING (true);
CREATE POLICY "Autenticados criam movimentacoes" ON public.stock_movements FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Admins removem movimentacoes" ON public.stock_movements FOR DELETE TO authenticated USING (has_role(auth.uid(), 'administrador'::app_role));

-- updated_at triggers
CREATE TRIGGER set_suppliers_updated_at BEFORE UPDATE ON public.suppliers FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE TRIGGER set_ingredients_updated_at BEFORE UPDATE ON public.ingredients FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- apply movement to ingredient quantity
CREATE OR REPLACE FUNCTION public.apply_stock_movement()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NEW.type = 'entrada' THEN
    UPDATE public.ingredients SET quantity = quantity + NEW.quantity WHERE id = NEW.ingredient_id;
  ELSIF NEW.type = 'saida' THEN
    UPDATE public.ingredients SET quantity = quantity - NEW.quantity WHERE id = NEW.ingredient_id;
  ELSE
    UPDATE public.ingredients SET quantity = NEW.quantity WHERE id = NEW.ingredient_id;
  END IF;
  RETURN NULL;
END; $$;
REVOKE EXECUTE ON FUNCTION public.apply_stock_movement() FROM public, anon, authenticated;
CREATE TRIGGER trg_apply_stock_movement AFTER INSERT ON public.stock_movements FOR EACH ROW EXECUTE FUNCTION public.apply_stock_movement();

-- consume stock on sale
CREATE OR REPLACE FUNCTION public.consume_stock_on_order_item()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE r RECORD;
BEGIN
  IF NEW.product_id IS NULL THEN RETURN NULL; END IF;

  UPDATE public.products SET stock_quantity = stock_quantity - NEW.quantity WHERE id = NEW.product_id;

  FOR r IN SELECT pi.ingredient_id, pi.quantity, i.purchase_price
           FROM public.product_ingredients pi
           JOIN public.ingredients i ON i.id = pi.ingredient_id
           WHERE pi.product_id = NEW.product_id
  LOOP
    INSERT INTO public.stock_movements (ingredient_id, type, quantity, unit_cost, reason, order_id, created_by)
    VALUES (r.ingredient_id, 'saida', r.quantity * NEW.quantity, r.purchase_price, 'Venda automática', NEW.order_id, auth.uid());
  END LOOP;
  RETURN NULL;
END; $$;
REVOKE EXECUTE ON FUNCTION public.consume_stock_on_order_item() FROM public, anon, authenticated;
CREATE TRIGGER trg_consume_stock AFTER INSERT ON public.order_items FOR EACH ROW EXECUTE FUNCTION public.consume_stock_on_order_item();

-- restore stock when order is cancelled
CREATE OR REPLACE FUNCTION public.restore_stock_on_cancel()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE r RECORD;
BEGIN
  IF NEW.status = 'cancelado' AND OLD.status IS DISTINCT FROM 'cancelado' THEN
    FOR r IN SELECT oi.product_id, oi.quantity FROM public.order_items oi WHERE oi.order_id = NEW.id AND oi.product_id IS NOT NULL
    LOOP
      UPDATE public.products SET stock_quantity = stock_quantity + r.quantity WHERE id = r.product_id;
      INSERT INTO public.stock_movements (ingredient_id, type, quantity, unit_cost, reason, order_id, created_by)
      SELECT pi.ingredient_id, 'entrada', pi.quantity * r.quantity, i.purchase_price, 'Estorno de pedido cancelado', NEW.id, auth.uid()
      FROM public.product_ingredients pi JOIN public.ingredients i ON i.id = pi.ingredient_id
      WHERE pi.product_id = r.product_id;
    END LOOP;
  END IF;
  RETURN NULL;
END; $$;
REVOKE EXECUTE ON FUNCTION public.restore_stock_on_cancel() FROM public, anon, authenticated;
CREATE TRIGGER trg_restore_stock AFTER UPDATE ON public.orders FOR EACH ROW EXECUTE FUNCTION public.restore_stock_on_cancel();

-- seed
INSERT INTO public.suppliers (name, phone, email, notes) VALUES
  ('Distribuidora Amazônia', '(11) 3333-1000', 'contato@amazonia.com', 'Polpas e frutas'),
  ('Atacado Doce Mais', '(11) 3333-2000', 'vendas@docemais.com', 'Complementos e caldas'),
  ('Embalagens Prime', '(11) 3333-3000', 'prime@embalagens.com', 'Copos, tampas e colheres');

INSERT INTO public.ingredients (name, unit, quantity, min_stock, purchase_price, supplier_id, category_id)
SELECT v.name, v.unit, v.qty, v.minq, v.price,
  (SELECT id FROM public.suppliers WHERE name = v.supplier),
  (SELECT id FROM public.categories ORDER BY created_at LIMIT 1)
FROM (VALUES
  ('Polpa de Açaí', 'kg', 48, 20, 18.50, 'Distribuidora Amazônia'),
  ('Banana', 'kg', 12, 15, 6.90, 'Distribuidora Amazônia'),
  ('Leite Condensado', 'l', 25, 10, 12.40, 'Atacado Doce Mais'),
  ('Granola', 'kg', 8, 10, 22.00, 'Atacado Doce Mais'),
  ('Copo 500ml', 'un', 400, 200, 0.75, 'Embalagens Prime')
) AS v(name, unit, qty, minq, price, supplier);
