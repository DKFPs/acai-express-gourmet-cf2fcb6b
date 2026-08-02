import { supabase } from "@/integrations/supabase/client";
import type { CompanyMember, CompanySettings } from "@/types/saas";
import type { Company } from "@/types";

export const settingsService = {
  async getSettings(companyId: string): Promise<CompanySettings | null> {
    const { data, error } = await supabase
      .from("company_settings")
      .select("*")
      .eq("company_id", companyId)
      .maybeSingle();
    if (error) throw error;
    return data;
  },

  async upsertSettings(companyId: string, values: Partial<CompanySettings>) {
    const existing = await settingsService.getSettings(companyId);
    if (existing) {
      const { error } = await supabase
        .from("company_settings")
        .update(values)
        .eq("company_id", companyId);
      if (error) throw error;
      return;
    }
    const { error } = await supabase
      .from("company_settings")
      .insert({ ...values, company_id: companyId });
    if (error) throw error;
  },

  async updateCompany(companyId: string, values: Partial<Company>) {
    const { error } = await supabase.from("companies").update(values).eq("id", companyId);
    if (error) throw error;
  },

  async uploadLogo(companyId: string, file: File): Promise<string> {
    const ext = file.name.split(".").pop() ?? "png";
    const path = `${companyId}/logo-${Date.now()}.${ext}`;
    const { error } = await supabase.storage
      .from("product-images")
      .upload(path, file, { upsert: true });
    if (error) throw error;
    const { data } = await supabase.storage.from("product-images").createSignedUrl(path, 60 * 60 * 24 * 365);
    return data?.signedUrl ?? path;
  },

  async listMembers(companyId: string): Promise<CompanyMember[]> {
    const { data: profiles, error } = await supabase
      .from("profiles")
      .select("id, full_name, phone, is_active, created_at")
      .eq("company_id", companyId)
      .order("created_at", { ascending: true });
    if (error) throw error;

    const ids = (profiles ?? []).map((p) => p.id);
    if (ids.length === 0) return [];

    const { data: roles, error: rolesError } = await supabase
      .from("user_roles")
      .select("user_id, role")
      .in("user_id", ids);
    if (rolesError) throw rolesError;

    return (profiles ?? []).map((profile) => ({
      ...profile,
      role: (roles?.find((r) => r.user_id === profile.id)?.role ?? "funcionario") as CompanyMember["role"],
    }));
  },

  async setMemberRole(userId: string, role: CompanyMember["role"]) {
    const { error: deleteError } = await supabase.from("user_roles").delete().eq("user_id", userId);
    if (deleteError) throw deleteError;
    const { error } = await supabase.from("user_roles").insert({ user_id: userId, role });
    if (error) throw error;
  },

  async setMemberActive(userId: string, isActive: boolean) {
    const { error } = await supabase.from("profiles").update({ is_active: isActive }).eq("id", userId);
    if (error) throw error;
  },
};
