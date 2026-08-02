CREATE TABLE public.dashboard_goals (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid UNIQUE REFERENCES public.companies(id),
  daily_goal numeric NOT NULL DEFAULT 0,
  weekly_goal numeric NOT NULL DEFAULT 0,
  monthly_goal numeric NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.dashboard_goals TO authenticated;
GRANT ALL ON public.dashboard_goals TO service_role;
ALTER TABLE public.dashboard_goals ENABLE ROW LEVEL SECURITY;

CREATE POLICY "dashboard_goals_select" ON public.dashboard_goals FOR SELECT TO authenticated USING (true);
CREATE POLICY "dashboard_goals_insert" ON public.dashboard_goals FOR INSERT TO authenticated WITH CHECK (public.has_role(auth.uid(), 'administrador'));
CREATE POLICY "dashboard_goals_update" ON public.dashboard_goals FOR UPDATE TO authenticated USING (public.has_role(auth.uid(), 'administrador')) WITH CHECK (public.has_role(auth.uid(), 'administrador'));
CREATE POLICY "dashboard_goals_delete" ON public.dashboard_goals FOR DELETE TO authenticated USING (public.has_role(auth.uid(), 'administrador'));

CREATE TRIGGER dashboard_goals_updated_at BEFORE UPDATE ON public.dashboard_goals
FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

INSERT INTO public.dashboard_goals (company_id, daily_goal, weekly_goal, monthly_goal)
SELECT id, 800, 5000, 20000 FROM public.companies ORDER BY created_at LIMIT 1;

ALTER PUBLICATION supabase_realtime ADD TABLE public.orders;
ALTER PUBLICATION supabase_realtime ADD TABLE public.order_items;
ALTER PUBLICATION supabase_realtime ADD TABLE public.customers;
ALTER PUBLICATION supabase_realtime ADD TABLE public.ingredients;