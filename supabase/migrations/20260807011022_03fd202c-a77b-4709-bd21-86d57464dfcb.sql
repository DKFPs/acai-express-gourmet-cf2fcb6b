REVOKE EXECUTE ON FUNCTION public.record_stock_movement(uuid, text, numeric, numeric, text) FROM anon;
REVOKE EXECUTE ON FUNCTION public.record_purchase(text, text, numeric, numeric, text, date, uuid, uuid, uuid, text, uuid, text) FROM anon;
REVOKE EXECUTE ON FUNCTION public.record_order_sale(uuid) FROM anon;
REVOKE EXECUTE ON FUNCTION public.record_cash_transaction(uuid, text, numeric, text, text, uuid) FROM anon;
REVOKE EXECUTE ON FUNCTION public.record_financial_entry(text, text, numeric, date, text, uuid, uuid, text, text) FROM anon;
REVOKE EXECUTE ON FUNCTION public.record_finished_movement(uuid, text, numeric, uuid, text) FROM anon;
REVOKE EXECUTE ON FUNCTION public.reverse_movement(uuid, text) FROM anon;