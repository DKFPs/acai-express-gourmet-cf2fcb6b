
REVOKE EXECUTE ON FUNCTION public.recalc_recipe_costs(uuid, text) FROM anon, public;
REVOKE EXECUTE ON FUNCTION public.discard_batch(uuid, numeric, text) FROM anon, public;
REVOKE EXECUTE ON FUNCTION public.produce_batch(uuid, numeric, timestamptz, uuid, text) FROM anon, public;
GRANT EXECUTE ON FUNCTION public.recalc_recipe_costs(uuid, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.discard_batch(uuid, numeric, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.produce_batch(uuid, numeric, timestamptz, uuid, text) TO authenticated;
