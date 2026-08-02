
-- ============ RECIPES: cost + shelf life columns ============
ALTER TABLE public.recipes
  ADD COLUMN IF NOT EXISTS ingredients_cost numeric NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS packaging_cost numeric NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS total_cost numeric NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS cost_per_unit numeric NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS target_margin_percent numeric NOT NULL DEFAULT 40,
  ADD COLUMN IF NOT EXISTS min_sale_price numeric NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS sale_price numeric NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS margin_percent numeric NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS profit_per_unit numeric NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS shelf_life_days integer NOT NULL DEFAULT 5;

-- ============ PRODUCTION BATCHES: validity ============
ALTER TABLE public.production_batches
  ADD COLUMN IF NOT EXISTS batch_code text,
  ADD COLUMN IF NOT EXISTS expires_at date,
  ADD COLUMN IF NOT EXISTS discarded_quantity numeric NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS status text NOT NULL DEFAULT 'ativo',
  ADD COLUMN IF NOT EXISTS unit_cost numeric NOT NULL DEFAULT 0;

-- ============ RECIPE COST HISTORY ============
CREATE TABLE IF NOT EXISTS public.recipe_cost_history (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  recipe_id uuid NOT NULL REFERENCES public.recipes(id) ON DELETE CASCADE,
  ingredients_cost numeric NOT NULL DEFAULT 0,
  packaging_cost numeric NOT NULL DEFAULT 0,
  total_cost numeric NOT NULL DEFAULT 0,
  cost_per_unit numeric NOT NULL DEFAULT 0,
  min_sale_price numeric NOT NULL DEFAULT 0,
  margin_percent numeric NOT NULL DEFAULT 0,
  reason text,
  created_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT ON public.recipe_cost_history TO authenticated;
GRANT ALL ON public.recipe_cost_history TO service_role;
ALTER TABLE public.recipe_cost_history ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "cost history select" ON public.recipe_cost_history;
CREATE POLICY "cost history select" ON public.recipe_cost_history
  FOR SELECT TO authenticated USING (company_id = public.current_company_id());
DROP POLICY IF EXISTS "cost history insert" ON public.recipe_cost_history;
CREATE POLICY "cost history insert" ON public.recipe_cost_history
  FOR INSERT TO authenticated WITH CHECK (company_id = public.current_company_id());

CREATE INDEX IF NOT EXISTS idx_recipe_cost_history_recipe ON public.recipe_cost_history(recipe_id, created_at DESC);

-- ============ BATCH LABELS ============
CREATE TABLE IF NOT EXISTS public.batch_labels (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  batch_id uuid NOT NULL REFERENCES public.production_batches(id) ON DELETE CASCADE,
  flavor_name text NOT NULL,
  volume_ml numeric NOT NULL DEFAULT 0,
  batch_code text NOT NULL,
  manufactured_at date NOT NULL,
  expires_at date NOT NULL,
  qr_payload text NOT NULL,
  quantity numeric NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.batch_labels TO authenticated;
GRANT ALL ON public.batch_labels TO service_role;
ALTER TABLE public.batch_labels ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "labels select" ON public.batch_labels;
CREATE POLICY "labels select" ON public.batch_labels
  FOR SELECT TO authenticated USING (company_id = public.current_company_id());
DROP POLICY IF EXISTS "labels manage" ON public.batch_labels;
CREATE POLICY "labels manage" ON public.batch_labels
  FOR ALL TO authenticated
  USING (company_id = public.current_company_id())
  WITH CHECK (company_id = public.current_company_id());

CREATE INDEX IF NOT EXISTS idx_batch_labels_batch ON public.batch_labels(batch_id);

-- ============ COST ENGINE ============
CREATE OR REPLACE FUNCTION public.recalc_recipe_costs(_recipe_id uuid, _reason text DEFAULT 'Recalculo automático')
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_recipe public.recipes%ROWTYPE;
  v_ing numeric := 0;
  v_pack numeric := 0;
  v_total numeric := 0;
  v_unit numeric := 0;
  v_min numeric := 0;
  v_margin numeric := 0;
  v_profit numeric := 0;
  v_target numeric;
BEGIN
  SELECT * INTO v_recipe FROM public.recipes WHERE id = _recipe_id;
  IF NOT FOUND THEN RETURN; END IF;

  SELECT COALESCE(SUM(ri.quantity * i.purchase_price), 0) INTO v_ing
  FROM public.recipe_items ri
  JOIN public.ingredients i ON i.id = ri.ingredient_id
  WHERE ri.recipe_id = _recipe_id;

  SELECT COALESCE(SUM(p.unit_cost), 0) INTO v_pack
  FROM (
    SELECT DISTINCT ON (type) unit_cost
    FROM public.packaging_stock
    WHERE company_id = v_recipe.company_id AND is_active AND type <> 'outro'
    ORDER BY type, created_at
  ) p;

  v_pack := v_pack * GREATEST(v_recipe.yield_quantity, 0);
  v_total := v_ing + v_pack;
  v_unit := CASE WHEN v_recipe.yield_quantity > 0 THEN v_total / v_recipe.yield_quantity ELSE 0 END;

  v_target := LEAST(GREATEST(COALESCE(v_recipe.target_margin_percent, 40), 0), 95);
  v_min := CASE WHEN v_target < 100 THEN v_unit / (1 - v_target / 100.0) ELSE v_unit END;

  IF COALESCE(v_recipe.sale_price, 0) > 0 THEN
    v_profit := v_recipe.sale_price - v_unit;
    v_margin := (v_profit / v_recipe.sale_price) * 100;
  ELSE
    v_profit := 0;
    v_margin := 0;
  END IF;

  UPDATE public.recipes SET
    ingredients_cost = ROUND(v_ing, 4),
    packaging_cost = ROUND(v_pack, 4),
    total_cost = ROUND(v_total, 4),
    cost_per_unit = ROUND(v_unit, 4),
    min_sale_price = ROUND(v_min, 2),
    margin_percent = ROUND(v_margin, 2),
    profit_per_unit = ROUND(v_profit, 4)
  WHERE id = _recipe_id;

  IF v_recipe.total_cost IS DISTINCT FROM ROUND(v_total, 4) THEN
    INSERT INTO public.recipe_cost_history
      (company_id, recipe_id, ingredients_cost, packaging_cost, total_cost, cost_per_unit, min_sale_price, margin_percent, reason)
    VALUES (v_recipe.company_id, _recipe_id, ROUND(v_ing,4), ROUND(v_pack,4), ROUND(v_total,4), ROUND(v_unit,4), ROUND(v_min,2), ROUND(v_margin,2), _reason);
  END IF;
END; $$;

CREATE OR REPLACE FUNCTION public.recalc_recipes_for_ingredient()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE r RECORD;
BEGIN
  IF TG_OP = 'UPDATE' AND NEW.purchase_price IS NOT DISTINCT FROM OLD.purchase_price THEN
    RETURN NULL;
  END IF;
  FOR r IN SELECT DISTINCT recipe_id FROM public.recipe_items WHERE ingredient_id = NEW.id LOOP
    PERFORM public.recalc_recipe_costs(r.recipe_id, 'Alteração de preço do ingrediente ' || NEW.name);
  END LOOP;
  RETURN NULL;
END; $$;

DROP TRIGGER IF EXISTS trg_recalc_recipes_ingredient ON public.ingredients;
CREATE TRIGGER trg_recalc_recipes_ingredient
AFTER UPDATE OF purchase_price ON public.ingredients
FOR EACH ROW EXECUTE FUNCTION public.recalc_recipes_for_ingredient();

CREATE OR REPLACE FUNCTION public.recalc_recipes_for_packaging()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE r RECORD; v_company uuid;
BEGIN
  v_company := COALESCE(NEW.company_id, OLD.company_id);
  FOR r IN SELECT id FROM public.recipes WHERE company_id = v_company LOOP
    PERFORM public.recalc_recipe_costs(r.id, 'Alteração no custo de embalagens');
  END LOOP;
  RETURN NULL;
END; $$;

DROP TRIGGER IF EXISTS trg_recalc_recipes_packaging ON public.packaging_stock;
CREATE TRIGGER trg_recalc_recipes_packaging
AFTER INSERT OR UPDATE OF unit_cost, is_active, type OR DELETE ON public.packaging_stock
FOR EACH ROW EXECUTE FUNCTION public.recalc_recipes_for_packaging();

CREATE OR REPLACE FUNCTION public.recalc_recipe_on_items()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  PERFORM public.recalc_recipe_costs(COALESCE(NEW.recipe_id, OLD.recipe_id), 'Alteração na ficha técnica');
  RETURN NULL;
END; $$;

DROP TRIGGER IF EXISTS trg_recalc_recipe_items ON public.recipe_items;
CREATE TRIGGER trg_recalc_recipe_items
AFTER INSERT OR UPDATE OR DELETE ON public.recipe_items
FOR EACH ROW EXECUTE FUNCTION public.recalc_recipe_on_items();

CREATE OR REPLACE FUNCTION public.recalc_recipe_on_recipe()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NEW.yield_quantity IS DISTINCT FROM OLD.yield_quantity
     OR NEW.sale_price IS DISTINCT FROM OLD.sale_price
     OR NEW.target_margin_percent IS DISTINCT FROM OLD.target_margin_percent THEN
    PERFORM public.recalc_recipe_costs(NEW.id, 'Alteração na receita');
  END IF;
  RETURN NULL;
END; $$;

DROP TRIGGER IF EXISTS trg_recalc_recipe_self ON public.recipes;
CREATE TRIGGER trg_recalc_recipe_self
AFTER UPDATE ON public.recipes
FOR EACH ROW EXECUTE FUNCTION public.recalc_recipe_on_recipe();

-- ============ PRODUCE BATCH v2 (validity + label) ============
CREATE OR REPLACE FUNCTION public.produce_batch(_recipe_id uuid, _batches numeric, _produced_at timestamp with time zone DEFAULT now(), _responsible_id uuid DEFAULT NULL::uuid, _notes text DEFAULT NULL::text)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_company uuid := public.current_company_id();
  v_recipe public.recipes%ROWTYPE;
  v_batch_id uuid;
  v_produced numeric;
  v_total_cost numeric := 0;
  v_fp uuid;
  v_code text;
  v_expires date;
  v_seq bigint;
  r RECORD;
  p RECORD;
BEGIN
  IF v_company IS NULL THEN RAISE EXCEPTION 'Empresa não identificada'; END IF;
  IF _batches IS NULL OR _batches <= 0 THEN RAISE EXCEPTION 'Quantidade de lotes inválida'; END IF;

  SELECT * INTO v_recipe FROM public.recipes WHERE id = _recipe_id AND company_id = v_company;
  IF NOT FOUND THEN RAISE EXCEPTION 'Receita não encontrada'; END IF;

  v_produced := v_recipe.yield_quantity * _batches;
  v_expires := (COALESCE(_produced_at, now()))::date + COALESCE(v_recipe.shelf_life_days, 5);

  SELECT COUNT(*) + 1 INTO v_seq FROM public.production_batches WHERE company_id = v_company;
  v_code := 'L' || to_char(COALESCE(_produced_at, now()), 'YYMMDD') || '-' || lpad(v_seq::text, 4, '0');

  INSERT INTO public.production_batches (company_id, recipe_id, batches, produced_quantity, produced_at, responsible_id,
    responsible_name, notes, created_by, batch_code, expires_at)
  VALUES (v_company, _recipe_id, _batches, v_produced, COALESCE(_produced_at, now()), COALESCE(_responsible_id, auth.uid()),
    (SELECT full_name FROM public.profiles WHERE id = COALESCE(_responsible_id, auth.uid())), _notes, auth.uid(), v_code, v_expires)
  RETURNING id INTO v_batch_id;

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

  UPDATE public.production_batches
     SET total_cost = v_total_cost,
         unit_cost = CASE WHEN v_produced > 0 THEN ROUND(v_total_cost / v_produced, 4) ELSE 0 END
   WHERE id = v_batch_id;

  SELECT id INTO v_fp FROM public.finished_products WHERE company_id = v_company AND recipe_id = _recipe_id;
  IF v_fp IS NULL THEN
    INSERT INTO public.finished_products (company_id, recipe_id, name, unit)
    VALUES (v_company, _recipe_id, v_recipe.name, 'un') RETURNING id INTO v_fp;
  END IF;

  INSERT INTO public.finished_product_movements (company_id, finished_product_id, batch_id, type, quantity, reason, created_by)
  VALUES (v_company, v_fp, v_batch_id, 'producao', v_produced, 'Produção de lote', auth.uid());

  INSERT INTO public.batch_labels (company_id, batch_id, flavor_name, volume_ml, batch_code, manufactured_at, expires_at, qr_payload, quantity)
  VALUES (v_company, v_batch_id, v_recipe.name, v_recipe.bottle_volume_ml, v_code,
          (COALESCE(_produced_at, now()))::date, v_expires, '/producao/lote/' || v_batch_id, v_produced);

  RETURN v_batch_id;
END; $function$;

-- ============ DISCARD EXPIRED ============
CREATE OR REPLACE FUNCTION public.discard_batch(_batch_id uuid, _quantity numeric DEFAULT NULL, _reason text DEFAULT 'Descarte por vencimento')
RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_company uuid := public.current_company_id();
  v_batch public.production_batches%ROWTYPE;
  v_fp uuid;
  v_qty numeric;
BEGIN
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

-- ============ BACKFILL ============
UPDATE public.production_batches b
   SET batch_code = COALESCE(b.batch_code, 'L' || to_char(b.produced_at, 'YYMMDD') || '-' || substr(b.id::text, 1, 4)),
       expires_at = COALESCE(b.expires_at, (b.produced_at::date + 5)),
       unit_cost = CASE WHEN b.produced_quantity > 0 THEN ROUND(b.total_cost / b.produced_quantity, 4) ELSE 0 END;

DO $$
DECLARE r RECORD;
BEGIN
  FOR r IN SELECT id FROM public.recipes LOOP
    PERFORM public.recalc_recipe_costs(r.id, 'Carga inicial de custos');
  END LOOP;
END $$;

-- ============ REALTIME ============
ALTER TABLE public.production_batches REPLICA IDENTITY FULL;
ALTER TABLE public.finished_products REPLICA IDENTITY FULL;
ALTER TABLE public.finished_product_movements REPLICA IDENTITY FULL;
ALTER TABLE public.recipes REPLICA IDENTITY FULL;

DO $$
BEGIN
  BEGIN ALTER PUBLICATION supabase_realtime ADD TABLE public.production_batches; EXCEPTION WHEN duplicate_object THEN NULL; END;
  BEGIN ALTER PUBLICATION supabase_realtime ADD TABLE public.finished_products; EXCEPTION WHEN duplicate_object THEN NULL; END;
  BEGIN ALTER PUBLICATION supabase_realtime ADD TABLE public.finished_product_movements; EXCEPTION WHEN duplicate_object THEN NULL; END;
  BEGIN ALTER PUBLICATION supabase_realtime ADD TABLE public.recipes; EXCEPTION WHEN duplicate_object THEN NULL; END;
END $$;
