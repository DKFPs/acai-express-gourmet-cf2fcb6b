-- ============ conversões de unidade ============
CREATE OR REPLACE FUNCTION app_private.unit_family(_unit text)
RETURNS text LANGUAGE sql IMMUTABLE AS $$
  SELECT CASE lower(trim(coalesce(_unit,'un')))
    WHEN 'mg' THEN 'massa' WHEN 'g' THEN 'massa' WHEN 'grama' THEN 'massa'
    WHEN 'gramas' THEN 'massa' WHEN 'kg' THEN 'massa' WHEN 'quilo' THEN 'massa'
    WHEN 'ml' THEN 'volume' WHEN 'l' THEN 'volume' WHEN 'lt' THEN 'volume'
    WHEN 'litro' THEN 'volume' WHEN 'litros' THEN 'volume'
    ELSE 'unidade' END
$$;

CREATE OR REPLACE FUNCTION app_private.base_unit_of(_unit text)
RETURNS text LANGUAGE sql IMMUTABLE AS $$
  SELECT CASE app_private.unit_family(_unit)
    WHEN 'massa' THEN 'g' WHEN 'volume' THEN 'ml' ELSE 'un' END
$$;

-- quantos "base units" cabem em 1 unidade informada
CREATE OR REPLACE FUNCTION app_private.unit_factor(_unit text)
RETURNS numeric LANGUAGE sql IMMUTABLE AS $$
  SELECT CASE lower(trim(coalesce(_unit,'un')))
    WHEN 'mg' THEN 0.001
    WHEN 'kg' THEN 1000 WHEN 'quilo' THEN 1000
    WHEN 'l' THEN 1000 WHEN 'lt' THEN 1000 WHEN 'litro' THEN 1000 WHEN 'litros' THEN 1000
    ELSE 1 END
$$;

-- converte uma quantidade para a unidade base informada (best effort se famílias diferem)
CREATE OR REPLACE FUNCTION app_private.to_base_qty(_qty numeric, _from_unit text, _base_unit text)
RETURNS numeric LANGUAGE sql IMMUTABLE AS $$
  SELECT CASE
    WHEN _qty IS NULL THEN 0
    WHEN app_private.unit_family(_from_unit) = app_private.unit_family(_base_unit)
      THEN _qty * app_private.unit_factor(_from_unit)
    ELSE _qty
  END
$$;

CREATE OR REPLACE FUNCTION app_private.convert_qty(_qty numeric, _from_unit text, _to_unit text)
RETURNS numeric LANGUAGE sql IMMUTABLE AS $$
  SELECT app_private.to_base_qty(_qty, _from_unit, app_private.base_unit_of(_to_unit))
         / NULLIF(app_private.unit_factor(_to_unit), 0)
$$;

CREATE OR REPLACE FUNCTION public.convert_qty(_qty numeric, _from_unit text, _to_unit text)
RETURNS numeric LANGUAGE sql IMMUTABLE SET search_path = public, app_private AS $$
  SELECT app_private.convert_qty(_qty, _from_unit, _to_unit)
$$;
REVOKE ALL ON FUNCTION public.convert_qty(numeric, text, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.convert_qty(numeric, text, text) TO authenticated, service_role;

-- ============ colunas novas ============
ALTER TABLE public.ingredients
  ADD COLUMN IF NOT EXISTS base_unit text NOT NULL DEFAULT 'un',
  ADD COLUMN IF NOT EXISTS cost_per_base_unit numeric NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS last_purchase_quantity numeric,
  ADD COLUMN IF NOT EXISTS last_purchase_value numeric,
  ADD COLUMN IF NOT EXISTS last_purchase_at date;

ALTER TABLE public.packaging_stock
  ADD COLUMN IF NOT EXISTS purchase_quantity numeric,
  ADD COLUMN IF NOT EXISTS purchase_value numeric,
  ADD COLUMN IF NOT EXISTS qty_per_unit numeric NOT NULL DEFAULT 1;

ALTER TABLE public.recipes
  ADD COLUMN IF NOT EXISTS sales_tax_percent numeric NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS markup numeric NOT NULL DEFAULT 0;

-- ============ manutenção automática do custo base do ingrediente ============
CREATE OR REPLACE FUNCTION public.sync_ingredient_base_cost()
RETURNS trigger LANGUAGE plpgsql SET search_path = public, app_private AS $$
BEGIN
  NEW.base_unit := app_private.base_unit_of(NEW.unit);
  NEW.cost_per_base_unit := ROUND(
    COALESCE(NEW.purchase_price, 0) / NULLIF(app_private.unit_factor(NEW.unit), 0), 8);
  RETURN NEW;
END; $$;

DROP TRIGGER IF EXISTS trg_sync_ingredient_base_cost ON public.ingredients;
CREATE TRIGGER trg_sync_ingredient_base_cost
BEFORE INSERT OR UPDATE ON public.ingredients
FOR EACH ROW EXECUTE FUNCTION public.sync_ingredient_base_cost();

UPDATE public.ingredients SET updated_at = updated_at;

-- backfill embalagens
UPDATE public.packaging_stock
   SET purchase_quantity = COALESCE(purchase_quantity, NULLIF(quantity, 0)),
       purchase_value = COALESCE(purchase_value, NULLIF(quantity, 0) * unit_cost)
 WHERE purchase_quantity IS NULL;

-- ============ recálculo de custos da receita ============
CREATE OR REPLACE FUNCTION public.recalc_recipe_costs(_recipe_id uuid, _reason text DEFAULT 'Recalculo automático'::text)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, app_private AS $$
DECLARE
  v_recipe public.recipes%ROWTYPE;
  v_ing numeric := 0;
  v_pack_unit numeric := 0;
  v_pack numeric := 0;
  v_total numeric := 0;
  v_unit numeric := 0;
  v_min numeric := 0;
  v_margin numeric := 0;
  v_profit numeric := 0;
  v_markup numeric := 0;
  v_tax numeric := 0;
  v_target numeric;
BEGIN
  SELECT * INTO v_recipe FROM public.recipes WHERE id = _recipe_id;
  IF NOT FOUND THEN RETURN; END IF;

  SELECT COALESCE(SUM(
           app_private.to_base_qty(ri.quantity, ri.unit, i.base_unit) * i.cost_per_base_unit
         ), 0) INTO v_ing
  FROM public.recipe_items ri
  JOIN public.ingredients i ON i.id = ri.ingredient_id
  WHERE ri.recipe_id = _recipe_id;

  SELECT COALESCE(SUM(ps.unit_cost * ps.qty_per_unit), 0) INTO v_pack_unit
  FROM public.packaging_stock ps
  WHERE ps.company_id = v_recipe.company_id AND ps.is_active AND COALESCE(ps.qty_per_unit, 0) > 0;

  v_pack := v_pack_unit * GREATEST(COALESCE(v_recipe.yield_quantity, 0), 0);
  v_total := v_ing + v_pack;
  v_unit := CASE WHEN v_recipe.yield_quantity > 0 THEN v_total / v_recipe.yield_quantity ELSE 0 END;

  v_tax := LEAST(GREATEST(COALESCE(v_recipe.sales_tax_percent, 0), 0), 95);
  v_target := LEAST(GREATEST(COALESCE(v_recipe.target_margin_percent, 40), 0), 95);
  v_min := CASE WHEN (v_target + v_tax) < 100 THEN v_unit / (1 - (v_target + v_tax) / 100.0) ELSE v_unit END;

  IF COALESCE(v_recipe.sale_price, 0) > 0 THEN
    v_profit := v_recipe.sale_price - v_unit - (v_recipe.sale_price * v_tax / 100.0);
    v_margin := (v_profit / v_recipe.sale_price) * 100;
    v_markup := CASE WHEN v_unit > 0 THEN v_recipe.sale_price / v_unit ELSE 0 END;
  ELSE
    v_profit := 0; v_margin := 0; v_markup := 0;
  END IF;

  UPDATE public.recipes SET
    ingredients_cost = ROUND(v_ing, 4),
    packaging_cost = ROUND(v_pack, 4),
    total_cost = ROUND(v_total, 4),
    cost_per_unit = ROUND(v_unit, 4),
    min_sale_price = ROUND(v_min, 2),
    margin_percent = ROUND(v_margin, 2),
    profit_per_unit = ROUND(v_profit, 4),
    markup = ROUND(v_markup, 4)
  WHERE id = _recipe_id;

  IF v_recipe.total_cost IS DISTINCT FROM ROUND(v_total, 4) THEN
    INSERT INTO public.recipe_cost_history
      (company_id, recipe_id, ingredients_cost, packaging_cost, total_cost, cost_per_unit, min_sale_price, margin_percent, reason)
    VALUES (v_recipe.company_id, _recipe_id, ROUND(v_ing,4), ROUND(v_pack,4), ROUND(v_total,4), ROUND(v_unit,4), ROUND(v_min,2), ROUND(v_margin,2), _reason);
  END IF;
END; $$;

CREATE OR REPLACE FUNCTION public.recalc_recipe_on_recipe()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NEW.yield_quantity IS DISTINCT FROM OLD.yield_quantity
     OR NEW.sale_price IS DISTINCT FROM OLD.sale_price
     OR NEW.target_margin_percent IS DISTINCT FROM OLD.target_margin_percent
     OR NEW.sales_tax_percent IS DISTINCT FROM OLD.sales_tax_percent THEN
    PERFORM public.recalc_recipe_costs(NEW.id, 'Alteração na receita');
  END IF;
  RETURN NULL;
END; $$;

CREATE OR REPLACE FUNCTION public.recalc_recipes_for_ingredient()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE r RECORD;
BEGIN
  IF TG_OP = 'UPDATE'
     AND NEW.cost_per_base_unit IS NOT DISTINCT FROM OLD.cost_per_base_unit
     AND NEW.base_unit IS NOT DISTINCT FROM OLD.base_unit THEN
    RETURN NULL;
  END IF;
  FOR r IN SELECT DISTINCT recipe_id FROM public.recipe_items WHERE ingredient_id = NEW.id LOOP
    PERFORM public.recalc_recipe_costs(r.recipe_id, 'Alteração de custo do ingrediente ' || NEW.name);
  END LOOP;
  RETURN NULL;
END; $$;

-- ============ compras ============
CREATE OR REPLACE FUNCTION public.apply_purchase()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, app_private AS $$
DECLARE
  v_unit numeric;
  v_old_qty numeric;
  v_old_cost numeric;
  v_new_cost numeric;
BEGIN
  v_unit := CASE WHEN NEW.quantity > 0 THEN NEW.total_value / NEW.quantity ELSE 0 END;

  IF NEW.kind = 'ingrediente' AND NEW.ingredient_id IS NOT NULL THEN
    SELECT quantity, purchase_price INTO v_old_qty, v_old_cost
      FROM public.ingredients WHERE id = NEW.ingredient_id;

    IF COALESCE(v_old_qty, 0) + NEW.quantity > 0 THEN
      v_new_cost := ((GREATEST(COALESCE(v_old_qty,0),0) * COALESCE(v_old_cost,0)) + NEW.total_value)
                    / (GREATEST(COALESCE(v_old_qty,0),0) + NEW.quantity);
    ELSE
      v_new_cost := v_unit;
    END IF;

    INSERT INTO public.stock_movements (company_id, ingredient_id, type, quantity, unit_cost, reason, created_by)
    VALUES (NEW.company_id, NEW.ingredient_id, 'entrada', NEW.quantity, v_unit,
            'Compra' || COALESCE(' - ' || NEW.supplier_name, ''), NEW.created_by);

    UPDATE public.ingredients
       SET purchase_price = ROUND(v_new_cost, 4),
           last_purchase_quantity = NEW.quantity,
           last_purchase_value = NEW.total_value,
           last_purchase_at = NEW.purchase_date
     WHERE id = NEW.ingredient_id;

  ELSIF NEW.kind = 'embalagem' AND NEW.packaging_id IS NOT NULL THEN
    SELECT quantity, unit_cost INTO v_old_qty, v_old_cost
      FROM public.packaging_stock WHERE id = NEW.packaging_id;

    IF COALESCE(v_old_qty, 0) + NEW.quantity > 0 THEN
      v_new_cost := ((GREATEST(COALESCE(v_old_qty,0),0) * COALESCE(v_old_cost,0)) + NEW.total_value)
                    / (GREATEST(COALESCE(v_old_qty,0),0) + NEW.quantity);
    ELSE
      v_new_cost := v_unit;
    END IF;

    UPDATE public.packaging_stock
       SET quantity = COALESCE(quantity,0) + NEW.quantity,
           unit_cost = ROUND(v_new_cost, 4),
           purchase_quantity = NEW.quantity,
           purchase_value = NEW.total_value
     WHERE id = NEW.packaging_id;
  END IF;

  RETURN NULL;
END; $$;

-- ============ produção ============
CREATE OR REPLACE FUNCTION app_private.produce_batch(_recipe_id uuid, _batches numeric,
  _produced_at timestamp with time zone DEFAULT now(), _responsible_id uuid DEFAULT NULL::uuid,
  _notes text DEFAULT NULL::text)
RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, app_private AS $$
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
  v_need numeric;
  v_unit_cost numeric;
  r RECORD;
  p RECORD;
BEGIN
  IF v_company IS NULL THEN RAISE EXCEPTION 'Empresa não identificada'; END IF;
  IF _batches IS NULL OR _batches <= 0 THEN RAISE EXCEPTION 'Quantidade de lotes inválida'; END IF;

  SELECT * INTO v_recipe FROM public.recipes WHERE id = _recipe_id AND company_id = v_company;
  IF NOT FOUND THEN RAISE EXCEPTION 'Receita não encontrada'; END IF;
  IF COALESCE(v_recipe.yield_quantity, 0) <= 0 THEN
    RAISE EXCEPTION 'Informe o rendimento real da receita antes de produzir';
  END IF;

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
    SELECT ri.ingredient_id, ri.quantity * _batches AS qty_recipe, ri.unit,
           i.name, i.unit AS stock_unit, i.base_unit, i.cost_per_base_unit,
           i.purchase_price, i.quantity AS stock
    FROM public.recipe_items ri
    JOIN public.ingredients i ON i.id = ri.ingredient_id
    WHERE ri.recipe_id = _recipe_id
  LOOP
    -- quantidade necessária na unidade de estoque do ingrediente
    v_need := app_private.convert_qty(r.qty_recipe, r.unit, r.stock_unit);
    IF r.stock < v_need THEN
      RAISE EXCEPTION 'Estoque insuficiente de %: disponível % %, necessário % %',
        r.name, r.stock, r.stock_unit, ROUND(v_need, 4), r.stock_unit;
    END IF;

    INSERT INTO public.stock_movements (company_id, ingredient_id, type, quantity, unit_cost, reason, created_by)
    VALUES (v_company, r.ingredient_id, 'saida', v_need, r.purchase_price, 'Produção de lote', auth.uid());

    -- custo por unidade usada na receita (ex.: R$/g)
    v_unit_cost := r.cost_per_base_unit * app_private.to_base_qty(1, r.unit, r.base_unit);

    INSERT INTO public.production_items (batch_id, ingredient_id, item_name, quantity, unit, unit_cost)
    VALUES (v_batch_id, r.ingredient_id, r.name, r.qty_recipe, r.unit, ROUND(v_unit_cost, 6));

    v_total_cost := v_total_cost + (r.qty_recipe * v_unit_cost);
  END LOOP;

  FOR p IN
    SELECT id, name, quantity, unit, unit_cost, qty_per_unit
    FROM public.packaging_stock
    WHERE company_id = v_company AND is_active AND COALESCE(qty_per_unit, 0) > 0
    ORDER BY type, created_at
  LOOP
    v_need := p.qty_per_unit * v_produced;
    IF p.quantity < v_need THEN
      RAISE EXCEPTION 'Estoque insuficiente de %: disponível %, necessário %', p.name, p.quantity, v_need;
    END IF;
    UPDATE public.packaging_stock SET quantity = quantity - v_need WHERE id = p.id;
    INSERT INTO public.production_items (batch_id, packaging_id, item_name, quantity, unit, unit_cost)
    VALUES (v_batch_id, p.id, p.name, v_need, p.unit, p.unit_cost);
    v_total_cost := v_total_cost + (v_need * p.unit_cost);
  END LOOP;

  UPDATE public.production_batches
     SET total_cost = ROUND(v_total_cost, 4),
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
END; $$;

-- recalcula todas as receitas com a nova fórmula
DO $$
DECLARE r RECORD;
BEGIN
  FOR r IN SELECT id FROM public.recipes LOOP
    PERFORM public.recalc_recipe_costs(r.id, 'Nova base de cálculo com conversão de unidades');
  END LOOP;
END $$;