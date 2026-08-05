import { supabase } from "@/integrations/supabase/client";
import type { AppRole, Company, Profile } from "@/types";

export const profileService = {
  async getProfile(userId: string): Promise<Profile | null> {
    const { data, error } = await supabase
      .from("profiles")
      .select("*")
      .eq("id", userId)
      .maybeSingle();
    if (error) throw error;
    return data;
  },

  async getRoles(userId: string): Promise<AppRole[]> {
    const { data, error } = await supabase.from("user_roles").select("role").eq("user_id", userId);
    if (error) throw error;
    return (data ?? []).map((row) => row.role as AppRole);
  },

  async getCompany(companyId: string): Promise<Company | null> {
    const { data, error } = await supabase
      .from("companies")
      .select("*")
      .eq("id", companyId)
      .maybeSingle();
    if (error) throw error;
    return data;
  },

  async updateProfile(userId: string, values: Partial<Profile>) {
    const { error } = await supabase.from("profiles").update(values).eq("id", userId);
    if (error) throw error;
  },
};
