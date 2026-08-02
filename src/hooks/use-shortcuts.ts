import { useNavigate } from "@tanstack/react-router";
import { useEffect } from "react";

const SHORTCUTS: { keys: string; to: string; label: string }[] = [
  { keys: "d", to: "/dashboard", label: "Dashboard" },
  { keys: "p", to: "/pedidos", label: "Pedidos" },
  { keys: "n", to: "/pedidos/novo", label: "Novo pedido" },
  { keys: "r", to: "/produtos", label: "Produtos" },
  { keys: "c", to: "/clientes", label: "Clientes" },
  { keys: "e", to: "/estoque", label: "Estoque" },
  { keys: "f", to: "/financeiro", label: "Financeiro" },
  { keys: "x", to: "/caixa", label: "Caixa" },
  { keys: "l", to: "/relatorios", label: "Relatórios" },
  { keys: "g", to: "/configuracoes", label: "Configurações" },
];

export const KEYBOARD_SHORTCUTS = SHORTCUTS;

/** Atalhos: Alt + tecla. Ctrl/Cmd + K abre a pesquisa global. */
export function useKeyboardShortcuts() {
  const navigate = useNavigate();

  useEffect(() => {
    const handler = (event: KeyboardEvent) => {
      if (!event.altKey || event.ctrlKey || event.metaKey) return;
      const target = event.target as HTMLElement | null;
      if (target && ["INPUT", "TEXTAREA", "SELECT"].includes(target.tagName)) return;

      const match = SHORTCUTS.find((shortcut) => shortcut.keys === event.key.toLowerCase());
      if (!match) return;
      event.preventDefault();
      void navigate({ to: match.to });
    };

    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [navigate]);
}
