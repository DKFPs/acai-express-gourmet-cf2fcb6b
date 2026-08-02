
-- ENUMS
CREATE TYPE public.packaging_type AS ENUM ('garrafa','tampa','canudo','lacre','etiqueta','outro');
CREATE TYPE public.finished_movement_type AS ENUM ('producao','venda','descarte','reserva','ajuste','estorno');

-- RECIPES
CREATE TABLE public.recipes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  category_id uuid REFERENCES public.categories(id) ON DELETE SET NULL,
  name text NOT NULL,
  description text,
  image_url text,
  bottle_volume_ml numeric NOT NULL DEFAULT 300,
  yield_quantity numeric NOT NULL DEFAULT 1,
  prep_time_minutes integer NOT NULL DEFAULT 0,
  status public.product_status NOT NULL DEFAULT 'ativo',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.recipes TO authenticated;
GRANT ALL ON public.recipes TO service_role;
ALTER TABLE public.recipes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "recipes_select" ON public.recipes FOR SELECT TO authenticated USING (company_id = public.current_company_id());
CREATE POLICY "recipes_insert" ON public.recipes FOR INSERT TO authenticated WITH CHECK (company_id = public.current_company_id());
CREATE POLICY "recipes_update" ON public.recipes FOR UPDATE TO authenticated USING (company_id = public.current_company_id()) WITH CHECK (company_id = public.current_company_id());
CREATE POLICY "recipes_delete" ON public.recipes FOR DELETE TO authenticated USING (company_id = public.current_company_id() AND public.is_company_admin());
CREATE TRIGGER set_recipes_updated_at BEFORE UPDATE ON public.recipes FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- RECIPE ITEMS
CREATE TABLE public.recipe_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  recipe_id uuid NOT NULL REFERENCES public.recipes(id) ON DELETE CASCADE,
  ingredient_id uuid NOT NULL REFERENCES public.ingredients(id) ON DELETE RESTRICT,
  quantity numeric NOT NULL DEFAULT 0,
  unit text NOT NULL DEFAULT 'un',
  sort_order integer NOT NULL DEFAULT 0,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_recipe_items_recipe ON public.recipe_items(recipe_id);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.recipe_items TO authenticated;
GRANT ALL ON public.recipe_items TO service_role;
ALTER TABLE public.recipe_items ENABLE ROW LEVEL SECURITY;
CREATE POLICY "recipe_items_all" ON public.recipe_items FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM public.recipes r WHERE r.id = recipe_id AND r.company_id = public.current_company_id()))
  WITH CHECK (EXISTS (SELECT 1 FROM public.recipes r WHERE r.id = recipe_id AND r.company_id = public.current_company_id()));

-- PACKAGING STOCK
CREATE TABLE public.packaging_stock (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  type public.packaging_type NOT NULL,
  name text NOT NULL,
  unit text NOT NULL DEFAULT 'un',
  quantity numeric NOT NULL DEFAULT 0,
  min_stock numeric NOT NULL DEFAULT 0,
  unit_cost numeric NOT NULL DEFAULT 0,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_packaging_company ON public.packaging_stock(company_id);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.packaging_stock TO authenticated;
GRANT ALL ON public.packaging_stock TO service_role;
ALTER TABLE public.packaging_stock ENABLE ROW LEVEL SECURITY;
CREATE POLICY "packaging_select" ON public.packaging_stock FOR SELECT TO authenticated USING (company_id = public.current_company_id());
CREATE POLICY "packaging_insert" ON public.packaging_stock FOR INSERT TO authenticated WITH CHECK (company_id = public.current_company_id());
CREATE POLICY "packaging_update" ON public.packaging_stock FOR UPDATE TO authenticated USING (company_id = public.current_company_id()) WITH CHECK (company_id = public.current_company_id());
CREATE POLICY "packaging_delete" ON public.packaging_stock FOR DELETE TO authenticated USING (company_id = public.current_company_id() AND public.is_company_admin());
CREATE TRIGGER set_packaging_updated_at BEFORE UPDATE ON public.packaging_stock FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- FINISHED PRODUCTS
CREATE TABLE public.finished_products (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  recipe_id uuid REFERENCES public.recipes(id) ON DELETE SET NULL,
  product_id uuid REFERENCES public.products(id) ON DELETE SET NULL,
  name text NOT NULL,
  unit text NOT NULL DEFAULT 'un',
  quantity_available numeric NOT NULL DEFAULT 0,
  quantity_produced numeric NOT NULL DEFAULT 0,
  quantity_sold numeric NOT NULL DEFAULT 0,
  quantity_discarded numeric NOT NULL DEFAULT 0,
  quantity_reserved numeric NOT NULL DEFAULT 0,
  min_stock numeric NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (company_id, recipe_id)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.finished_products TO authenticated;
GRANT ALL ON public.finished_products TO service_role;
ALTER TABLE public.finished_products ENABLE ROW LEVEL SECURITY;
CREATE POLICY "finished_select" ON public.finished_products FOR SELECT TO authenticated USING (company_id = public.current_company_id());
CREATE POLICY "finished_insert" ON public.finished_products FOR INSERT TO authenticated WITH CHECK (company_id = public.current_company_id());
CREATE POLICY "finished_update" ON public.finished_products FOR UPDATE TO authenticated USING (company_id = public.current_company_id()) WITH CHECK (company_id = public.current_company_id());
CREATE POLICY "finished_delete" ON public.finished_products FOR DELETE TO authenticated USING (company_id = public.current_company_id() AND public.is_company_admin());
CREATE TRIGGER set_finished_products_updated_at BEFORE UPDATE ON public.finished_products FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- PRODUCTION BATCHES
CREATE TABLE public.production_batches (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  recipe_id uuid NOT NULL REFERENCES public.recipes(id) ON DELETE RESTRICT,
  batches numeric NOT NULL DEFAULT 1,
  produced_quantity numeric NOT NULL DEFAULT 0,
  produced_at timestamptz NOT NULL DEFAULT now(),
  responsible_id uuid,
  responsible_name text,
  notes text,
  total_cost numeric NOT NULL DEFAULT 0,
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_batches_company_date ON public.production_batches(company_id, produced_at DESC);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.production_batches TO authenticated;
GRANT ALL ON public.production_batches TO service_role;
ALTER TABLE public.production_batches ENABLE ROW LEVEL SECURITY;
CREATE POLICY "batches_select" ON public.production_batches FOR SELECT TO authenticated USING (company_id = public.current_company_id());
CREATE POLICY "batches_insert" ON public.production_batches FOR INSERT TO authenticated WITH CHECK (company_id = public.current_company_id());
CREATE POLICY "batches_update" ON public.production_batches FOR UPDATE TO authenticated USING (company_id = public.current_company_id()) WITH CHECK (company_id = public.current_company_id());
CREATE POLICY "batches_delete" ON public.production_batches FOR DELETE TO authenticated USING (company_id = public.current_company_id() AND public.is_company_admin());

-- PRODUCTION ITEMS
CREATE TABLE public.production_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  batch_id uuid NOT NULL REFERENCES public.production_batches(id) ON DELETE CASCADE,
  ingredient_id uuid REFERENCES public.ingredients(id) ON DELETE SET NULL,
  packaging_id uuid REFERENCES public.packaging_stock(id) ON DELETE SET NULL,
  item_name text NOT NULL,
  quantity numeric NOT NULL DEFAULT 0,
  unit text NOT NULL DEFAULT 'un',
  unit_cost numeric NOT NULL DEFAULT 0,
  total_cost numeric GENERATED ALWAYS AS (quantity * unit_cost) STORED,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_production_items_batch ON public.production_items(batch_id);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.production_items TO authenticated;
GRANT ALL ON public.production_items TO service_role;
ALTER TABLE public.production_items ENABLE ROW LEVEL SECURITY;
CREATE POLICY "production_items_all" ON public.production_items FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM public.production_batches b WHERE b.id = batch_id AND b.company_id = public.current_company_id()))
  WITH CHECK (EXISTS (SELECT 1 FROM public.production_batches b WHERE b.id = batch_id AND b.company_id = public.current_company_id()));

-- FINISHED PRODUCT MOVEMENTS
CREATE TABLE public.finished_product_movements (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  finished_product_id uuid NOT NULL REFERENCES public.finished_products(id) ON DELETE CASCADE,
  batch_id uuid REFERENCES public.production_batches(id) ON DELETE SET NULL,
  type public.finished_movement_type NOT NULL,
  quantity numeric NOT NULL,
  reason text,
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_fp_movements_company ON public.finished_product_movements(company_id, created_at DESC);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.finished_product_movements TO authenticated;
GRANT ALL ON public.finished_product_movements TO service_role;
ALTER TABLE public.finished_product_movements ENABLE ROW LEVEL SECURITY;
CREATE POLICY "fp_mov_select" ON public.finished_product_movements FOR SELECT TO authenticated USING (company_id = public.current_company_id());
CREATE POLICY "fp_mov_insert" ON public.finished_product_movements FOR INSERT TO authenticated WITH CHECK (company_id = public.current_company_id());
CREATE POLICY "fp_mov_delete" ON public.finished_product_movements FOR DELETE TO authenticated USING (company_id = public.current_company_id() AND public.is_company_admin());

-- APPLY FINISHED MOVEMENT
CREATE OR REPLACE FUNCTION public.apply_finished_movement()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $$
BEGIN
  IF NEW.type = 'producao' OR NEW.type = 'estorno' THEN
    UPDATE public.finished_products
       SET quantity_available = quantity_available + NEW.quantity,
           quantity_produced = quantity_produced + CASE WHEN NEW.type = 'producao' THEN NEW.quantity ELSE 0 END
     WHERE id = NEW.finished_product_id;
  ELSIF NEW.type = 'venda' THEN
    UPDATE public.finished_products
       SET quantity_available = quantity_available - NEW.quantity,
           quantity_sold = quantity_sold + NEW.quantity
     WHERE id = NEW.finished_product_id;
  ELSIF NEW.type = 'descarte' THEN
    UPDATE public.finished_products
       SET quantity_available = quantity_available - NEW.quantity,
           quantity_discarded = quantity_discarded + NEW.quantity
     WHERE id = NEW.finished_product_id;
  ELSIF NEW.type = 'reserva' THEN
    UPDATE public.finished_products
       SET quantity_reserved = quantity_reserved + NEW.quantity
     WHERE id = NEW.finished_product_id;
  ELSE
    UPDATE public.finished_products
       SET quantity_available = NEW.quantity
     WHERE id = NEW.finished_product_id;
  END IF;
  RETURN NULL;
END; $$;

CREATE TRIGGER trg_apply_finished_movement AFTER INSERT ON public.finished_product_movements
FOR EACH ROW EXECUTE FUNCTION public.apply_finished_movement();

-- PRODUCE BATCH (transactional)
CREATE OR REPLACE FUNCTION public.produce_batch(
  _recipe_id uuid,
  _batches numeric,
  _produced_at timestamptz DEFAULT now(),
  _responsible_id uuid DEFAULT NULL,
  _notes text DEFAULT NULL
) RETURNS uuid
LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $$
DECLARE
  v_company uuid := public.current_company_id();
  v_recipe public.recipes%ROWTYPE;
  v_batch_id uuid;
  v_produced numeric;
  v_total_cost numeric := 0;
  v_fp uuid;
  r RECORD;
  p RECORD;
BEGIN
  IF v_company IS NULL THEN RAISE EXCEPTION 'Empresa não identificada'; END IF;
  IF _batches IS NULL OR _batches <= 0 THEN RAISE EXCEPTION 'Quantidade de lotes inválida'; END IF;

  SELECT * INTO v_recipe FROM public.recipes WHERE id = _recipe_id AND company_id = v_company;
  IF NOT FOUND THEN RAISE EXCEPTION 'Receita não encontrada'; END IF;

  v_produced := v_recipe.yield_quantity * _batches;

  INSERT INTO public.production_batches (company_id, recipe_id, batches, produced_quantity, produced_at, responsible_id,
    responsible_name, notes, created_by)
  VALUES (v_company, _recipe_id, _batches, v_produced, COALESCE(_produced_at, now()), COALESCE(_responsible_id, auth.uid()),
    (SELECT full_name FROM public.profiles WHERE id = COALESCE(_responsible_id, auth.uid())), _notes, auth.uid())
  RETURNING id INTO v_batch_id;

  -- ingredientes
  FOR r IN
    SELECT ri.ingredient_id, ri.quantity * _batches AS qty, ri.unit, i.name, i.purchase_price, i.quantity AS stock
    FROM public.recipe_items ri
    JOIN public.ingredients i ON i.id = ri.ingredient_id
    WHERE ri.recipe_id = _recipe_id
  LOOP
    IF r.stock < r.qty THEN
      RAISE EXCEPTION 'Estoque insuficiente de %: disponível %, necessário %', r.name, r.stock, r.qty;
    END IF;
    INSERT INTO public.stock_movements (company_id, ingredient_id, type, quantity, unit_cost, reason, created_by)
    VALUES (v_company, r.ingredient_id, 'saida', r.qty, r.purchase_price, 'Produção de lote', auth.uid());
    INSERT INTO public.production_items (batch_id, ingredient_id, item_name, quantity, unit, unit_cost)
    VALUES (v_batch_id, r.ingredient_id, r.name, r.qty, r.unit, r.purchase_price);
    v_total_cost := v_total_cost + (r.qty * r.purchase_price);
  END LOOP;

  -- embalagens: 1 de cada por garrafinha produzida
  FOR p IN
    SELECT DISTINCT ON (type) id, type, name, quantity, unit, unit_cost
    FROM public.packaging_stock
    WHERE company_id = v_company AND is_active AND type <> 'outro'
    ORDER BY type, created_at
  LOOP
    IF p.quantity < v_produced THEN
      RAISE EXCEPTION 'Estoque insuficiente de %: disponível %, necessário %', p.name, p.quantity, v_produced;
    END IF;
    UPDATE public.packaging_stock SET quantity = quantity - v_produced WHERE id = p.id;
    INSERT INTO public.production_items (batch_id, packaging_id, item_name, quantity, unit, unit_cost)
    VALUES (v_batch_id, p.id, p.name, v_produced, p.unit, p.unit_cost);
    v_total_cost := v_total_cost + (v_produced * p.unit_cost);
  END LOOP;

  UPDATE public.production_batches SET total_cost = v_total_cost WHERE id = v_batch_id;

  -- produto pronto
  SELECT id INTO v_fp FROM public.finished_products WHERE company_id = v_company AND recipe_id = _recipe_id;
  IF v_fp IS NULL THEN
    INSERT INTO public.finished_products (company_id, recipe_id, name, unit)
    VALUES (v_company, _recipe_id, v_recipe.name, 'un') RETURNING id INTO v_fp;
  END IF;

  INSERT INTO public.finished_product_movements (company_id, finished_product_id, batch_id, type, quantity, reason, created_by)
  VALUES (v_company, v_fp, v_batch_id, 'producao', v_produced, 'Produção de lote', auth.uid());

  RETURN v_batch_id;
END; $$;

GRANT EXECUTE ON FUNCTION public.produce_batch(uuid, numeric, timestamptz, uuid, text) TO authenticated;
