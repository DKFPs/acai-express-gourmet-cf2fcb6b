ALTER TABLE public.customers
  ADD COLUMN IF NOT EXISTS whatsapp text,
  ADD COLUMN IF NOT EXISTS city text,
  ADD COLUMN IF NOT EXISTS zip_code text;

CREATE OR REPLACE FUNCTION public.customer_stats()
RETURNS TABLE (
  customer_id uuid,
  orders_count bigint,
  total_spent numeric,
  last_purchase timestamptz
)
LANGUAGE sql
STABLE
SECURITY INVOKER
SET search_path = public
AS $$
  SELECT o.customer_id,
         COUNT(*)::bigint,
         COALESCE(SUM(o.total), 0)::numeric,
         MAX(o.created_at)
  FROM public.orders o
  WHERE o.customer_id IS NOT NULL
    AND o.status <> 'cancelado'
  GROUP BY o.customer_id
$$;

REVOKE ALL ON FUNCTION public.customer_stats() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.customer_stats() TO authenticated;
GRANT EXECUTE ON FUNCTION public.customer_stats() TO service_role;