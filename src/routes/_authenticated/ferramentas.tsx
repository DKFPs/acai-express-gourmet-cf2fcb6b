import { createFileRoute } from "@tanstack/react-router";
import { Wrench } from "lucide-react";

import { BackupPanel } from "@/components/tools/backup-panel";
import { GoalSimulator } from "@/components/tools/goal-simulator";
import { RemindersAgenda } from "@/components/tools/reminders-agenda";
import { SmartCalculator } from "@/components/tools/smart-calculator";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { usePermissions } from "@/hooks/use-permissions";
import { useCommercialOverview } from "@/hooks/use-production-analytics";
import { useRecipes } from "@/hooks/use-production";
import { PageHeader } from "@/components/common/page-header";

export const Route = createFileRoute("/_authenticated/ferramentas")({
  component: ToolsPage,
  head: () => ({
    meta: [
      { title: "Ferramentas — Açaí Express Manager" },
      {
        name: "description",
        content:
          "Calculadora inteligente de preço, simulador de metas, lembretes, agenda de tarefas e backup manual do banco de dados.",
      },
      { property: "og:title", content: "Ferramentas — Açaí Express Manager" },
      {
        property: "og:description",
        content: "Preço, metas, agenda e backup em um só lugar para a sua açaiteria.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
});

function ToolsPage() {
  const { can } = usePermissions();
  const recipes = useRecipes();
  const commercial = useCommercialOverview(30);

  return (
    <div className="space-y-6">
      <PageHeader
        icon={Wrench}
        title="Ferramentas"
        description="Calculadora de preço, metas, agenda da equipe e backup do banco de dados."
      />

      <Tabs defaultValue="calculadora" className="space-y-4">
        <TabsList className="flex-wrap">
          <TabsTrigger value="calculadora">Calculadora</TabsTrigger>
          <TabsTrigger value="metas">Metas</TabsTrigger>
          <TabsTrigger value="agenda">Lembretes e agenda</TabsTrigger>
          <TabsTrigger value="backup">Backup</TabsTrigger>
        </TabsList>

        <TabsContent value="calculadora">
          <SmartCalculator recipes={recipes.data ?? []} />
        </TabsContent>

        <TabsContent value="metas">
          <GoalSimulator overview={commercial.data} isLoading={commercial.isLoading} />
        </TabsContent>

        <TabsContent value="agenda">
          <RemindersAgenda />
        </TabsContent>

        <TabsContent value="backup">
          <BackupPanel canRestore={can("backup.run")} />
        </TabsContent>
      </Tabs>
    </div>
  );
}
