-- ============================================================
-- NÚCLEO DE MOVIMENTAÇÕES: motor de aplicação
-- ============================================================

CREATE OR REPLACE FUNCTION app_private.apply_movement(_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, app_private
AS $$
DECLARE
  m public.system_movements%ROWTYPE;
  v_old_qty numeric;
  v_old_cost numeric;
  v_new_cost numeric;
  v_fp uuid;
  r RECORD;
BEGIN
  SELECT * INTO m FROM public.system_movements WHERE id = _id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Movimentação não encontrada'; END IF;
  IF m.status = 'aplicado' THEN RETURN; END IF;
  IF m.status = 'cancelado' THEN RETURN; END IF;

  ------------------------------------------------------------------
  -- COMPRA (ingrediente ou embalagem) : custo médio ponderado
  ------------------------------------------------------------------
  IF m.type = 'compra' THEN
    IF m.ingredient_id IS NOT NULL THEN
      SELECT quantity, purchase_price INTO v_old_qty, v_old_cost
        FROM public.ingredients WHERE id = m.ingredient_id;

      IF COALESCE(v_old_qty,0) + m.quantity > 0 THEN
        v_new_cost := ((GREATEST(COALESCE(v_old_qty,0),0) * COALESCE(v_old_cost,0)) + m.amount)
                      / (GREATEST(COALESCE(v_old_qty,0),0) + m.quantity);
      ELSE
        v_new_cost := m.unit_cost;
      END IF;

      UPDATE public.ingredients
         SET purchase_price = ROUND(v_new_cost, 4),
             quantity = quantity + m.quantity,
             last_purchase_quantity = m.quantity,
             last_purchase_value = m.amount,
             last_purchase_at = m.occurred_at::date
       WHERE id = m.ingredient_id;

      INSERT INTO public.stock_movements (company_id, ingredient_id, type, quantity, unit_cost, reason, created_by)
      VALUES (m.company_id, m.ingredient_id, 'entrada', m.quantity, m.unit_cost,
              COALESCE(m.notes, 'Compra'), m.user_id);

    ELSIF m.packaging_id IS NOT NULL THEN
      SELECT quantity, unit_cost INTO v_old_qty, v_old_cost
        FROM public.packaging_stock WHERE id = m.packaging_id;

      IF COALESCE(v_old_qty,0) + m.quantity > 0 THEN
        v_new_cost := ((GREATEST(COALESCE(v_old_qty,0),0) * COALESCE(v_old_cost,0)) + m.amount)
                      / (GREATEST(COALESCE(v_old_qty,0),0) + m.quantity);
      ELSE
        v_new_cost := m.unit_cost;
      END IF;

      UPDATE public.packaging_stock
         SET quantity = COALESCE(quantity,0) + m.quantity,
             unit_cost = ROUND(v_new_cost, 4),
             purchase_quantity = m.quantity,
             purchase_value = m.amount,
             last_purchase_at = m.occurred_at::date
       WHERE id = m.packaging_id;
    END IF;

  ------------------------------------------------------------------
  -- ESTOQUE DE INGREDIENTES
  ------------------------------------------------------------------
  ELSIF m.type = 'entrada_estoque' THEN
    UPDATE public.ingredients SET quantity = quantity + m.quantity WHERE id = m.ingredient_id;
    INSERT INTO public.stock_movements (company_id, ingredient_id, type, quantity, unit_cost, reason, order_id, created_by)
    VALUES (m.company_id, m.ingredient_id, 'entrada', m.quantity, m.unit_cost, m.notes,
            CASE WHEN m.origin = 'pedido' THEN m.reference_id END, m.user_id);

  ELSIF m.type = 'saida_estoque' THEN
    UPDATE public.ingredients SET quantity = quantity - m.quantity WHERE id = m.ingredient_id;
    INSERT INTO public.stock_movements (company_id, ingredient_id, type, quantity, unit_cost, reason, order_id, created_by)
    VALUES (m.company_id, m.ingredient_id, 'saida', m.quantity, m.unit_cost, m.notes,
            CASE WHEN m.origin = 'pedido' THEN m.reference_id END, m.user_id);

  ELSIF m.type = 'ajuste_estoque' THEN
    UPDATE public.ingredients SET quantity = m.quantity WHERE id = m.ingredient_id;
    INSERT INTO public.stock_movements (company_id, ingredient_id, type, quantity, unit_cost, reason, created_by)
    VALUES (m.company_id, m.ingredient_id, 'ajuste', m.quantity, m.unit_cost, m.notes, m.user_id);

  ------------------------------------------------------------------
  -- PRODUTOS ACABADOS
  ------------------------------------------------------------------
  ELSIF m.type = 'producao' THEN
    UPDATE public.finished_products
       SET quantity_available = quantity_available + m.quantity,
           quantity_produced = quantity_produced + m.quantity
     WHERE id = m.finished_product_id;
    INSERT INTO public.finished_product_movements (company_id, finished_product_id, batch_id, type, quantity, reason, created_by)
    VALUES (m.company_id, m.finished_product_id, m.batch_id, 'producao', m.quantity, m.notes, m.user_id);

  ELSIF m.type = 'descarte' THEN
    UPDATE public.finished_products
       SET quantity_available = quantity_available - m.quantity,
           quantity_discarded = quantity_discarded + m.quantity
     WHERE id = m.finished_product_id;
    INSERT INTO public.finished_product_movements (company_id, finished_product_id, batch_id, type, quantity, reason, created_by)
    VALUES (m.company_id, m.finished_product_id, m.batch_id, 'descarte', m.quantity, m.notes, m.user_id);

  ------------------------------------------------------------------
  -- VENDA
  ------------------------------------------------------------------
  ELSIF m.type = 'venda' THEN
    IF m.product_id IS NOT NULL THEN
      UPDATE public.products SET stock_quantity = stock_quantity - m.quantity WHERE id = m.product_id;

      FOR r IN SELECT pi.ingredient_id, pi.quantity AS qty, i.purchase_price
                 FROM public.product_ingredients pi
                 JOIN public.ingredients i ON i.id = pi.ingredient_id
                WHERE pi.product_id = m.product_id
      LOOP
        PERFORM app_private.record_movement(
          m.company_id, 'saida_estoque', 'pedido', m.reference_id, m.user_id,
          r.qty * m.quantity, 0, r.purchase_price, NULL, r.ingredient_id, NULL, NULL, NULL,
          m.finished_product_id, m.customer_id, NULL, NULL, NULL,
          'Venda automática', m.occurred_at);
      END LOOP;
    END IF;

    IF m.finished_product_id IS NOT NULL THEN
      UPDATE public.finished_products
         SET quantity_available = quantity_available - m.quantity,
             quantity_sold = quantity_sold + m.quantity
       WHERE id = m.finished_product_id;
      INSERT INTO public.finished_product_movements (company_id, finished_product_id, batch_id, type, quantity, reason, created_by)
      VALUES (m.company_id, m.finished_product_id, m.batch_id, 'venda', m.quantity, m.notes, m.user_id);
    END IF;

  ------------------------------------------------------------------
  -- CAIXA
  ------------------------------------------------------------------
  ELSIF m.type IN ('caixa_entrada','caixa_saida','caixa_sangria') THEN
    INSERT INTO public.cash_transactions (session_id, type, amount, payment_method, description, order_id, created_by)
    VALUES (m.cash_session_id,
            (CASE m.type WHEN 'caixa_entrada' THEN 'entrada' WHEN 'caixa_saida' THEN 'saida' ELSE 'sangria' END)::public.cash_transaction_type,
            m.amount, m.payment_method, COALESCE(m.notes, 'Movimentação de caixa'),
            CASE WHEN m.origin = 'pedido' THEN m.reference_id END, m.user_id);

    UPDATE public.cash_sessions s SET
      total_in = COALESCE((SELECT SUM(t.amount) FROM public.cash_transactions t WHERE t.session_id = m.cash_session_id AND t.type = 'entrada'), 0),
      total_out = COALESCE((SELECT SUM(t.amount) FROM public.cash_transactions t WHERE t.session_id = m.cash_session_id AND t.type = 'saida'), 0),
      total_withdrawal = COALESCE((SELECT SUM(t.amount) FROM public.cash_transactions t WHERE t.session_id = m.cash_session_id AND t.type = 'sangria'), 0)
    WHERE s.id = m.cash_session_id;

  ------------------------------------------------------------------
  -- FINANCEIRO
  ------------------------------------------------------------------
  ELSIF m.type IN ('receita','despesa') THEN
    INSERT INTO public.financial_entries (company_id, category_id, order_id, supplier_id, type, status,
      description, amount, payment_method, due_date, paid_at, notes, created_by)
    VALUES (m.company_id,
            NULLIF(m.metadata->>'category_id','')::uuid,
            CASE WHEN m.origin = 'pedido' THEN m.reference_id END,
            NULLIF(m.metadata->>'supplier_id','')::uuid,
            m.type::text::public.financial_entry_type,
            COALESCE(NULLIF(m.metadata->>'status',''), 'pendente')::public.financial_entry_status,
            COALESCE(m.reference_label, 'Lançamento'),
            m.amount, m.payment_method,
            COALESCE(NULLIF(m.metadata->>'due_date','')::date, m.occurred_at::date),
            CASE WHEN COALESCE(m.metadata->>'status','') = 'pago' THEN m.occurred_at END,
            m.notes, m.user_id);
  END IF;

  UPDATE public.system_movements
     SET status = 'aplicado', applied_at = now()
   WHERE id = _id;
END; $$;

-- ============================================================
-- Registrador único
-- ============================================================
CREATE OR REPLACE FUNCTION app_private.record_movement(
  _company_id uuid,
  _type public.movement_core_type,
  _origin public.movement_origin,
  _reference_id uuid,
  _user_id uuid,
  _quantity numeric DEFAULT 0,
  _amount numeric DEFAULT 0,
  _unit_cost numeric DEFAULT 0,
  _product_id uuid DEFAULT NULL,
  _ingredient_id uuid DEFAULT NULL,
  _packaging_id uuid DEFAULT NULL,
  _recipe_id uuid DEFAULT NULL,
  _batch_id uuid DEFAULT NULL,
  _finished_product_id uuid DEFAULT NULL,
  _customer_id uuid DEFAULT NULL,
  _cash_session_id uuid DEFAULT NULL,
  _payment_method public.payment_method DEFAULT NULL,
  _reference_label text DEFAULT NULL,
  _notes text DEFAULT NULL,
  _occurred_at timestamptz DEFAULT now(),
  _metadata jsonb DEFAULT '{}'::jsonb,
  _unit text DEFAULT NULL
) RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, app_private
AS $$
DECLARE v_id uuid;
BEGIN
  IF _company_id IS NULL THEN RAISE EXCEPTION 'Empresa não identificada'; END IF;

  INSERT INTO public.system_movements (
    company_id, occurred_at, type, origin, reference_id, reference_label, user_id, user_name,
    product_id, ingredient_id, packaging_id, recipe_id, batch_id, finished_product_id,
    customer_id, cash_session_id, amount, quantity, unit, unit_cost, payment_method, notes, status, metadata)
  VALUES (
    _company_id, COALESCE(_occurred_at, now()), _type, _origin, _reference_id, _reference_label,
    _user_id, (SELECT full_name FROM public.profiles WHERE id = _user_id),
    _product_id, _ingredient_id, _packaging_id, _recipe_id, _batch_id, _finished_product_id,
    _customer_id, _cash_session_id, COALESCE(_amount,0), COALESCE(_quantity,0), _unit,
    COALESCE(_unit_cost,0), _payment_method, _notes, 'pendente', COALESCE(_metadata,'{}'::jsonb))
  RETURNING id INTO v_id;

  PERFORM app_private.apply_movement(v_id);
  RETURN v_id;
END; $$;

-- ============================================================
-- Entradas públicas (único ponto de escrita do aplicativo)
-- ============================================================
CREATE OR REPLACE FUNCTION public.record_stock_movement(
  _ingredient_id uuid, _type text, _quantity numeric,
  _unit_cost numeric DEFAULT 0, _reason text DEFAULT NULL)
RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, app_private AS $$
DECLARE v_company uuid := public.current_company_id(); v_type public.movement_core_type;
BEGIN
  IF v_company IS NULL THEN RAISE EXCEPTION 'Empresa não identificada'; END IF;
  IF NOT EXISTS (SELECT 1 FROM public.ingredients WHERE id = _ingredient_id AND company_id = v_company) THEN
    RAISE EXCEPTION 'Ingrediente não encontrado';
  END IF;
  v_type := CASE _type WHEN 'entrada' THEN 'entrada_estoque' WHEN 'saida' THEN 'saida_estoque' ELSE 'ajuste_estoque' END;
  RETURN app_private.record_movement(v_company, v_type, 'estoque', NULL, auth.uid(),
    _quantity, 0, COALESCE(_unit_cost,0), NULL, _ingredient_id, NULL, NULL, NULL, NULL, NULL, NULL,
    NULL, NULL, _reason);
END; $$;

CREATE OR REPLACE FUNCTION public.record_purchase(
  _kind text, _item_name text, _quantity numeric, _total_value numeric, _unit text,
  _purchase_date date, _ingredient_id uuid DEFAULT NULL, _packaging_id uuid DEFAULT NULL,
  _supplier_id uuid DEFAULT NULL, _supplier_name text DEFAULT NULL,
  _category_id uuid DEFAULT NULL, _notes text DEFAULT NULL)
RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, app_private AS $$
DECLARE
  v_company uuid := public.current_company_id();
  v_unit_cost numeric;
  v_purchase uuid;
BEGIN
  IF v_company IS NULL THEN RAISE EXCEPTION 'Empresa não identificada'; END IF;
  IF COALESCE(_quantity,0) <= 0 THEN RAISE EXCEPTION 'Informe a quantidade comprada'; END IF;
  v_unit_cost := _total_value / _quantity;

  INSERT INTO public.purchases (company_id, supplier_id, supplier_name, kind, ingredient_id, packaging_id,
    category_id, item_name, quantity, unit, total_value, unit_cost, purchase_date, notes, created_by)
  VALUES (v_company, _supplier_id, _supplier_name, _kind::public.purchase_item_kind, _ingredient_id, _packaging_id,
    _category_id, _item_name, _quantity, _unit, _total_value, v_unit_cost, _purchase_date, _notes, auth.uid())
  RETURNING id INTO v_purchase;

  PERFORM app_private.record_movement(v_company, 'compra', 'compra', v_purchase, auth.uid(),
    _quantity, _total_value, v_unit_cost, NULL, _ingredient_id, _packaging_id, NULL, NULL, NULL, NULL, NULL,
    NULL, _item_name, COALESCE(_notes, 'Compra' || COALESCE(' - ' || _supplier_name, '')),
    COALESCE(_purchase_date, current_date)::timestamptz, '{}'::jsonb, _unit);

  RETURN v_purchase;
END; $$;

CREATE OR REPLACE FUNCTION public.record_order_sale(_order_id uuid)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, app_private AS $$
DECLARE v_company uuid := public.current_company_id(); o public.orders%ROWTYPE; r RECORD;
BEGIN
  SELECT * INTO o FROM public.orders WHERE id = _order_id AND company_id = v_company;
  IF NOT FOUND THEN RAISE EXCEPTION 'Pedido não encontrado'; END IF;

  FOR r IN SELECT * FROM public.order_items WHERE order_id = _order_id AND product_id IS NOT NULL LOOP
    IF EXISTS (SELECT 1 FROM public.system_movements
                WHERE company_id = v_company AND type = 'venda' AND origin = 'pedido'
                  AND reference_id = _order_id AND product_id = r.product_id AND status <> 'cancelado') THEN
      CONTINUE;
    END IF;
    PERFORM app_private.record_movement(v_company, 'venda', 'pedido', _order_id, auth.uid(),
      r.quantity, r.line_total, r.unit_price, r.product_id, NULL, NULL, NULL, NULL, NULL,
      o.customer_id, NULL, o.payment_method, 'Pedido #' || o.order_number, r.product_name, o.created_at);
  END LOOP;
END; $$;

CREATE OR REPLACE FUNCTION public.record_cash_transaction(
  _session_id uuid, _type text, _amount numeric,
  _description text, _payment_method text DEFAULT NULL, _order_id uuid DEFAULT NULL)
RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, app_private AS $$
DECLARE v_company uuid := public.current_company_id(); v_type public.movement_core_type;
BEGIN
  IF NOT EXISTS (SELECT 1 FROM public.cash_sessions WHERE id = _session_id AND company_id = v_company) THEN
    RAISE EXCEPTION 'Sessão de caixa não encontrada';
  END IF;
  v_type := CASE _type WHEN 'entrada' THEN 'caixa_entrada' WHEN 'saida' THEN 'caixa_saida' ELSE 'caixa_sangria' END;
  RETURN app_private.record_movement(v_company, v_type, 'caixa', _order_id, auth.uid(),
    0, _amount, 0, NULL, NULL, NULL, NULL, NULL, NULL, NULL, _session_id,
    NULLIF(_payment_method,'')::public.payment_method, NULL, _description);
END; $$;

CREATE OR REPLACE FUNCTION public.record_financial_entry(
  _type text, _description text, _amount numeric, _due_date date,
  _status text DEFAULT 'pendente', _category_id uuid DEFAULT NULL,
  _supplier_id uuid DEFAULT NULL, _payment_method text DEFAULT NULL, _notes text DEFAULT NULL)
RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, app_private AS $$
DECLARE v_company uuid := public.current_company_id();
BEGIN
  IF v_company IS NULL THEN RAISE EXCEPTION 'Empresa não identificada'; END IF;
  RETURN app_private.record_movement(v_company,
    (CASE WHEN _type IN ('receita') THEN 'receita' ELSE 'despesa' END)::public.movement_core_type,
    'financeiro', NULL, auth.uid(), 0, _amount, 0, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL,
    NULLIF(_payment_method,'')::public.payment_method, _description, _notes, now(),
    jsonb_build_object('category_id', _category_id, 'supplier_id', _supplier_id,
                       'status', COALESCE(_status,'pendente'), 'due_date', _due_date,
                       'entry_type', _type));
END; $$;

CREATE OR REPLACE FUNCTION public.record_finished_movement(
  _finished_product_id uuid, _type text, _quantity numeric,
  _batch_id uuid DEFAULT NULL, _reason text DEFAULT NULL)
RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, app_private AS $$
DECLARE v_company uuid := public.current_company_id(); v_type public.movement_core_type;
BEGIN
  IF NOT EXISTS (SELECT 1 FROM public.finished_products WHERE id = _finished_product_id AND company_id = v_company) THEN
    RAISE EXCEPTION 'Produto acabado não encontrado';
  END IF;
  v_type := CASE _type WHEN 'producao' THEN 'producao' WHEN 'descarte' THEN 'descarte'
                       WHEN 'venda' THEN 'venda' ELSE 'ajuste_estoque' END;
  IF v_type = 'ajuste_estoque' THEN
    INSERT INTO public.finished_product_movements (company_id, finished_product_id, batch_id, type, quantity, reason, created_by)
    VALUES (v_company, _finished_product_id, _batch_id, _type::public.finished_movement_type, _quantity, _reason, auth.uid());
    IF _type = 'reserva' THEN
      UPDATE public.finished_products SET quantity_reserved = quantity_reserved + _quantity WHERE id = _finished_product_id;
    ELSIF _type = 'estorno' THEN
      UPDATE public.finished_products SET quantity_available = quantity_available + _quantity WHERE id = _finished_product_id;
    ELSE
      UPDATE public.finished_products SET quantity_available = _quantity WHERE id = _finished_product_id;
    END IF;
    RETURN NULL;
  END IF;
  RETURN app_private.record_movement(v_company, v_type, 'producao', _batch_id, auth.uid(),
    _quantity, 0, 0, NULL, NULL, NULL, NULL, _batch_id, _finished_product_id, NULL, NULL,
    NULL, NULL, _reason);
END; $$;

CREATE OR REPLACE FUNCTION public.reverse_movement(_movement_id uuid, _reason text DEFAULT 'Estorno')
RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, app_private AS $$
DECLARE m public.system_movements%ROWTYPE; v_company uuid := public.current_company_id(); v_new uuid;
        v_type public.movement_core_type;
BEGIN
  SELECT * INTO m FROM public.system_movements WHERE id = _movement_id AND company_id = v_company;
  IF NOT FOUND THEN RAISE EXCEPTION 'Movimentação não encontrada'; END IF;
  IF m.status <> 'aplicado' THEN RAISE EXCEPTION 'Somente movimentações aplicadas podem ser estornadas'; END IF;

  v_type := CASE m.type
    WHEN 'entrada_estoque' THEN 'saida_estoque'
    WHEN 'saida_estoque' THEN 'entrada_estoque'
    WHEN 'compra' THEN 'saida_estoque'
    WHEN 'caixa_entrada' THEN 'caixa_saida'
    WHEN 'caixa_saida' THEN 'caixa_entrada'
    ELSE NULL END::public.movement_core_type;

  IF v_type IS NULL THEN RAISE EXCEPTION 'Este tipo de movimentação não pode ser estornado automaticamente'; END IF;

  v_new := app_private.record_movement(m.company_id, v_type, m.origin, m.reference_id, auth.uid(),
    m.quantity, m.amount, m.unit_cost, m.product_id, m.ingredient_id, m.packaging_id, m.recipe_id,
    m.batch_id, m.finished_product_id, m.customer_id, m.cash_session_id, m.payment_method,
    m.reference_label, _reason);

  UPDATE public.system_movements SET status = 'estornado', reversed_movement_id = v_new WHERE id = _movement_id;
  RETURN v_new;
END; $$;

-- ============================================================
-- Remove os cálculos duplicados (gatilhos paralelos)
-- ============================================================
DROP TRIGGER IF EXISTS trg_apply_purchase ON public.purchases;
DROP TRIGGER IF EXISTS trg_apply_stock_movement ON public.stock_movements;
DROP TRIGGER IF EXISTS trg_apply_finished_movement ON public.finished_product_movements;
DROP TRIGGER IF EXISTS trg_consume_stock ON public.order_items;
DROP TRIGGER IF EXISTS cash_transactions_recalc ON public.cash_transactions;

-- Cancelamento de pedido volta pelo núcleo
CREATE OR REPLACE FUNCTION public.restore_stock_on_cancel()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, app_private AS $$
DECLARE r RECORD; p RECORD;
BEGIN
  IF NEW.status = 'cancelado' AND OLD.status IS DISTINCT FROM 'cancelado' THEN
    FOR r IN SELECT oi.product_id, oi.quantity FROM public.order_items oi
              WHERE oi.order_id = NEW.id AND oi.product_id IS NOT NULL
    LOOP
      UPDATE public.products SET stock_quantity = stock_quantity + r.quantity WHERE id = r.product_id;
      FOR p IN SELECT pi.ingredient_id, pi.quantity AS qty, i.purchase_price
                 FROM public.product_ingredients pi JOIN public.ingredients i ON i.id = pi.ingredient_id
                WHERE pi.product_id = r.product_id
      LOOP
        PERFORM app_private.record_movement(NEW.company_id, 'entrada_estoque', 'pedido', NEW.id, auth.uid(),
          p.qty * r.quantity, 0, p.purchase_price, r.product_id, p.ingredient_id, NULL, NULL, NULL, NULL,
          NEW.customer_id, NULL, NULL, NULL, 'Estorno de pedido cancelado');
      END LOOP;
    END LOOP;
    UPDATE public.system_movements SET status = 'cancelado'
     WHERE company_id = NEW.company_id AND origin = 'pedido' AND reference_id = NEW.id AND type = 'venda';
  END IF;
  RETURN NULL;
END; $$;

-- Produção passa a registrar as saídas pelo núcleo
CREATE OR REPLACE FUNCTION app_private.produce_batch(
  _recipe_id uuid, _batches numeric, _produced_at timestamptz DEFAULT now(),
  _responsible_id uuid DEFAULT NULL, _notes text DEFAULT NULL)
RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, app_private AS $$
DECLARE
  v_company uuid := public.current_company_id();
  v_recipe public.recipes%ROWTYPE;
  v_batch_id uuid; v_produced numeric; v_total_cost numeric := 0; v_ing_cost numeric := 0;
  v_pack_cost numeric := 0; v_unit_total numeric := 0; v_fp uuid; v_code text; v_expires date;
  v_seq bigint; v_need numeric; v_unit_cost numeric; v_items int; v_cat uuid; r RECORD; p RECORD;
BEGIN
  IF v_company IS NULL THEN RAISE EXCEPTION 'Empresa não identificada'; END IF;
  IF _batches IS NULL OR _batches <= 0 THEN RAISE EXCEPTION 'Quantidade de lotes inválida'; END IF;

  SELECT * INTO v_recipe FROM public.recipes WHERE id = _recipe_id AND company_id = v_company;
  IF NOT FOUND THEN RAISE EXCEPTION 'Receita não encontrada'; END IF;
  IF v_recipe.status <> 'ativo' THEN
    RAISE EXCEPTION 'A receita % está inativa e não pode ser produzida', v_recipe.name; END IF;
  IF COALESCE(v_recipe.yield_quantity, 0) <= 0 THEN
    RAISE EXCEPTION 'Informe o rendimento real da receita antes de produzir'; END IF;

  SELECT COUNT(*) INTO v_items FROM public.recipe_items WHERE recipe_id = _recipe_id;
  IF v_items = 0 THEN RAISE EXCEPTION 'A receita % não possui ingredientes cadastrados', v_recipe.name; END IF;

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
           i.name, i.unit AS stock_unit, i.base_unit, i.cost_per_base_unit, i.purchase_price, i.quantity AS stock
    FROM public.recipe_items ri JOIN public.ingredients i ON i.id = ri.ingredient_id
    WHERE ri.recipe_id = _recipe_id
  LOOP
    v_need := app_private.convert_qty(r.qty_recipe, r.unit, r.stock_unit);
    IF r.stock < v_need THEN
      RAISE EXCEPTION 'Estoque insuficiente de %: disponível % %, necessário % %',
        r.name, r.stock, r.stock_unit, ROUND(v_need, 4), r.stock_unit;
    END IF;

    PERFORM app_private.record_movement(v_company, 'saida_estoque', 'producao', v_batch_id, auth.uid(),
      v_need, 0, r.purchase_price, NULL, r.ingredient_id, NULL, _recipe_id, v_batch_id, NULL, NULL, NULL,
      NULL, v_code, 'Produção de lote', COALESCE(_produced_at, now()), '{}'::jsonb, r.stock_unit);

    v_unit_cost := r.cost_per_base_unit * app_private.to_base_qty(1, r.unit, r.base_unit);
    INSERT INTO public.production_items (batch_id, ingredient_id, item_name, quantity, unit, unit_cost)
    VALUES (v_batch_id, r.ingredient_id, r.name, r.qty_recipe, r.unit, ROUND(v_unit_cost, 6));
    v_ing_cost := v_ing_cost + (r.qty_recipe * v_unit_cost);
  END LOOP;

  FOR p IN
    SELECT id, name, quantity, unit, unit_cost, qty_per_unit FROM public.packaging_stock
     WHERE company_id = v_company AND is_active AND COALESCE(qty_per_unit, 0) > 0 ORDER BY type, created_at
  LOOP
    v_need := p.qty_per_unit * v_produced;
    IF p.quantity < v_need THEN
      RAISE EXCEPTION 'Embalagem insuficiente (%): disponível %, necessário %', p.name, p.quantity, v_need; END IF;
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
     SET total_cost = ROUND(v_total_cost, 4), ingredients_cost = ROUND(v_ing_cost, 4),
         packaging_cost = ROUND(v_pack_cost, 4), unit_cost = ROUND(v_unit_total, 4)
   WHERE id = v_batch_id;

  SELECT id INTO v_fp FROM public.finished_products WHERE company_id = v_company AND recipe_id = _recipe_id;
  IF v_fp IS NULL THEN
    INSERT INTO public.finished_products (company_id, recipe_id, name, unit)
    VALUES (v_company, _recipe_id, v_recipe.name, 'un') RETURNING id INTO v_fp;
  END IF;

  PERFORM app_private.record_movement(v_company, 'producao', 'producao', v_batch_id, auth.uid(),
    v_produced, ROUND(v_total_cost,2), ROUND(v_unit_total,4), NULL, NULL, NULL, _recipe_id, v_batch_id,
    v_fp, NULL, NULL, NULL, v_code, 'Produção de lote', COALESCE(_produced_at, now()));

  INSERT INTO public.batch_labels (company_id, batch_id, flavor_name, volume_ml, batch_code, manufactured_at, expires_at, qr_payload, quantity)
  VALUES (v_company, v_batch_id, v_recipe.name, v_recipe.bottle_volume_ml, v_code,
          (COALESCE(_produced_at, now()))::date, v_expires, '/producao/lote/' || v_batch_id, v_produced);

  SELECT id INTO v_cat FROM public.expense_categories
   WHERE company_id = v_company AND lower(name) = 'produção' LIMIT 1;
  IF v_cat IS NULL THEN
    INSERT INTO public.expense_categories (company_id, name, type, description)
    VALUES (v_company, 'Produção', 'despesa', 'Custos de produção de lotes') RETURNING id INTO v_cat;
  END IF;

  PERFORM app_private.record_movement(v_company, 'despesa', 'producao', v_batch_id, auth.uid(),
    0, ROUND(v_total_cost, 2), 0, NULL, NULL, NULL, _recipe_id, v_batch_id, v_fp, NULL, NULL, NULL,
    'Produção lote ' || v_code || ' - ' || v_recipe.name,
    'Ingredientes: ' || ROUND(v_ing_cost, 2) || ' | Embalagens: ' || ROUND(v_pack_cost, 2) ||
    ' | Produzido: ' || ROUND(v_produced, 2) || ' un | Custo médio: ' || ROUND(v_unit_total, 4) || '/un',
    COALESCE(_produced_at, now()),
    jsonb_build_object('category_id', v_cat, 'status', 'pago',
                       'due_date', (COALESCE(_produced_at, now()))::date));

  RETURN v_batch_id;
END; $$;

REVOKE ALL ON FUNCTION app_private.apply_movement(uuid) FROM PUBLIC;
REVOKE ALL ON FUNCTION app_private.record_movement(uuid, public.movement_core_type, public.movement_origin, uuid, uuid, numeric, numeric, numeric, uuid, uuid, uuid, uuid, uuid, uuid, uuid, uuid, public.payment_method, text, text, timestamptz, jsonb, text) FROM PUBLIC;

REVOKE ALL ON FUNCTION public.record_stock_movement(uuid, text, numeric, numeric, text) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.record_purchase(text, text, numeric, numeric, text, date, uuid, uuid, uuid, text, uuid, text) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.record_order_sale(uuid) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.record_cash_transaction(uuid, text, numeric, text, text, uuid) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.record_financial_entry(text, text, numeric, date, text, uuid, uuid, text, text) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.record_finished_movement(uuid, text, numeric, uuid, text) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.reverse_movement(uuid, text) FROM PUBLIC;

GRANT EXECUTE ON FUNCTION public.record_stock_movement(uuid, text, numeric, numeric, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.record_purchase(text, text, numeric, numeric, text, date, uuid, uuid, uuid, text, uuid, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.record_order_sale(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.record_cash_transaction(uuid, text, numeric, text, text, uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.record_financial_entry(text, text, numeric, date, text, uuid, uuid, text, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.record_finished_movement(uuid, text, numeric, uuid, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.reverse_movement(uuid, text) TO authenticated;