import { Menu, Moon, Sun } from "lucide-react";

import { Breadcrumbs } from "@/components/layout/breadcrumbs";
import { NotificationsMenu } from "@/components/layout/notifications-menu";
import { UserMenu } from "@/components/layout/user-menu";
import { Button } from "@/components/ui/button";
import { useTheme } from "@/hooks/use-theme";

export function AppHeader({ onOpenMobileMenu }: { onOpenMobileMenu: () => void }) {
  const { theme, toggleTheme } = useTheme();

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
        <Button
          variant="ghost"
          size="icon"
          className="rounded-xl"
          onClick={toggleTheme}
          aria-label="Alternar tema"
        >
          {theme === "dark" ? <Sun className="h-[18px] w-[18px]" /> : <Moon className="h-[18px] w-[18px]" />}
        </Button>
        <NotificationsMenu />
        <UserMenu />
      </div>
    </header>
  );
}
