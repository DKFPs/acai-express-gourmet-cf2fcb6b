import {
  Banknote,
  Brain,
  BarChart3,

  Warehouse,
  ShoppingCart,
  Zap,
  FlaskConical,
  Wallet,
  Boxes,
  LayoutDashboard,
  ScrollText,
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
      { title: "Produção", to: "/producao", icon: FlaskConical, permission: "production.view" },
      {
        title: "Produção Rápida",
        to: "/producao-rapida",
        icon: Zap,
        permission: "production.manage",
      },
      { title: "Estoque", to: "/estoque", icon: Warehouse, permission: "stock.view" },
      { title: "Compras", to: "/compras", icon: ShoppingCart, permission: "stock.view" },
      { title: "Financeiro", to: "/financeiro", icon: Wallet, permission: "finance.view" },
      { title: "Caixa", to: "/caixa", icon: Banknote, permission: "cash.view" },
      { title: "Relatórios", to: "/relatorios", icon: BarChart3, permission: "reports.view" },
      { title: "Inteligência", to: "/inteligencia", icon: Brain, permission: "intelligence.view" },
    ],
  },
  {
    label: "Administração",
    items: [
      { title: "Usuários", to: "/usuarios", icon: Users, permission: "users.manage" },
      { title: "Auditoria", to: "/auditoria", icon: ScrollText, permission: "audit.view" },
      { title: "Configurações", to: "/configuracoes", icon: Settings, permission: "settings.manage" },
    ],
  },
];

export const ROUTE_LABELS: Record<string, string> = {
  dashboard: "Dashboard",
  pedidos: "Pedidos",
  clientes: "Clientes",
  produtos: "Produtos",
  producao: "Produção",
  "producao-rapida": "Produção Rápida",
  estoque: "Estoque",
  compras: "Compras",
  financeiro: "Financeiro",
  caixa: "Caixa",
  relatorios: "Relatórios",
  inteligencia: "Inteligência",
  usuarios: "Usuários",
  auditoria: "Auditoria",
  configuracoes: "Configurações",
  perfil: "Perfil",
};
