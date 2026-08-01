import { createFileRoute } from "@tanstack/react-router";
import { LayoutDashboard, Sparkles } from "lucide-react";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useAuth } from "@/hooks/use-auth";

export const Route = createFileRoute("/_authenticated/dashboard")({
  head: () => ({
    meta: [
      { title: "Dashboard — Açaí Express Manager" },
      { name: "description", content: "Visão geral da operação do Açaí Express Manager." },
      { property: "og:title", content: "Dashboard — Açaí Express Manager" },
      { property: "og:description", content: "Visão geral da operação do Açaí Express Manager." },
    ],
  }),
  component: DashboardPage,
});

function DashboardPage() {
  const { profile, roles } = useAuth();

  return (
    <div className="mx-auto w-full max-w-7xl space-y-6 animate-[var(--animate-fade-up)]">
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold tracking-tight md:text-3xl">
            Olá, {profile?.full_name || "bem-vindo"} 👋
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Esta é a base do seu sistema. Os módulos serão adicionados nas próximas versões.
          </p>
        </div>
        <span className="rounded-full border border-gold/30 bg-gold/10 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-gold">
          {roles[0] ?? "sem permissão"}
        </span>
      </header>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {["Pedidos", "Faturamento", "Produtos", "Clientes"].map((label) => (
          <Card key={label} className="rounded-2xl border-border/60 bg-card/70 shadow-soft backdrop-blur">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">{label}</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-bold">—</p>
              <p className="mt-1 text-xs text-muted-foreground">Aguardando módulo</p>
            </CardContent>
          </Card>
        ))}
      </div>

      <Card className="rounded-3xl border-dashed border-border/70 bg-card/50 shadow-soft">
        <CardContent className="flex flex-col items-center gap-3 py-16 text-center">
          <span className="grid h-14 w-14 place-items-center rounded-2xl bg-primary/15 text-primary">
            <LayoutDashboard className="h-6 w-6" />
          </span>
          <h2 className="text-lg font-semibold">Dashboard pronto para crescer</h2>
          <p className="max-w-md text-sm text-muted-foreground">
            Estrutura, autenticação, permissões e layout já estão configurados. Basta pedir o
            próximo módulo para começarmos a preencher esta área.
          </p>
          <span className="inline-flex items-center gap-1.5 text-xs font-medium text-gold">
            <Sparkles className="h-3.5 w-3.5" />
            Versão 1 — estrutura base
          </span>
        </CardContent>
      </Card>
    </div>
  );
}
