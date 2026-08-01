import {
  BarChart3,
  Boxes,
  LayoutDashboard,
  Settings,
  ShoppingBag,
  Users,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";

import type { Permission } from "@/hooks/use-permissions";

export interface NavEntry {
  title: string;
  to: string;
  icon: LucideIcon;
  permission: Permission;
  soon?: boolean;
}

export interface NavSection {
  label: string;
  items: NavEntry[];
}

export const NAVIGATION: NavSection[] = [
  {
    label: "Geral",
    items: [
      {
        title: "Dashboard",
        to: "/dashboard",
        icon: LayoutDashboard,
        permission: "dashboard.view",
      },
    ],
  },
  {
    label: "Operação",
    items: [
      { title: "Pedidos", to: "/dashboard", icon: ShoppingBag, permission: "orders.manage", soon: true },
      { title: "Produtos", to: "/dashboard", icon: Boxes, permission: "products.manage", soon: true },
      { title: "Relatórios", to: "/dashboard", icon: BarChart3, permission: "reports.view", soon: true },
    ],
  },
  {
    label: "Administração",
    items: [
      { title: "Usuários", to: "/dashboard", icon: Users, permission: "users.manage", soon: true },
      { title: "Configurações", to: "/dashboard", icon: Settings, permission: "settings.manage", soon: true },
    ],
  },
];

export const ROUTE_LABELS: Record<string, string> = {
  dashboard: "Dashboard",
  pedidos: "Pedidos",
  produtos: "Produtos",
  relatorios: "Relatórios",
  usuarios: "Usuários",
  configuracoes: "Configurações",
  perfil: "Perfil",
};
