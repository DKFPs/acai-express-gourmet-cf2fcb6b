import { useEffect, useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import QRCode from "qrcode";
import { ArrowLeft } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { useBatchDetail } from "@/hooks/use-production-analytics";
import { formatCurrency, formatNumber } from "@/lib/format";
import { validityStatus, VALIDITY_LABELS } from "@/types/production-advanced";

export const Route = createFileRoute("/_authenticated/lote/$batchId")({
  head: () => ({
    meta: [
      { title: "Rastreio do lote — Açaí Express Manager" },
      {
        name: "description",
        content: "Consulte ingredientes, custos, responsável e validade de um lote de produção.",
      },
      { property: "og:title", content: "Rastreio do lote — Açaí Express Manager" },
      {
        property: "og:description",
        content: "Dados completos do lote lidos pelo QR Code da etiqueta.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: BatchDetailPage,
});

interface BatchItem {
  id: string;
  item_name: string;
  quantity: number;
  unit: string;
  unit_cost: number;
  total_cost: number | null;
}

function BatchDetailPage() {
  const { batchId } = Route.useParams();
  const { data, isLoading } = useBatchDetail(batchId);
  const [qr, setQr] = useState("");

  useEffect(() => {
    void QRCode.toDataURL(`${window.location.origin}/lote/${batchId}`, {
      margin: 1,
      width: 220,
    }).then(setQr);
  }, [batchId]);

  if (isLoading) return <p className="py-16 text-center text-muted-foreground">Carregando lote…</p>;
  if (!data) {
    return (
      <div className="space-y-4 py-16 text-center">
        <p className="text-muted-foreground">Lote não encontrado.</p>
        <Button asChild variant="secondary">
          <Link to="/producao">Voltar para Produção</Link>
        </Button>
      </div>
    );
  }

  const batch = data as unknown as {
    id: string;
    batch_code: string | null;
    produced_at: string;
    expires_at: string | null;
    produced_quantity: number;
    discarded_quantity: number;
    total_cost: number;
    unit_cost: number;
    status: string;
    notes: string | null;
    responsible_name: string | null;
    recipe: { name: string; bottle_volume_ml: number; sale_price: number } | null;
    items: BatchItem[];
  };

  const remaining = Number(batch.produced_quantity) - Number(batch.discarded_quantity);
  const { status, daysLeft } = validityStatus(
    batch.expires_at,
    remaining,
    batch.status === "descartado",
  );

  const info = [
    { label: "Sabor", value: batch.recipe?.name ?? "—" },
    { label: "Volume", value: `${Number(batch.recipe?.bottle_volume_ml ?? 0)} ml` },
    { label: "Lote", value: batch.batch_code ?? "—" },
    { label: "Fabricação", value: new Date(batch.produced_at).toLocaleDateString("pt-BR") },
    {
      label: "Validade",
      value: batch.expires_at
        ? new Date(`${batch.expires_at}T00:00:00`).toLocaleDateString("pt-BR")
        : "—",
    },
    { label: "Dias restantes", value: daysLeft === null ? "—" : String(daysLeft) },
    { label: "Produzido", value: `${formatNumber(batch.produced_quantity)} un` },
    { label: "Disponível do lote", value: `${formatNumber(remaining)} un` },
    { label: "Responsável", value: batch.responsible_name ?? "—" },
    { label: "Custo total", value: formatCurrency(Number(batch.total_cost)) },
    { label: "Custo unitário", value: formatCurrency(Number(batch.unit_cost)) },
  ];

  return (
    <div className="space-y-6">
      <header className="flex flex-wrap items-start justify-between gap-3">
        <div className="space-y-1">
          <Button asChild variant="ghost" size="sm" className="-ml-2">
            <Link to="/producao">
              <ArrowLeft className="mr-2 size-4" /> Produção
            </Link>
          </Button>
          <h1 className="text-2xl font-semibold tracking-tight">
            Lote {batch.batch_code ?? batch.id.slice(0, 8)}
          </h1>
          <Badge variant={status === "vencido" ? "destructive" : "secondary"}>
            {VALIDITY_LABELS[status]}
          </Badge>
        </div>
        {qr ? (
          <img src={qr} alt="QR Code do lote" className="size-28 rounded-xl bg-white p-1" />
        ) : null}
      </header>

      <Card className="rounded-2xl">
        <CardHeader className="pb-2">
          <CardTitle className="text-base">Dados do lote</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-3 sm:grid-cols-3 xl:grid-cols-4">
          {info.map((item) => (
            <div key={item.label} className="rounded-xl border border-border/60 p-3">
              <p className="text-xs text-muted-foreground">{item.label}</p>
              <p className="font-medium">{item.value}</p>
            </div>
          ))}
        </CardContent>
      </Card>

      <Card className="rounded-2xl">
        <CardHeader className="pb-2">
          <CardTitle className="text-base">Ingredientes e embalagens utilizados</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Item</TableHead>
                <TableHead>Quantidade</TableHead>
                <TableHead>Custo unitário</TableHead>
                <TableHead className="text-right">Total</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {batch.items.map((item) => (
                <TableRow key={item.id}>
                  <TableCell className="font-medium">{item.item_name}</TableCell>
                  <TableCell>
                    {formatNumber(item.quantity)} {item.unit}
                  </TableCell>
                  <TableCell>{formatCurrency(Number(item.unit_cost))}</TableCell>
                  <TableCell className="text-right">
                    {formatCurrency(Number(item.total_cost ?? 0))}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {batch.notes ? (
        <Card className="rounded-2xl">
          <CardContent className="p-4 text-sm text-muted-foreground">{batch.notes}</CardContent>
        </Card>
      ) : null}
    </div>
  );
}
