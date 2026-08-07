-- 1) Preserva o tipo original do lançamento financeiro
CREATE OR REPLACE FUNCTION app_private.apply_movement(_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, app_private
AS $$
DECLARE
  m public.system_movements%ROWTYPE;
  v_old_qty numeric; v_old_cost numeric; v_new_cost numeric; r RECORD;
BEGIN
  SELECT * INTO m FROM public.system_movements WHERE id = _id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Movimentação não encontrada'; END IF;
  IF m.status IN ('aplicado','cancelado') THEN RETURN; END IF;

  IF m.type = 'compra' THEN
    IF m.ingredient_id IS NOT NULL THEN
      SELECT quantity, purchase_price INTO v_old_qty, v_old_cost FROM public.ingredients WHERE id = m.ingredient_id;
      IF COALESCE(v_old_qty,0) + m.quantity > 0 THEN
        v_new_cost := ((GREATEST(COALESCE(v_old_qty,0),0) * COALESCE(v_old_cost,0)) + m.amount)
                      / (GREATEST(COALESCE(v_old_qty,0),0) + m.quantity);
      ELSE v_new_cost := m.unit_cost; END IF;
      UPDATE public.ingredients
         SET purchase_price = ROUND(v_new_cost, 4), quantity = quantity + m.quantity,
             last_purchase_quantity = m.quantity, last_purchase_value = m.amount,
             last_purchase_at = m.occurred_at::date
       WHERE id = m.ingredient_id;
      INSERT INTO public.stock_movements (company_id, ingredient_id, type, quantity, unit_cost, reason, created_by)
      VALUES (m.company_id, m.ingredient_id, 'entrada', m.quantity, m.unit_cost, COALESCE(m.notes,'Compra'), m.user_id);
    ELSIF m.packaging_id IS NOT NULL THEN
      SELECT quantity, unit_cost INTO v_old_qty, v_old_cost FROM public.packaging_stock WHERE id = m.packaging_id;
      IF COALESCE(v_old_qty,0) + m.quantity > 0 THEN
        v_new_cost := ((GREATEST(COALESCE(v_old_qty,0),0) * COALESCE(v_old_cost,0)) + m.amount)
                      / (GREATEST(COALESCE(v_old_qty,0),0) + m.quantity);
      ELSE v_new_cost := m.unit_cost; END IF;
      UPDATE public.packaging_stock
         SET quantity = COALESCE(quantity,0) + m.quantity, unit_cost = ROUND(v_new_cost, 4),
             purchase_quantity = m.quantity, purchase_value = m.amount, last_purchase_at = m.occurred_at::date
       WHERE id = m.packaging_id;
    END IF;

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

  ELSIF m.type = 'producao' THEN
    UPDATE public.finished_products
       SET quantity_available = quantity_available + m.quantity, quantity_produced = quantity_produced + m.quantity
     WHERE id = m.finished_product_id;
    INSERT INTO public.finished_product_movements (company_id, finished_product_id, batch_id, type, quantity, reason, created_by)
    VALUES (m.company_id, m.finished_product_id, m.batch_id, 'producao', m.quantity, m.notes, m.user_id);

  ELSIF m.type = 'descarte' THEN
    UPDATE public.finished_products
       SET quantity_available = quantity_available - m.quantity, quantity_discarded = quantity_discarded + m.quantity
     WHERE id = m.finished_product_id;
    INSERT INTO public.finished_product_movements (company_id, finished_product_id, batch_id, type, quantity, reason, created_by)
    VALUES (m.company_id, m.finished_product_id, m.batch_id, 'descarte', m.quantity, m.notes, m.user_id);

  ELSIF m.type = 'venda' THEN
    IF m.product_id IS NOT NULL THEN
      UPDATE public.products SET stock_quantity = stock_quantity - m.quantity WHERE id = m.product_id;
      FOR r IN SELECT pi.ingredient_id, pi.quantity AS qty, i.purchase_price
                 FROM public.product_ingredients pi JOIN public.ingredients i ON i.id = pi.ingredient_id
                WHERE pi.product_id = m.product_id
      LOOP
        PERFORM app_private.record_movement(m.company_id, 'saida_estoque', 'pedido', m.reference_id, m.user_id,
          r.qty * m.quantity, 0, r.purchase_price, NULL, r.ingredient_id, NULL, NULL, NULL,
          m.finished_product_id, m.customer_id, NULL, NULL, NULL, 'Venda automática', m.occurred_at);
      END LOOP;
    END IF;
    IF m.finished_product_id IS NOT NULL THEN
      UPDATE public.finished_products
         SET quantity_available = quantity_available - m.quantity, quantity_sold = quantity_sold + m.quantity
       WHERE id = m.finished_product_id;
      INSERT INTO public.finished_product_movements (company_id, finished_product_id, batch_id, type, quantity, reason, created_by)
      VALUES (m.company_id, m.finished_product_id, m.batch_id, 'venda', m.quantity, m.notes, m.user_id);
    END IF;

  ELSIF m.type IN ('caixa_entrada','caixa_saida','caixa_sangria') THEN
    INSERT INTO public.cash_transactions (session_id, type, amount, payment_method, description, order_id, created_by)
    VALUES (m.cash_session_id,
      (CASE m.type WHEN 'caixa_entrada' THEN 'entrada' WHEN 'caixa_saida' THEN 'saida' ELSE 'sangria' END)::public.cash_transaction_type,
      m.amount, m.payment_method, COALESCE(m.notes,'Movimentação de caixa'),
      CASE WHEN m.origin = 'pedido' THEN m.reference_id END, m.user_id);
    UPDATE public.cash_sessions s SET
      total_in = COALESCE((SELECT SUM(t.amount) FROM public.cash_transactions t WHERE t.session_id = m.cash_session_id AND t.type='entrada'),0),
      total_out = COALESCE((SELECT SUM(t.amount) FROM public.cash_transactions t WHERE t.session_id = m.cash_session_id AND t.type='saida'),0),
      total_withdrawal = COALESCE((SELECT SUM(t.amount) FROM public.cash_transactions t WHERE t.session_id = m.cash_session_id AND t.type='sangria'),0)
    WHERE s.id = m.cash_session_id;

  ELSIF m.type IN ('receita','despesa') THEN
    INSERT INTO public.financial_entries (company_id, category_id, order_id, supplier_id, type, status,
      description, amount, payment_method, due_date, paid_at, notes, created_by)
    VALUES (m.company_id, NULLIF(m.metadata->>'category_id','')::uuid,
      CASE WHEN m.origin = 'pedido' THEN m.reference_id END,
      NULLIF(m.metadata->>'supplier_id','')::uuid,
      COALESCE(NULLIF(m.metadata->>'entry_type',''), m.type::text)::public.financial_entry_type,
      COALESCE(NULLIF(m.metadata->>'status',''), 'pendente')::public.financial_entry_status,
      COALESCE(m.reference_label,'Lançamento'), m.amount, m.payment_method,
      COALESCE(NULLIF(m.metadata->>'due_date','')::date, m.occurred_at::date),
      CASE WHEN COALESCE(m.metadata->>'status','') = 'pago' THEN m.occurred_at END,
      m.notes, m.user_id);
  END IF;

  UPDATE public.system_movements SET status = 'aplicado', applied_at = now() WHERE id = _id;
END; $$;

-- 2) Backfill do histórico (sem reaplicar efeitos)
INSERT INTO public.system_movements
  (company_id, occurred_at, type, origin, reference_id, reference_label, user_id, ingredient_id,
   packaging_id, quantity, amount, unit_cost, unit, notes, status, applied_at)
SELECT p.company_id, p.purchase_date::timestamptz, 'compra', 'compra', p.id, p.item_name, p.created_by,
       p.ingredient_id, p.packaging_id, p.quantity, p.total_value, p.unit_cost, p.unit, p.notes, 'aplicado', p.created_at
FROM public.purchases p
ON CONFLICT DO NOTHING;

INSERT INTO public.system_movements
  (company_id, occurred_at, type, origin, reference_id, user_id, ingredient_id, quantity, unit_cost, notes, status, applied_at)
SELECT sm.company_id, sm.created_at,
       (CASE sm.type WHEN 'entrada' THEN 'entrada_estoque' WHEN 'saida' THEN 'saida_estoque' ELSE 'ajuste_estoque' END)::public.movement_core_type,
       'sistema', sm.id, sm.created_by, sm.ingredient_id, sm.quantity, sm.unit_cost, sm.reason, 'aplicado', sm.created_at
FROM public.stock_movements sm
WHERE sm.created_at < now() - interval '1 minute'
ON CONFLICT DO NOTHING;

INSERT INTO public.system_movements
  (company_id, occurred_at, type, origin, reference_id, user_id, cash_session_id, amount, payment_method, notes, status, applied_at)
SELECT s.company_id, t.created_at,
       (CASE t.type WHEN 'entrada' THEN 'caixa_entrada' WHEN 'saida' THEN 'caixa_saida' ELSE 'caixa_sangria' END)::public.movement_core_type,
       'sistema', t.id, t.created_by, t.session_id, t.amount, t.payment_method, t.description, 'aplicado', t.created_at
FROM public.cash_transactions t
JOIN public.cash_sessions s ON s.id = t.session_id
WHERE t.created_at < now() - interval '1 minute'
ON CONFLICT DO NOTHING;

INSERT INTO public.system_movements
  (company_id, occurred_at, type, origin, reference_id, reference_label, user_id, amount, payment_method, notes, status, applied_at, metadata)
SELECT f.company_id, COALESCE(f.paid_at, f.due_date::timestamptz), 
       (CASE WHEN f.type = 'receita' THEN 'receita' ELSE 'despesa' END)::public.movement_core_type,
       'sistema', f.id, f.description, f.created_by, f.amount, f.payment_method, f.notes, 'aplicado', f.created_at,
       jsonb_build_object('entry_type', f.type::text, 'status', f.status::text, 'category_id', f.category_id)
FROM public.financial_entries f
WHERE f.created_at < now() - interval '1 minute'
ON CONFLICT DO NOTHING;

INSERT INTO public.system_movements
  (company_id, occurred_at, type, origin, reference_id, user_id, finished_product_id, batch_id, quantity, notes, status, applied_at)
SELECT fm.company_id, fm.created_at,
       (CASE fm.type WHEN 'producao' THEN 'producao' WHEN 'descarte' THEN 'descarte'
                     WHEN 'venda' THEN 'venda' ELSE 'ajuste_estoque' END)::public.movement_core_type,
       'sistema', fm.id, fm.created_by, fm.finished_product_id, fm.batch_id, fm.quantity, fm.reason, 'aplicado', fm.created_at
FROM public.finished_product_movements fm
WHERE fm.created_at < now() - interval '1 minute'
ON CONFLICT DO NOTHING;

INSERT INTO public.system_movements
  (company_id, occurred_at, type, origin, reference_id, reference_label, user_id, product_id, customer_id,
   quantity, amount, unit_cost, payment_method, status, applied_at)
SELECT o.company_id, o.created_at, 'venda', 'pedido', o.id, oi.product_name, o.created_by,
       oi.product_id, o.customer_id, oi.quantity, oi.line_total, oi.unit_price, o.payment_method, 'aplicado', o.created_at
FROM public.order_items oi
JOIN public.orders o ON o.id = oi.order_id
WHERE oi.product_id IS NOT NULL AND o.created_at < now() - interval '1 minute'
ON CONFLICT DO NOTHING;

-- 3) Visões consolidadas alimentadas pelo núcleo
CREATE OR REPLACE VIEW public.v_sales
WITH (security_invoker = true) AS
SELECT m.id, m.company_id, m.occurred_at, m.reference_id AS order_id, m.customer_id, m.product_id,
       m.reference_label AS product_name, m.quantity, m.amount, m.unit_cost, m.payment_method, m.status
FROM public.system_movements m
WHERE m.type = 'venda' AND m.status = 'aplicado';

CREATE OR REPLACE VIEW public.v_cash_flow
WITH (security_invoker = true) AS
SELECT m.id, m.company_id, m.occurred_at, m.cash_session_id, m.type, m.amount, m.payment_method, m.notes
FROM public.system_movements m
WHERE m.type IN ('caixa_entrada','caixa_saida','caixa_sangria') AND m.status = 'aplicado';

CREATE OR REPLACE VIEW public.v_stock_ledger
WITH (security_invoker = true) AS
SELECT m.id, m.company_id, m.occurred_at, m.ingredient_id, m.type, m.origin,
       CASE WHEN m.type IN ('entrada_estoque','compra') THEN m.quantity
            WHEN m.type = 'saida_estoque' THEN -m.quantity ELSE 0 END AS delta,
       m.quantity, m.unit_cost, m.notes
FROM public.system_movements m
WHERE m.type IN ('entrada_estoque','saida_estoque','ajuste_estoque','compra') AND m.status = 'aplicado';

GRANT SELECT ON public.v_sales TO authenticated;
GRANT SELECT ON public.v_cash_flow TO authenticated;
GRANT SELECT ON public.v_stock_ledger TO authenticated;