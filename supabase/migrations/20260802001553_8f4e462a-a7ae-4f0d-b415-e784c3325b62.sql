CREATE TABLE public.cash_sessions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid REFERENCES public.companies(id),
  status public.cash_register_status NOT NULL DEFAULT 'aberto',
  opening_amount numeric NOT NULL DEFAULT 0,
  closing_amount numeric,
  expected_amount numeric,
  difference numeric,
  total_in numeric NOT NULL DEFAULT 0,
  total_out numeric NOT NULL DEFAULT 0,
  total_withdrawal numeric NOT NULL DEFAULT 0,
  opened_at timestamptz NOT NULL DEFAULT now(),
  closed_at timestamptz,
  auto_closed boolean NOT NULL DEFAULT false,
  notes text,
  opened_by uuid,
  closed_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.cash_sessions TO authenticated;
GRANT ALL ON public.cash_sessions TO service_role;
ALTER TABLE public.cash_sessions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "cash_sessions_select" ON public.cash_sessions FOR SELECT TO authenticated USING (true);
CREATE POLICY "cash_sessions_insert" ON public.cash_sessions FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "cash_sessions_update" ON public.cash_sessions FOR UPDATE TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "cash_sessions_delete" ON public.cash_sessions FOR DELETE TO authenticated USING (public.has_role(auth.uid(), 'administrador'));

CREATE UNIQUE INDEX cash_sessions_single_open ON public.cash_sessions (status) WHERE status = 'aberto';

CREATE TYPE public.cash_transaction_type AS ENUM ('entrada', 'saida', 'sangria');

CREATE TABLE public.cash_transactions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id uuid NOT NULL REFERENCES public.cash_sessions(id) ON DELETE CASCADE,
  type public.cash_transaction_type NOT NULL,
  amount numeric NOT NULL,
  payment_method public.payment_method,
  description text NOT NULL,
  order_id uuid REFERENCES public.orders(id),
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.cash_transactions TO authenticated;
GRANT ALL ON public.cash_transactions TO service_role;
ALTER TABLE public.cash_transactions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "cash_transactions_select" ON public.cash_transactions FOR SELECT TO authenticated USING (true);
CREATE POLICY "cash_transactions_insert" ON public.cash_transactions FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "cash_transactions_update" ON public.cash_transactions FOR UPDATE TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "cash_transactions_delete" ON public.cash_transactions FOR DELETE TO authenticated USING (public.has_role(auth.uid(), 'administrador'));

CREATE TRIGGER cash_sessions_updated_at BEFORE UPDATE ON public.cash_sessions
FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE OR REPLACE FUNCTION public.recalc_cash_session()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE v_session uuid;
BEGIN
  v_session := COALESCE(NEW.session_id, OLD.session_id);
  UPDATE public.cash_sessions s SET
    total_in = COALESCE((SELECT SUM(t.amount) FROM public.cash_transactions t WHERE t.session_id = v_session AND t.type = 'entrada'), 0),
    total_out = COALESCE((SELECT SUM(t.amount) FROM public.cash_transactions t WHERE t.session_id = v_session AND t.type = 'saida'), 0),
    total_withdrawal = COALESCE((SELECT SUM(t.amount) FROM public.cash_transactions t WHERE t.session_id = v_session AND t.type = 'sangria'), 0)
  WHERE s.id = v_session;
  RETURN NULL;
END; $$;

REVOKE EXECUTE ON FUNCTION public.recalc_cash_session() FROM PUBLIC, anon, authenticated;

CREATE TRIGGER cash_transactions_recalc
AFTER INSERT OR UPDATE OR DELETE ON public.cash_transactions
FOR EACH ROW EXECUTE FUNCTION public.recalc_cash_session();