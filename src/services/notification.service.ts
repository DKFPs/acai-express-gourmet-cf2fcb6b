import { supabase } from "@/integrations/supabase/client";
import type { NotificationRow } from "@/types/saas";

export const notificationService = {
  async list(companyId: string, limit = 30): Promise<NotificationRow[]> {
    const { data, error } = await supabase
      .from("notifications")
      .select("*")
      .eq("company_id", companyId)
      .order("created_at", { ascending: false })
      .limit(limit);
    if (error) throw error;
    return data ?? [];
  },

  async markRead(notification: NotificationRow, userId: string) {
    if (notification.read_by.includes(userId)) return;
    const { error } = await supabase
      .from("notifications")
      .update({ read_by: [...notification.read_by, userId] })
      .eq("id", notification.id);
    if (error) throw error;
  },

  async markAllRead(items: NotificationRow[], userId: string) {
    await Promise.all(
      items
        .filter((item) => !item.read_by.includes(userId))
        .map((item) => notificationService.markRead(item, userId)),
    );
  },

  async create(companyId: string, input: { title: string; message?: string; type?: string; link?: string }) {
    const { error } = await supabase.from("notifications").insert({
      company_id: companyId,
      title: input.title,
      ...(input.message ? { message: input.message } : {}),
      ...(input.type ? { type: input.type } : {}),
      ...(input.link ? { link: input.link } : {}),
    });
    if (error) throw error;
  },
};
