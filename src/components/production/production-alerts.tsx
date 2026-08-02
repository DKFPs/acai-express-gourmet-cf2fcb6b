import { AlertTriangle, PackageX, ShieldAlert, TrendingDown } from "lucide-react";

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { ProductionAlert } from "@/types/production-advanced";

const ICONS = {
  ingrediente: PackageX,
  embalagem: PackageX,
  validade: AlertTriangle,
  prejuizo: TrendingDown,
  margem: ShieldAlert,
} as const;

export function ProductionAlerts({ alerts }: { alerts: ProductionAlert[] }) {
  if (alerts.length === 0) {
    return (
      <Card className="rounded-2xl">
        <CardContent className="p-6 text-sm text-muted-foreground">
          Nenhum alerta no momento. Estoques, validades e margens estão saudáveis.
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="rounded-2xl">
      <CardHeader className="pb-2">
        <CardTitle className="text-base">Alertas inteligentes ({alerts.length})</CardTitle>
      </CardHeader>
      <CardContent className="grid gap-2 md:grid-cols-2">
        {alerts.map((alert) => {
          const Icon = ICONS[alert.kind];
          return (
            <Alert
              key={alert.id}
              variant={alert.severity === "alta" ? "destructive" : "default"}
              className="rounded-xl"
            >
              <Icon className="size-4" />
              <AlertTitle className="text-sm">{alert.title}</AlertTitle>
              <AlertDescription className="text-xs">{alert.description}</AlertDescription>
            </Alert>
          );
        })}
      </CardContent>
    </Card>
  );
}
