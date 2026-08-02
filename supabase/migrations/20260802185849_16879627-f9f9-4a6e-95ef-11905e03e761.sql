-- 1. Revoke EXECUTE on internal SECURITY DEFINER functions from API roles
REVOKE EXECUTE ON FUNCTION public.apply_finished_movement() FROM anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.notify_low_stock() FROM anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.notify_new_order() FROM anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.recalc_recipe_on_items() FROM anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.recalc_recipe_on_recipe() FROM anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.recalc_recipes_for_ingredient() FROM anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.recalc_recipes_for_packaging() FROM anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.write_audit_log() FROM anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.recalc_recipe_costs(uuid, text) FROM anon, authenticated;

-- helpers used inside policies: not needed by anon
REVOKE EXECUTE ON FUNCTION public.current_company_id() FROM anon;
REVOKE EXECUTE ON FUNCTION public.is_company_admin() FROM anon;

-- 2. Invited sign-ups no longer receive an automatic role / active access
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_company uuid;
  v_invite uuid;
  v_is_owner boolean := false;
BEGIN
  v_invite := NULLIF(NEW.raw_user_meta_data ->> 'company_id', '')::uuid;

  IF v_invite IS NOT NULL AND EXISTS (SELECT 1 FROM public.companies WHERE id = v_invite) THEN
    v_company := v_invite;
  ELSE
    INSERT INTO public.companies (name)
    VALUES (COALESCE(NULLIF(NEW.raw_user_meta_data ->> 'company_name', ''), 'Minha Empresa'))
    RETURNING id INTO v_company;
    INSERT INTO public.company_settings (company_id) VALUES (v_company);
    v_is_owner := true;
  END IF;

  INSERT INTO public.profiles (id, full_name, company_id, is_active)
  VALUES (NEW.id, COALESCE(NEW.raw_user_meta_data ->> 'full_name', ''), v_company, v_is_owner);

  -- Only the creator of a brand new company gets a role automatically.
  -- Invited users stay inactive and role-less until an administrator approves them.
  IF v_is_owner THEN
    INSERT INTO public.user_roles (user_id, role) VALUES (NEW.id, 'administrador');
  ELSE
    INSERT INTO public.notifications (company_id, title, message, type, link)
    VALUES (v_company, 'Novo acesso aguardando aprovação',
            COALESCE(NULLIF(NEW.raw_user_meta_data ->> 'full_name', ''), NEW.email) ||
            ' solicitou acesso. Ative e defina o papel em Usuários.', 'user', '/usuarios');
  END IF;

  RETURN NEW;
END; $function$;

-- 3. Inactive members resolve to no company, so RLS denies all tenant data
CREATE OR REPLACE FUNCTION public.current_company_id()
RETURNS uuid
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $function$
  SELECT company_id FROM public.profiles WHERE id = auth.uid() AND is_active
$function$;