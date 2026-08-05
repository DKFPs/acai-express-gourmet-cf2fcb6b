import { Menu, Moon, Star, Sun } from "lucide-react";
import { useRouterState } from "@tanstack/react-router";

import { Breadcrumbs } from "@/components/layout/breadcrumbs";
import { GlobalSearch } from "@/components/layout/global-search";
import { NotificationsMenu } from "@/components/layout/notifications-menu";
import { UserMenu } from "@/components/layout/user-menu";
import { Button } from "@/components/ui/button";
import { ROUTE_LABELS } from "@/config/navigation";
import { useFavorites } from "@/hooks/use-audit";
import { useKeyboardShortcuts } from "@/hooks/use-shortcuts";
import { useTheme } from "@/hooks/use-theme";
import { cn } from "@/lib/utils";

export function AppHeader({ onOpenMobileMenu }: { onOpenMobileMenu: () => void }) {
  const { theme, toggleTheme } = useTheme();
  const { isFavorite, toggle } = useFavorites();
  const pathname = useRouterState({ select: (state) => state.location.pathname });
  useKeyboardShortcuts();

  const segment = pathname.split("/").filter(Boolean)[0] ?? "dashboard";
  const label = ROUTE_LABELS[segment] ?? "Página";
  const favorited = isFavorite(pathname);

  return (
    <header className="sticky top-0 z-30 flex h-16 items-center gap-3 border-b border-border bg-background/80 px-4 backdrop-blur-xl md:px-6">
      <Button
        variant="ghost"
        size="icon"
        className="rounded-xl md:hidden"
        onClick={onOpenMobileMenu}
        aria-label="Abrir menu"
      >
        <Menu className="h-5 w-5" />
      </Button>

      <div className="min-w-0 flex-1">
        <Breadcrumbs />
      </div>

      <div className="flex items-center gap-1">
        <GlobalSearch />
        <Button
          variant="ghost"
          size="icon"
          className="rounded-xl"
          aria-label="Favoritar página"
          onClick={() => toggle.mutate({ label, path: pathname })}
        >
          <Star className={cn("h-[18px] w-[18px]", favorited && "fill-gold text-gold")} />
        </Button>
        <Button
          variant="ghost"
          size="icon"
          className="rounded-xl"
          onClick={toggleTheme}
          aria-label="Alternar tema"
        >
          {theme === "dark" ? (
            <Sun className="h-[18px] w-[18px]" />
          ) : (
            <Moon className="h-[18px] w-[18px]" />
          )}
        </Button>
        <NotificationsMenu />
        <UserMenu />
      </div>
    </header>
  );
}
