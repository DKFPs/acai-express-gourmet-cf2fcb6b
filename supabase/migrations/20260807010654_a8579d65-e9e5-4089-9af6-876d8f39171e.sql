CREATE TYPE public.movement_core_type AS ENUM (
  'venda','compra','producao','descarte',
  'entrada_estoque','saida_estoque','ajuste_estoque',
  'caixa_entrada','caixa_saida','caixa_sangria',
  'receita','despesa','estorno'
);

CREATE TYPE public.movement_origin AS ENUM (
  'pedido','compra','producao','estoque','caixa','financeiro','manual','sistema'
);

CREATE TYPE public.movement_status AS ENUM ('pendente','aplicado','cancelado','estornado');

CREATE TABLE public.system_movements (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  occurred_at timestamptz NOT NULL DEFAULT now(),
  type public.movement_core_type NOT NULL,
  origin public.movement_origin NOT NULL DEFAULT 'manual',
  reference_id uuid,
  reference_label text,
  user_id uuid,
  user_name text,
  product_id uuid REFERENCES public.products(id) ON DELETE SET NULL,
  ingredient_id uuid REFERENCES public.ingredients(id) ON DELETE SET NULL,
  packaging_id uuid REFERENCES public.packaging_stock(id) ON DELETE SET NULL,
  recipe_id uuid REFERENCES public.recipes(id) ON DELETE SET NULL,
  batch_id uuid REFERENCES public.production_batches(id) ON DELETE SET NULL,
  finished_product_id uuid REFERENCES public.finished_products(id) ON DELETE SET NULL,
  customer_id uuid REFERENCES public.customers(id) ON DELETE SET NULL,
  cash_session_id uuid REFERENCES public.cash_sessions(id) ON DELETE SET NULL,
  amount numeric NOT NULL DEFAULT 0,
  quantity numeric NOT NULL DEFAULT 0,
  unit text,
  unit_cost numeric NOT NULL DEFAULT 0,
  payment_method public.payment_method,
  notes text,
  status public.movement_status NOT NULL DEFAULT 'pendente',
  applied_at timestamptz,
  reversed_movement_id uuid REFERENCES public.system_movements(id) ON DELETE SET NULL,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_system_movements_company_date ON public.system_movements (company_id, occurred_at DESC);
CREATE INDEX idx_system_movements_type ON public.system_movements (company_id, type);
CREATE INDEX idx_system_movements_origin ON public.system_movements (company_id, origin);
CREATE INDEX idx_system_movements_reference ON public.system_movements (reference_id);
CREATE UNIQUE INDEX uq_system_movements_dedupe
  ON public.system_movements (company_id, origin, type, reference_id, COALESCE(ingredient_id, '00000000-0000-0000-0000-000000000000'::uuid), COALESCE(product_id, '00000000-0000-0000-0000-000000000000'::uuid))
  WHERE reference_id IS NOT NULL AND status <> 'cancelado';

GRANT SELECT, INSERT, UPDATE, DELETE ON public.system_movements TO authenticated;
GRANT ALL ON public.system_movements TO service_role;

ALTER TABLE public.system_movements ENABLE ROW LEVEL SECURITY;

CREATE POLICY "movements_select_company" ON public.system_movements
  FOR SELECT TO authenticated USING (company_id = public.current_company_id());

CREATE POLICY "movements_insert_company" ON public.system_movements
  FOR INSERT TO authenticated WITH CHECK (company_id = public.current_company_id());

CREATE POLICY "movements_update_company" ON public.system_movements
  FOR UPDATE TO authenticated
  USING (company_id = public.current_company_id())
  WITH CHECK (company_id = public.current_company_id());

CREATE POLICY "movements_delete_admin" ON public.system_movements
  FOR DELETE TO authenticated
  USING (company_id = public.current_company_id() AND public.is_company_admin());

CREATE TRIGGER system_movements_updated_at
  BEFORE UPDATE ON public.system_movements
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();