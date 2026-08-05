CREATE TABLE IF NOT EXISTS public.reminders (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  title text NOT NULL CHECK (char_length(title) BETWEEN 1 AND 160),
  done boolean NOT NULL DEFAULT false,
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.reminders TO authenticated;
GRANT ALL ON public.reminders TO service_role;

ALTER TABLE public.reminders ENABLE ROW LEVEL SECURITY;

CREATE POLICY reminders_select ON public.reminders FOR SELECT TO authenticated
  USING (company_id = public.current_company_id());
CREATE POLICY reminders_insert ON public.reminders FOR INSERT TO authenticated
  WITH CHECK (company_id = public.current_company_id());
CREATE POLICY reminders_update ON public.reminders FOR UPDATE TO authenticated
  USING (company_id = public.current_company_id())
  WITH CHECK (company_id = public.current_company_id());
CREATE POLICY reminders_delete ON public.reminders FOR DELETE TO authenticated
  USING (company_id = public.current_company_id());

CREATE INDEX IF NOT EXISTS reminders_company_idx ON public.reminders (company_id, done, created_at DESC);

CREATE TRIGGER reminders_set_updated_at
  BEFORE UPDATE ON public.reminders
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TABLE IF NOT EXISTS public.tasks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  title text NOT NULL CHECK (char_length(title) BETWEEN 1 AND 160),
  notes text,
  due_date date,
  priority text NOT NULL DEFAULT 'normal' CHECK (priority IN ('baixa','normal','alta')),
  done boolean NOT NULL DEFAULT false,
  done_at timestamptz,
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.tasks TO authenticated;
GRANT ALL ON public.tasks TO service_role;

ALTER TABLE public.tasks ENABLE ROW LEVEL SECURITY;

CREATE POLICY tasks_select ON public.tasks FOR SELECT TO authenticated
  USING (company_id = public.current_company_id());
CREATE POLICY tasks_insert ON public.tasks FOR INSERT TO authenticated
  WITH CHECK (company_id = public.current_company_id());
CREATE POLICY tasks_update ON public.tasks FOR UPDATE TO authenticated
  USING (company_id = public.current_company_id())
  WITH CHECK (company_id = public.current_company_id());
CREATE POLICY tasks_delete ON public.tasks FOR DELETE TO authenticated
  USING (company_id = public.current_company_id());

CREATE INDEX IF NOT EXISTS tasks_company_idx ON public.tasks (company_id, done, due_date);

CREATE TRIGGER tasks_set_updated_at
  BEFORE UPDATE ON public.tasks
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
