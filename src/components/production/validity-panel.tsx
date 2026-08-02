import { useState } from "react";
import { AlertTriangle, Trash2 } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { formatCurrency, formatNumber } from "@/lib/format";
import { useDiscardBatch } from "@/hooks/use-production-analytics";
import type { BatchValidity, BatchValidityStatus } from "@/types/production-advanced";
import { VALIDITY_LABELS } from "@/types/production-advanced";

const VARIANTS: Record<BatchValidityStatus, "default" | "secondary" | "destructive" | "outline"> = {
  vencido: "destructive",
  critico: "destructive",
  atencao: "default",
  ok: "secondary",
  descartado: "outline",
};

function formatDate(value: string | null) {
  if (!value) return "—";
  return new Date(`${value}T00:00:00`).toLocaleDateString("pt-BR");
}

export function ValidityPanel({
  batches,
  canManage,
}: {
  batches: BatchValidity[];
  canManage: boolean;
}) {
  const [target, setTarget] = useState<BatchValidity | null>(null);
  const [quantity, setQuantity] = useState("");
  const [reason, setReason] = useState("Descarte por vencimento");
  const discard = useDiscardBatch();

  const expired = batches.filter((batch) => batch.status === "vencido");
  const nearExpiry = batches.filter(
    (batch) => batch.status === "critico" || batch.status === "atencao",
  );

  return (
    <div className="space-y-4">
      <div className="grid gap-3 sm:grid-cols-3">
        <Card className="rounded-2xl">
          <CardContent className="p-4">
            <p className="text-xs text-muted-foreground">Lotes vencidos</p>
            <p className="text-2xl font-semibold text-destructive">{expired.length}</p>
          </CardContent>
        </Card>
        <Card className="rounded-2xl">
          <CardContent className="p-4">
            <p className="text-xs text-muted-foreground">Próximos do vencimento</p>
            <p className="text-2xl font-semibold">{nearExpiry.length}</p>
          </CardContent>
        </Card>
        <Card className="rounded-2xl">
          <CardContent className="p-4">
            <p className="text-xs text-muted-foreground">Unidades em risco</p>
            <p className="text-2xl font-semibold">
              {formatNumber(
                [...expired, ...nearExpiry].reduce((sum, batch) => sum + batch.remaining, 0),
              )}
            </p>
          </CardContent>
        </Card>
      </div>

      <Card className="rounded-2xl">
        <CardHeader className="flex-row items-center gap-2 pb-2">
          <AlertTriangle className="size-4 text-muted-foreground" />
          <CardTitle className="text-base">Controle de validade</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Lote</TableHead>
                <TableHead>Sabor</TableHead>
                <TableHead>Fabricação</TableHead>
                <TableHead>Validade</TableHead>
                <TableHead>Dias</TableHead>
                <TableHead>Restante</TableHead>
                <TableHead>Situação</TableHead>
                <TableHead className="w-28" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {batches.map((batch) => (
                <TableRow key={batch.id}>
                  <TableCell className="font-mono text-xs">{batch.batch_code}</TableCell>
                  <TableCell className="font-medium">{batch.recipe_name}</TableCell>
                  <TableCell>{new Date(batch.produced_at).toLocaleDateString("pt-BR")}</TableCell>
                  <TableCell>{formatDate(batch.expires_at)}</TableCell>
                  <TableCell>{batch.days_left ?? "—"}</TableCell>
                  <TableCell>
                    {formatNumber(batch.remaining)} un
                    {batch.discarded_quantity > 0 ? (
                      <span className="ml-1 text-xs text-muted-foreground">
                        (-{formatNumber(batch.discarded_quantity)})
                      </span>
                    ) : null}
                  </TableCell>
                  <TableCell>
                    <Badge variant={VARIANTS[batch.status]}>{VALIDITY_LABELS[batch.status]}</Badge>
                  </TableCell>
                  <TableCell className="text-right">
                    {canManage && batch.remaining > 0 ? (
                      <Button
                        size="sm"
                        variant="ghost"
                        className="text-destructive"
                        onClick={() => {
                          setTarget(batch);
                          setQuantity(String(batch.remaining));
                          setReason(
                            batch.status === "vencido"
                              ? "Descarte por vencimento"
                              : "Descarte manual",
                          );
                        }}
                      >
                        <Trash2 className="mr-1 size-4" /> Descartar
                      </Button>
                    ) : null}
                  </TableCell>
                </TableRow>
              ))}
              {batches.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={8} className="py-10 text-center text-muted-foreground">
                    Nenhum lote produzido.
                  </TableCell>
                </TableRow>
              ) : null}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Dialog open={Boolean(target)} onOpenChange={(open) => !open && setTarget(null)}>
        <DialogContent className="rounded-2xl">
          <DialogHeader>
            <DialogTitle>Descartar lote {target?.batch_code}</DialogTitle>
            <DialogDescription>
              A quantidade descartada sai do estoque de produtos prontos e é registrada como perda.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-3">
            <div className="grid gap-1.5">
              <Label htmlFor="discard-qty">Quantidade</Label>
              <Input
                id="discard-qty"
                inputMode="decimal"
                value={quantity}
                onChange={(event) => setQuantity(event.target.value)}
              />
              <p className="text-xs text-muted-foreground">
                Perda estimada: {formatCurrency((Number(quantity) || 0) * (target?.unit_cost ?? 0))}
              </p>
            </div>
            <div className="grid gap-1.5">
              <Label htmlFor="discard-reason">Motivo</Label>
              <Input
                id="discard-reason"
                value={reason}
                onChange={(event) => setReason(event.target.value)}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setTarget(null)}>
              Cancelar
            </Button>
            <Button
              variant="destructive"
              disabled={discard.isPending}
              onClick={() => {
                if (!target) return;
                discard.mutate(
                  {
                    batchId: target.id,
                    quantity: Number(quantity) || target.remaining,
                    reason: reason || "Descarte",
                  },
                  { onSuccess: () => setTarget(null) },
                );
              }}
            >
              Confirmar descarte
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
