import { useState, type ReactNode } from "react";
import { Link, useRouterState } from "@tanstack/react-router";

import { Logo } from "@/components/brand/logo";
import { AppHeader } from "@/components/layout/app-header";
import { AppSidebar } from "@/components/layout/app-sidebar";
import { Sheet, SheetContent, SheetTitle } from "@/components/ui/sheet";
import { NAVIGATION } from "@/config/navigation";
import { usePermissions } from "@/hooks/use-permissions";
import { cn } from "@/lib/utils";

export function AppLayout({ children }: { children: ReactNode }) {
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const { can } = usePermissions();
  const pathname = useRouterState({ select: (state) => state.location.pathname });

  return (
    <div className="flex min-h-screen w-full bg-background">
      <AppSidebar collapsed={collapsed} onToggle={() => setCollapsed((value) => !value)} />

      <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
        <SheetContent side="left" className="w-72 border-sidebar-border bg-sidebar p-0">
          <SheetTitle className="sr-only">Menu de navegação</SheetTitle>
          <div className="flex h-16 items-center px-4">
            <Logo />
          </div>
          <nav className="space-y-6 px-3 py-2">
            {NAVIGATION.map((section) => {
              const items = section.items.filter((item) => can(item.permission));
              if (items.length === 0) return null;
              return (
                <div key={section.label} className="space-y-1">
                  <p className="px-3 pb-1 text-[11px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">
                    {section.label}
                  </p>
                  {items.map((item) => (
                    <Link
                      key={item.title}
                      to={item.to}
                      onClick={() => setMobileOpen(false)}
                      className={cn(
                        "flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium",
                        pathname === item.to
                          ? "bg-sidebar-primary text-sidebar-primary-foreground"
                          : "text-sidebar-foreground/80 hover:bg-sidebar-accent",
                      )}
                    >
                      <item.icon className="h-[18px] w-[18px]" />
                      {item.title}
                    </Link>
                  ))}
                </div>
              );
            })}
          </nav>
        </SheetContent>
      </Sheet>

      <div className="flex min-w-0 flex-1 flex-col">
        <AppHeader onOpenMobileMenu={() => setMobileOpen(true)} />
        <main className="flex-1 animate-[var(--animate-fade-in)] p-4 md:p-6">{children}</main>
      </div>
    </div>
  );
}
