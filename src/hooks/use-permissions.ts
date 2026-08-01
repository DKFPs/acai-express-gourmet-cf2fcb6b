import { useAuth } from "@/hooks/use-auth";
import type { AppRole } from "@/types";

/**
 * Camada de permissões preparada para novos módulos.
 * Basta declarar a permissão aqui e liberar para os papéis desejados.
 */
export const PERMISSIONS = {
  "dashboard.view": ["administrador", "funcionario"],
  "orders.view": ["administrador", "funcionario"],
  "orders.manage": ["administrador", "funcionario"],
  "orders.delete": ["administrador"],
  "products.view": ["administrador", "funcionario"],
  "products.manage": ["administrador"],
  "reports.view": ["administrador"],
  "users.manage": ["administrador"],
  "settings.manage": ["administrador"],
} as const satisfies Record<string, readonly AppRole[]>;

export type Permission = keyof typeof PERMISSIONS;

export function usePermissions() {
  const { roles, isAdmin } = useAuth();

  const can = (permission: Permission) =>
    (PERMISSIONS[permission] as readonly AppRole[]).some((role) => roles.includes(role));

  return { roles, isAdmin, can };
}
