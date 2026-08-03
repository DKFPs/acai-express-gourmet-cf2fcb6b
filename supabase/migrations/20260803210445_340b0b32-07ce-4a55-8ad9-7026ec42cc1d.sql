CREATE TYPE public.purchase_item_kind AS ENUM ('ingrediente', 'embalagem');

CREATE TABLE public.purchases (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  supplier_id uuid REFERENCES public.suppliers(id) ON DELETE SET NULL,
  supplier_name text,
  kind public.purchase_item_kind NOT NULL DEFAULT 'ingrediente',
  ingredient_id uuid REFERENCES public.ingredients(id) ON DELETE SET NULL,
  packaging_id uuid REFERENCES public.packaging_stock(id) ON DELETE SET NULL,
  category_id uuid REFERENCES public.categories(id) ON DELETE SET NULL,
  item_name text NOT NULL,
  quantity numeric NOT NULL CHECK (quantity > 0),
  unit text NOT NULL DEFAULT 'un',
  total_value numeric NOT NULL DEFAULT 0 CHECK (total_value >= 0),
  unit_cost numeric NOT NULL DEFAULT 0,
  purchase_date date NOT NULL DEFAULT current_date,
  notes text,
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX purchases_company_date_idx ON public.purchases (company_id, purchase_date DESC);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.purchases TO authenticated;
GRANT ALL ON public.purchases TO service_role;

ALTER TABLE public.purchases ENABLE ROW LEVEL SECURITY;

CREATE POLICY purchases_select ON public.purchases FOR SELECT TO authenticated
  USING (company_id = app_private.current_company_id());
CREATE POLICY purchases_insert ON public.purchases FOR INSERT TO authenticated
  WITH CHECK (company_id = app_private.current_company_id());
CREATE POLICY purchases_update ON public.purchases FOR UPDATE TO authenticated
  USING (company_id = app_private.current_company_id() AND app_private.is_company_admin())
  WITH CHECK (company_id = app_private.current_company_id());
CREATE POLICY purchases_delete ON public.purchases FOR DELETE TO authenticated
  USING (company_id = app_private.current_company_id() AND app_private.is_company_admin());

CREATE TRIGGER purchases_updated_at BEFORE UPDATE ON public.purchases
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE OR REPLACE FUNCTION public.apply_purchase()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
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

    -- atualiza custo médio (dispara recálculo das receitas)
    UPDATE public.ingredients SET purchase_price = ROUND(v_new_cost, 4) WHERE id = NEW.ingredient_id;

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
           unit_cost = ROUND(v_new_cost, 4)
     WHERE id = NEW.packaging_id;
  END IF;

  RETURN NULL;
END; $$;

CREATE TRIGGER trg_apply_purchase AFTER INSERT ON public.purchases
  FOR EACH ROW EXECUTE FUNCTION public.apply_purchase();

CREATE TRIGGER trg_audit_purchases AFTER INSERT OR UPDATE OR DELETE ON public.purchases
  FOR EACH ROW EXECUTE FUNCTION public.write_audit_log();