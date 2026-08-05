import { useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { ScrollText } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { useAuditLogs } from "@/hooks/use-audit";
import { usePermissions } from "@/hooks/use-permissions";
import { AUDIT_ACTION_LABELS, AUDIT_TABLE_LABELS } from "@/types/saas";
import { PageHeader } from "@/components/common/page-header";

export const Route = createFileRoute("/_authenticated/auditoria")({
  component: AuditoriaPage,
  head: () => ({
    meta: [
      { title: "Auditoria e logs do sistema | Gestão SaaS" },
      {
        name: "description",
        content:
          "Acompanhe todas as criações, alterações e exclusões feitas no sistema, com autor, data, tabela e registro afetado.",
      },
      { property: "og:title", content: "Auditoria e logs do sistema | Gestão SaaS" },
      {
        property: "og:description",
        content: "Histórico completo de ações dos usuários para conformidade e segurança.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
});

function AuditoriaPage() {
  const { can } = usePermissions();
  const [table, setTable] = useState("todos");
  const [action, setAction] = useState("todos");
  const [search, setSearch] = useState("");

  const { data, isLoading } = useAuditLogs({ table, action, search });

  if (!can("audit.view")) {
    return (
      <div className="p-6">
        <Card>
          <CardContent className="p-8 text-center text-muted-foreground">
            Apenas administradores podem visualizar a auditoria.
          </CardContent>
        </Card>
      </div>
    );
  }

  const logs = data ?? [];

  return (
    <div className="space-y-6 p-4 md:p-6">
      <PageHeader
        icon={ScrollText}
        title="Auditoria"
        description="Registro imutável de todas as ações realizadas na empresa."
      />

      <Card>
        <CardHeader className="gap-4 md:flex-row md:items-end md:justify-between">
          <CardTitle className="text-base">Últimos eventos</CardTitle>
          <div className="grid gap-3 sm:grid-cols-3">
            <div className="space-y-1.5">
              <Label className="text-xs">Módulo</Label>
              <Select value={table} onValueChange={setTable}>
                <SelectTrigger className="w-full sm:w-44">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="todos">Todos</SelectItem>
                  {Object.entries(AUDIT_TABLE_LABELS).map(([key, label]) => (
                    <SelectItem key={key} value={key}>
                      {label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Ação</Label>
              <Select value={action} onValueChange={setAction}>
                <SelectTrigger className="w-full sm:w-36">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="todos">Todas</SelectItem>
                  {Object.entries(AUDIT_ACTION_LABELS).map(([key, label]) => (
                    <SelectItem key={key} value={key}>
                      {label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Usuário</Label>
              <Input
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Nome"
              />
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="space-y-2">
              {Array.from({ length: 8 }).map((_, index) => (
                <Skeleton key={index} className="h-10 w-full" />
              ))}
            </div>
          ) : logs.length === 0 ? (
            <p className="py-10 text-center text-sm text-muted-foreground">
              Nenhum registro encontrado.
            </p>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Data</TableHead>
                    <TableHead>Usuário</TableHead>
                    <TableHead>Módulo</TableHead>
                    <TableHead>Ação</TableHead>
                    <TableHead>Registro</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {logs.map((log) => (
                    <TableRow key={log.id}>
                      <TableCell className="whitespace-nowrap text-sm">
                        {new Date(log.created_at).toLocaleString("pt-BR")}
                      </TableCell>
                      <TableCell className="text-sm">{log.user_name ?? "Sistema"}</TableCell>
                      <TableCell className="text-sm">
                        {AUDIT_TABLE_LABELS[log.table_name] ?? log.table_name}
                      </TableCell>
                      <TableCell>
                        <Badge
                          variant={
                            log.action === "delete"
                              ? "destructive"
                              : log.action === "insert"
                                ? "default"
                                : "secondary"
                          }
                        >
                          {AUDIT_ACTION_LABELS[log.action] ?? log.action}
                        </Badge>
                      </TableCell>
                      <TableCell className="max-w-40 truncate font-mono text-xs text-muted-foreground">
                        {log.record_id ?? "—"}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
