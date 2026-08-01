import type { Tables } from "@/integrations/supabase/types";

export type AppRole = "administrador" | "funcionario";

export type Profile = Tables<"profiles">;
export type Company = Tables<"companies">;
export type UserRole = Tables<"user_roles">;

export interface AuthUser {
  id: string;
  email: string | null;
}

export interface AppNotification {
  id: string;
  title: string;
  description: string;
  createdAt: string;
  read: boolean;
}

export interface NavItem {
  title: string;
  to: string;
  icon: string;
  roles?: AppRole[];
}
