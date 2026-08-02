import { useState, type ReactNode } from "react";
import { Link, useRouterState } from "@tanstack/react-router";
import { Clock } from "lucide-react";

import { Logo } from "@/components/brand/logo";
import { AppHeader } from "@/components/layout/app-header";
import { AppSidebar } from "@/components/layout/app-sidebar";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Sheet, SheetContent, SheetTitle } from "@/components/ui/sheet";
import { NAVIGATION } from "@/config/navigation";
import { useAuth } from "@/hooks/use-auth";
import { usePermissions } from "@/hooks/use-permissions";
import { authService } from "@/services/auth.service";
import { cn } from "@/lib/utils";

export function AppLayout({ children }: { children: ReactNode }) {
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const { can } = usePermissions();
  const { profile, roles, loading } = useAuth();
  const pathname = useRouterState({ select: (state) => state.location.pathname });

  const pendingApproval = !loading && profile !== null && (!profile.is_active || roles.length === 0);

  if (pendingApproval) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background p-6">
        <Card className="w-full max-w-md">
          <CardContent className="space-y-4 p-8 text-center">
            <Clock className="mx-auto h-10 w-10 text-primary" />
            <h1 className="text-xl font-semibold">Acesso aguardando aprovação</h1>
            <p className="text-sm text-muted-foreground">
              Sua conta foi criada, mas um administrador da empresa ainda precisa liberar o acesso e
              definir o seu papel. Você será notificado assim que isso acontecer.
            </p>
            <Button variant="outline" onClick={() => void authService.signOut()}>
              Sair
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

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
