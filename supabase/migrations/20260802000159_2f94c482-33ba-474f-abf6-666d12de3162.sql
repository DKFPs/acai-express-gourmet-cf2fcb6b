CREATE TYPE public.financial_entry_type AS ENUM ('receita','despesa','compra','investimento');
CREATE TYPE public.financial_entry_status AS ENUM ('pago','pendente','cancelado');
CREATE TYPE public.cash_register_status AS ENUM ('aberto','fechado');

CREATE TABLE public.expense_categories (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid REFERENCES public.companies(id),
  name text NOT NULL,
  type public.financial_entry_type NOT NULL DEFAULT 'despesa',
  color text,
  description text,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.expense_categories TO authenticated;
GRANT ALL ON public.expense_categories TO service_role;
ALTER TABLE public.expense_categories ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Autenticados veem categorias financeiras" ON public.expense_categories FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admins gerenciam categorias financeiras" ON public.expense_categories FOR ALL TO authenticated USING (has_role(auth.uid(),'administrador')) WITH CHECK (has_role(auth.uid(),'administrador'));

CREATE TABLE public.financial_entries (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid REFERENCES public.companies(id),
  category_id uuid REFERENCES public.expense_categories(id) ON DELETE SET NULL,
  order_id uuid REFERENCES public.orders(id) ON DELETE SET NULL,
  supplier_id uuid REFERENCES public.suppliers(id) ON DELETE SET NULL,
  type public.financial_entry_type NOT NULL,
  status public.financial_entry_status NOT NULL DEFAULT 'pendente',
  description text NOT NULL,
  amount numeric NOT NULL DEFAULT 0,
  payment_method public.payment_method,
  due_date date NOT NULL DEFAULT CURRENT_DATE,
  paid_at timestamptz,
  notes text,
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX financial_entries_due_date_idx ON public.financial_entries (due_date);
CREATE INDEX financial_entries_type_idx ON public.financial_entries (type);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.financial_entries TO authenticated;
GRANT ALL ON public.financial_entries TO service_role;
ALTER TABLE public.financial_entries ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Autenticados veem lancamentos" ON public.financial_entries FOR SELECT TO authenticated USING (true);
CREATE POLICY "Autenticados criam lancamentos" ON public.financial_entries FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Autenticados atualizam lancamentos" ON public.financial_entries FOR UPDATE TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Admins removem lancamentos" ON public.financial_entries FOR DELETE TO authenticated USING (has_role(auth.uid(),'administrador'));

CREATE TABLE public.cash_register (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid REFERENCES public.companies(id),
  status public.cash_register_status NOT NULL DEFAULT 'aberto',
  opening_amount numeric NOT NULL DEFAULT 0,
  closing_amount numeric,
  expected_amount numeric,
  difference numeric,
  opened_at timestamptz NOT NULL DEFAULT now(),
  closed_at timestamptz,
  notes text,
  opened_by uuid,
  closed_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.cash_register TO authenticated;
GRANT ALL ON public.cash_register TO service_role;
ALTER TABLE public.cash_register ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Autenticados veem caixa" ON public.cash_register FOR SELECT TO authenticated USING (true);
CREATE POLICY "Autenticados abrem caixa" ON public.cash_register FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Autenticados atualizam caixa" ON public.cash_register FOR UPDATE TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Admins removem caixa" ON public.cash_register FOR DELETE TO authenticated USING (has_role(auth.uid(),'administrador'));

CREATE TRIGGER set_expense_categories_updated_at BEFORE UPDATE ON public.expense_categories FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE TRIGGER set_financial_entries_updated_at BEFORE UPDATE ON public.financial_entries FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE TRIGGER set_cash_register_updated_at BEFORE UPDATE ON public.cash_register FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

INSERT INTO public.expense_categories (name, type, color) VALUES
  ('Vendas', 'receita', '#22C55E'),
  ('Outras receitas', 'receita', '#10B981'),
  ('Insumos', 'compra', '#F59E0B'),
  ('Embalagens', 'compra', '#EAB308'),
  ('Aluguel', 'despesa', '#EF4444'),
  ('Energia e água', 'despesa', '#F97316'),
  ('Salários', 'despesa', '#8B5CF6'),
  ('Marketing', 'despesa', '#EC4899'),
  ('Equipamentos', 'investimento', '#6D28D9'),
  ('Reformas', 'investimento', '#3B82F6');

INSERT INTO public.financial_entries (type, status, description, amount, payment_method, due_date, paid_at, category_id)
SELECT 'receita', 'pago', 'Vendas do dia', 1250.00, 'pix', CURRENT_DATE, now(), id FROM public.expense_categories WHERE name = 'Vendas';
INSERT INTO public.financial_entries (type, status, description, amount, payment_method, due_date, paid_at, category_id)
SELECT 'compra', 'pago', 'Compra de polpa de açaí', 480.00, 'dinheiro', CURRENT_DATE - 2, now() - interval '2 days', id FROM public.expense_categories WHERE name = 'Insumos';
INSERT INTO public.financial_entries (type, status, description, amount, payment_method, due_date, category_id)
SELECT 'despesa', 'pendente', 'Aluguel do ponto', 2200.00, 'pix', CURRENT_DATE + 5, id FROM public.expense_categories WHERE name = 'Aluguel';
INSERT INTO public.financial_entries (type, status, description, amount, payment_method, due_date, category_id)
SELECT 'despesa', 'pendente', 'Conta de energia', 380.00, 'outro', CURRENT_DATE + 8, id FROM public.expense_categories WHERE name = 'Energia e água';
INSERT INTO public.financial_entries (type, status, description, amount, payment_method, due_date, paid_at, category_id)
SELECT 'investimento', 'pago', 'Freezer novo', 3400.00, 'cartao_credito', CURRENT_DATE - 20, now() - interval '20 days', id FROM public.expense_categories WHERE name = 'Equipamentos';