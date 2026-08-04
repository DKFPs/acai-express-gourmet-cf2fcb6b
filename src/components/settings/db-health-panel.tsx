import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { CheckCircle2, Loader2, RefreshCw, ShieldAlert } from "lucide-react";
import { toast } from "sonner";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { healthService, type FunctionCheck } from "@/services/health.service";

const STATUS_LABEL: Record<string, string> = {
  ok: "OK",
  ausente: "Função ausente",
  permissao_faltando: "Permissão faltando",
  permissao_excessiva: "Permissão excessiva",
  modo_seguranca_divergente: "Modo de segurança divergente",
  search_path_inseguro: "search_path inseguro",
};

export function DbHealthPanel() {
  const queryClient = useQueryClient();
  const [running, setRunning] = useState(false);

  const { data: checks, isLoading } = useQuery({
    queryKey: ["db-health", "functions"],
    queryFn: () => healthService.checkFunctions(),
  });

  const { data: history } = useQuery({
    queryKey: ["db-health", "history"],
    queryFn: () => healthService.listChecks(5),
  });

  const failures = (checks ?? []).filter((row: FunctionCheck) => row.status !== "ok");
  const total = checks?.length ?? 0;

  const runNow = async () => {
    setRunning(true);
    try {
      await queryClient.invalidateQueries({ queryKey: ["db-health"] });
      const result = await healthService.checkFunctions();
      const problems = result.filter((row) => row.status !== "ok");
      if (problems.length === 0) toast.success(`Tudo certo: ${result.length} funções verificadas`);
      else toast.error(`${problems.length} divergência(s) encontrada(s)`);
    } catch (error) {
      toast.error((error as Error).message);
    } finally {
      setRunning(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          {failures.length === 0 ? (
            <CheckCircle2 className="h-5 w-5 text-emerald-500" />
          ) : (
            <ShieldAlert className="h-5 w-5 text-destructive" />
          )}
          Saúde do banco
        </CardTitle>
        <CardDescription>
          Verificação automática das funções do sistema: existência, modo de segurança e permissões de
          execução. Também roda a cada deploy e diariamente.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex flex-wrap items-center gap-3">
          <Button onClick={() => void runNow()} disabled={running || isLoading}>
            {running ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <RefreshCw className="mr-2 h-4 w-4" />
            )}
            Verificar agora
          </Button>
          {!isLoading && (
            <span className="text-sm text-muted-foreground">
              {total} funções verificadas · {failures.length} divergência(s)
            </span>
          )}
        </div>

        {isLoading && <p className="text-sm text-muted-foreground">Verificando funções...</p>}

        {!isLoading && failures.length === 0 && (
          <p className="text-sm text-muted-foreground">
            Todas as funções existem com as permissões esperadas.
          </p>
        )}

        {failures.length > 0 && (
          <div className="space-y-2">
            {failures.map((row) => (
              <div
                key={`${row.schema_name}.${row.function_name}.${row.arguments}`}
                className="rounded-lg border border-border px-3 py-2 text-sm"
              >
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <span className="font-medium">
                    {row.schema_name}.{row.function_name}
                  </span>
                  <Badge variant="destructive">{STATUS_LABEL[row.status] ?? row.status}</Badge>
                </div>
                <p className="mt-1 text-muted-foreground">{row.detail}</p>
              </div>
            ))}
          </div>
        )}

        {history && history.length > 0 && (
          <div className="space-y-1 pt-2">
            <p className="text-sm font-medium">Últimas verificações automáticas</p>
            {history.map((item) => (
              <div
                key={item.id}
                className="flex flex-wrap items-center justify-between gap-2 rounded-md border border-border px-3 py-1.5 text-xs"
              >
                <span className="text-muted-foreground">
                  {new Date(item.created_at).toLocaleString("pt-BR")} · {item.source}
                </span>
                <span className={item.passed ? "text-emerald-500" : "text-destructive"}>
                  {item.passed ? "OK" : `${item.failures?.length ?? 0} falha(s)`}
                </span>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
