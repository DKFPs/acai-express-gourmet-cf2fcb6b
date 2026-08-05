import { useAuth } from "@/hooks/use-auth";
import type { AppRole } from "@/types";

/**
 * Camada de permissões preparada para novos módulos.
 * Basta declarar a permissão aqui e liberar para os papéis desejados.
 */
export const PERMISSIONS = {
  "dashboard.view": ["administrador", "funcionario"],
  "dashboard.goals": ["administrador"],
  "orders.view": ["administrador", "funcionario"],
  "orders.manage": ["administrador", "funcionario"],
  "orders.delete": ["administrador"],
  "customers.view": ["administrador", "funcionario"],
  "customers.manage": ["administrador", "funcionario"],
  "customers.delete": ["administrador"],
  "products.view": ["administrador", "funcionario"],
  "products.manage": ["administrador"],
  "production.view": ["administrador", "funcionario"],
  "production.manage": ["administrador", "funcionario"],
  "stock.view": ["administrador", "funcionario"],
  "stock.manage": ["administrador"],
  "finance.view": ["administrador", "funcionario"],
  "finance.manage": ["administrador"],
  "cash.view": ["administrador", "funcionario"],
  "cash.manage": ["administrador", "funcionario"],
  "reports.view": ["administrador", "funcionario"],
  "intelligence.view": ["administrador", "funcionario"],
  "tools.view": ["administrador", "funcionario"],
  "users.manage": ["administrador"],
  "audit.view": ["administrador"],
  "backup.run": ["administrador"],
  "settings.manage": ["administrador"],
} as const satisfies Record<string, readonly AppRole[]>;

export type Permission = keyof typeof PERMISSIONS;

export function usePermissions() {
  const { roles, isAdmin } = useAuth();

  const can = (permission: Permission) =>
    (PERMISSIONS[permission] as readonly AppRole[]).some((role) => roles.includes(role));

  return { roles, isAdmin, can };
}
