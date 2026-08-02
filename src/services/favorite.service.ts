import { supabase } from "@/integrations/supabase/client";
import type { UserFavorite } from "@/types/saas";

export const favoriteService = {
  async list(userId: string): Promise<UserFavorite[]> {
    const { data, error } = await supabase
      .from("user_favorites")
      .select("*")
      .eq("user_id", userId)
      .order("created_at", { ascending: true });
    if (error) throw error;
    return data ?? [];
  },

  async add(userId: string, label: string, path: string) {
    const { error } = await supabase
      .from("user_favorites")
      .insert({ user_id: userId, label, path });
    if (error) throw error;
  },

  async remove(userId: string, path: string) {
    const { error } = await supabase
      .from("user_favorites")
      .delete()
      .eq("user_id", userId)
      .eq("path", path);
    if (error) throw error;
  },
};
