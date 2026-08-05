ALTER FUNCTION app_private.unit_family(text) SET search_path = '';
ALTER FUNCTION app_private.base_unit_of(text) SET search_path = 'app_private';
ALTER FUNCTION app_private.unit_factor(text) SET search_path = '';
ALTER FUNCTION app_private.to_base_qty(numeric, text, text) SET search_path = 'app_private';
ALTER FUNCTION app_private.convert_qty(numeric, text, text) SET search_path = 'app_private';