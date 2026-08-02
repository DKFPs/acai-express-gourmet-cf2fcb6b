import {
  Banknote,
  BarChart3,
  Warehouse,
  Wallet,
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
      { title: "Pedidos", to: "/pedidos", icon: ShoppingBag, permission: "orders.view" },
      { title: "Produtos", to: "/produtos", icon: Boxes, permission: "products.view" },
      { title: "Clientes", to: "/clientes", icon: Users, permission: "customers.view" },
      { title: "Estoque", to: "/estoque", icon: Warehouse, permission: "stock.view" },
      { title: "Financeiro", to: "/financeiro", icon: Wallet, permission: "finance.view" },
      { title: "Caixa", to: "/caixa", icon: Banknote, permission: "cash.view" },
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
  clientes: "Clientes",
  produtos: "Produtos",
  estoque: "Estoque",
  financeiro: "Financeiro",
  caixa: "Caixa",
  relatorios: "Relatórios",
  usuarios: "Usuários",
  configuracoes: "Configurações",
  perfil: "Perfil",
};
