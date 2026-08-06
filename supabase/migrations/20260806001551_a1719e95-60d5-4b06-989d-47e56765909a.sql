ALTER TABLE public.packaging_stock
  ADD COLUMN IF NOT EXISTS supplier_id uuid REFERENCES public.suppliers(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS last_purchase_at date,
  ADD COLUMN IF NOT EXISTS next_restock_at date;

ALTER TABLE public.production_batches
  ADD COLUMN IF NOT EXISTS ingredients_cost numeric NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS packaging_cost numeric NOT NULL DEFAULT 0;

CREATE OR REPLACE FUNCTION app_private.produce_batch(_recipe_id uuid, _batches numeric, _produced_at timestamp with time zone DEFAULT now(), _responsible_id uuid DEFAULT NULL::uuid, _notes text DEFAULT NULL::text)
 RETURNS uuid
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'app_private'
AS $function$
DECLARE
  v_company uuid := public.current_company_id();
  v_recipe public.recipes%ROWTYPE;
  v_batch_id uuid;
  v_produced numeric;
  v_total_cost numeric := 0;
  v_ing_cost numeric := 0;
  v_pack_cost numeric := 0;
  v_unit_total numeric := 0;
  v_fp uuid;
  v_code text;
  v_expires date;
  v_seq bigint;
  v_need numeric;
  v_unit_cost numeric;
  v_items int;
  v_cat uuid;
  r RECORD;
  p RECORD;
BEGIN
  IF v_company IS NULL THEN RAISE EXCEPTION 'Empresa não identificada'; END IF;
  IF _batches IS NULL OR _batches <= 0 THEN RAISE EXCEPTION 'Quantidade de lotes inválida'; END IF;

  SELECT * INTO v_recipe FROM public.recipes WHERE id = _recipe_id AND company_id = v_company;
  IF NOT FOUND THEN RAISE EXCEPTION 'Receita não encontrada'; END IF;
  IF v_recipe.status <> 'ativo' THEN
    RAISE EXCEPTION 'A receita % está inativa e não pode ser produzida', v_recipe.name;
  END IF;
  IF COALESCE(v_recipe.yield_quantity, 0) <= 0 THEN
    RAISE EXCEPTION 'Informe o rendimento real da receita antes de produzir';
  END IF;

  SELECT COUNT(*) INTO v_items FROM public.recipe_items WHERE recipe_id = _recipe_id;
  IF v_items = 0 THEN
    RAISE EXCEPTION 'A receita % não possui ingredientes cadastrados', v_recipe.name;
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
    v_need := app_private.convert_qty(r.qty_recipe, r.unit, r.stock_unit);
    IF r.stock < v_need THEN
      RAISE EXCEPTION 'Estoque insuficiente de %: disponível % %, necessário % %',
        r.name, r.stock, r.stock_unit, ROUND(v_need, 4), r.stock_unit;
    END IF;

    INSERT INTO public.stock_movements (company_id, ingredient_id, type, quantity, unit_cost, reason, created_by)
    VALUES (v_company, r.ingredient_id, 'saida', v_need, r.purchase_price, 'Produção de lote', auth.uid());

    v_unit_cost := r.cost_per_base_unit * app_private.to_base_qty(1, r.unit, r.base_unit);

    INSERT INTO public.production_items (batch_id, ingredient_id, item_name, quantity, unit, unit_cost)
    VALUES (v_batch_id, r.ingredient_id, r.name, r.qty_recipe, r.unit, ROUND(v_unit_cost, 6));

    v_ing_cost := v_ing_cost + (r.qty_recipe * v_unit_cost);
  END LOOP;

  FOR p IN
    SELECT id, name, quantity, unit, unit_cost, qty_per_unit
    FROM public.packaging_stock
    WHERE company_id = v_company AND is_active AND COALESCE(qty_per_unit, 0) > 0
    ORDER BY type, created_at
  LOOP
    v_need := p.qty_per_unit * v_produced;
    IF p.quantity < v_need THEN
      RAISE EXCEPTION 'Embalagem insuficiente (%): disponível %, necessário %', p.name, p.quantity, v_need;
    END IF;
    UPDATE public.packaging_stock SET quantity = quantity - v_need WHERE id = p.id;
    INSERT INTO public.production_items (batch_id, packaging_id, item_name, quantity, unit, unit_cost)
    VALUES (v_batch_id, p.id, p.name, v_need, p.unit, p.unit_cost);
    v_pack_cost := v_pack_cost + (v_need * p.unit_cost);
  END LOOP;

  v_total_cost := v_ing_cost + v_pack_cost;
  v_unit_total := CASE WHEN v_produced > 0 THEN v_total_cost / v_produced ELSE 0 END;

  IF COALESCE(v_recipe.sale_price, 0) <= v_unit_total THEN
    RAISE EXCEPTION 'Preço de venda (%) precisa ser maior que o custo por garrafinha (%). Ajuste o preço da receita antes de produzir.',
      ROUND(COALESCE(v_recipe.sale_price, 0), 2), ROUND(v_unit_total, 2);
  END IF;

  UPDATE public.production_batches
     SET total_cost = ROUND(v_total_cost, 4),
         ingredients_cost = ROUND(v_ing_cost, 4),
         packaging_cost = ROUND(v_pack_cost, 4),
         unit_cost = ROUND(v_unit_total, 4)
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

  SELECT id INTO v_cat FROM public.expense_categories
   WHERE company_id = v_company AND lower(name) = 'produção' LIMIT 1;
  IF v_cat IS NULL THEN
    INSERT INTO public.expense_categories (company_id, name, type, description)
    VALUES (v_company, 'Produção', 'despesa', 'Custos de produção de lotes')
    RETURNING id INTO v_cat;
  END IF;

  INSERT INTO public.financial_entries (company_id, category_id, type, status, description, amount,
    due_date, paid_at, notes, created_by)
  VALUES (v_company, v_cat, 'despesa', 'pago',
    'Produção lote ' || v_code || ' - ' || v_recipe.name,
    ROUND(v_total_cost, 2),
    (COALESCE(_produced_at, now()))::date,
    COALESCE(_produced_at, now()),
    'Ingredientes: ' || ROUND(v_ing_cost, 2) ||
    ' | Embalagens: ' || ROUND(v_pack_cost, 2) ||
    ' | Produzido: ' || ROUND(v_produced, 2) || ' un' ||
    ' | Custo médio: ' || ROUND(v_unit_total, 4) || '/un',
    auth.uid());

  RETURN v_batch_id;
END; $function$;