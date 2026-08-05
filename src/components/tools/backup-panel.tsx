import { useRef, useState } from "react";
import { Download, DatabaseBackup, FileSpreadsheet, Upload } from "lucide-react";
import { toast } from "sonner";

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useAuth } from "@/hooks/use-auth";
import { collectBackup, downloadBackupExcel, downloadBackupJson } from "@/lib/backup";
import type { BackupData } from "@/lib/backup";
import {
  backupPreview,
  parseBackupFile,
  restoreBackup,
  type RestoreResult,
} from "@/lib/backup-restore";

export function BackupPanel({ canRestore }: { canRestore: boolean }) {
  const { profile } = useAuth();
  const inputRef = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const [pending, setPending] = useState<{ name: string; data: BackupData } | null>(null);
  const [results, setResults] = useState<RestoreResult[]>([]);

  const companyName = "acai-express";

  async function handleExport(kind: "json" | "excel") {
    try {
      setBusy(kind === "json" ? "Exportando JSON…" : "Exportando Excel…");
      const data = await collectBackup((table) => setBusy(`Lendo ${table}…`));
      if (kind === "json") downloadBackupJson(data, companyName);
      else await downloadBackupExcel(data, companyName);
      toast.success("Backup exportado com sucesso.");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Falha ao exportar o backup.");
    } finally {
      setBusy(null);
    }
  }

  async function handleFile(file: File) {
    try {
      const data = parseBackupFile(await file.text());
      setPending({ name: file.name, data });
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Arquivo de backup inválido.");
    } finally {
      if (inputRef.current) inputRef.current.value = "";
    }
  }

  async function confirmRestore() {
    if (!pending || !profile?.company_id) return;
    const data = pending.data;
    setPending(null);
    try {
      setBusy("Restaurando…");
      const output = await restoreBackup(data, profile.company_id, (table) =>
        setBusy(`Restaurando ${table}…`),
      );
      setResults(output);
      const failed = output.filter((item) => item.error);
      if (failed.length > 0) toast.warning(`Restauração concluída com ${failed.length} aviso(s).`);
      else toast.success("Backup restaurado no banco de dados.");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Falha ao restaurar o backup.");
    } finally {
      setBusy(null);
    }
  }

  return (
    <Card className="rounded-2xl">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-base">
          <DatabaseBackup className="h-4 w-4 text-primary" />
          Backup manual
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex flex-wrap gap-2">
          <Button onClick={() => void handleExport("json")} disabled={busy !== null}>
            <Download className="mr-2 h-4 w-4" /> Exportar BD (JSON)
          </Button>
          <Button
            variant="outline"
            onClick={() => void handleExport("excel")}
            disabled={busy !== null}
          >
            <FileSpreadsheet className="mr-2 h-4 w-4" /> Exportar Excel
          </Button>
          <Button
            variant="secondary"
            onClick={() => inputRef.current?.click()}
            disabled={busy !== null || !canRestore}
          >
            <Upload className="mr-2 h-4 w-4" /> Restaurar Backup
          </Button>
          <input
            ref={inputRef}
            type="file"
            accept="application/json"
            className="hidden"
            onChange={(event) => {
              const file = event.target.files?.[0];
              if (file) void handleFile(file);
            }}
          />
        </div>

        {!canRestore ? (
          <p className="text-xs text-muted-foreground">
            Somente administradores podem restaurar um backup no banco de dados.
          </p>
        ) : null}

        {busy ? <p className="text-xs text-muted-foreground">{busy}</p> : null}

        {results.length > 0 ? (
          <div className="space-y-2">
            <p className="text-sm font-medium">Resultado da restauração</p>
            <ul className="space-y-1 text-xs">
              {results.map((item) => (
                <li key={item.table} className="flex items-center justify-between gap-2">
                  <span className="text-muted-foreground">{item.table}</span>
                  {item.error ? (
                    <Badge variant="destructive">{item.error}</Badge>
                  ) : (
                    <Badge variant="secondary">{item.inserted} registro(s)</Badge>
                  )}
                </li>
              ))}
            </ul>
          </div>
        ) : null}

        <AlertDialog open={pending !== null} onOpenChange={(open) => !open && setPending(null)}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Restaurar backup no banco?</AlertDialogTitle>
              <AlertDialogDescription asChild>
                <div className="space-y-2 text-sm">
                  <p>
                    O arquivo <strong>{pending?.name}</strong> será gravado no banco de dados da sua
                    empresa. Registros com o mesmo identificador serão sobrescritos. Esta ação não
                    pode ser desfeita.
                  </p>
                  <ul className="max-h-40 space-y-1 overflow-y-auto text-xs text-muted-foreground">
                    {pending
                      ? backupPreview(pending.data).map((item) => (
                          <li key={item.table}>
                            {item.table}: {item.count} registro(s)
                          </li>
                        ))
                      : null}
                  </ul>
                </div>
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancelar</AlertDialogCancel>
              <AlertDialogAction onClick={() => void confirmRestore()}>
                Restaurar agora
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </CardContent>
    </Card>
  );
}
