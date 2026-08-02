import { useEffect, useState } from "react";
import QRCode from "qrcode";
import { Printer, QrCode } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { BatchLabelRow } from "@/types/production-advanced";

function formatDate(value: string) {
  return new Date(`${value}T00:00:00`).toLocaleDateString("pt-BR");
}

export function labelUrl(label: BatchLabelRow) {
  const origin = typeof window === "undefined" ? "" : window.location.origin;
  return `${origin}/lote/${label.batch_id}`;
}

function LabelCard({ label, qr }: { label: BatchLabelRow; qr: string | undefined }) {
  return (
    <div className="label flex gap-3 rounded-xl border border-border/60 bg-card p-3">
      <div className="min-w-0 flex-1 space-y-0.5">
        <p className="truncate text-sm font-semibold">{label.flavor_name}</p>
        <p className="text-xs text-muted-foreground">{Number(label.volume_ml)} ml</p>
        <p className="font-mono text-xs">Lote {label.batch_code}</p>
        <p className="text-xs">Fab.: {formatDate(label.manufactured_at)}</p>
        <p className="text-xs">Val.: {formatDate(label.expires_at)}</p>
      </div>
      {qr ? <img src={qr} alt={`QR Code do lote ${label.batch_code}`} className="size-20" /> : null}
    </div>
  );
}

export function BatchLabelsPanel({ labels }: { labels: BatchLabelRow[] }) {
  const [codes, setCodes] = useState<Record<string, string>>({});

  useEffect(() => {
    let active = true;
    void Promise.all(
      labels.map(async (label) => [
        label.id,
        await QRCode.toDataURL(labelUrl(label), { margin: 1, width: 240 }),
      ]),
    ).then((entries) => {
      if (active) setCodes(Object.fromEntries(entries as [string, string][]));
    });
    return () => {
      active = false;
    };
  }, [labels]);

  const print = () => {
    const win = window.open("", "_blank", "width=900,height=700");
    if (!win) return;
    const body = labels
      .map(
        (label) => `<div class="label">
          <div>
            <strong>${label.flavor_name}</strong><br/>
            <span>${Number(label.volume_ml)} ml</span><br/>
            <span>Lote ${label.batch_code}</span><br/>
            <span>Fab.: ${formatDate(label.manufactured_at)}</span><br/>
            <span>Val.: ${formatDate(label.expires_at)}</span>
          </div>
          ${codes[label.id] ? `<img src="${codes[label.id]}" alt="Código QR de rastreio do lote ${label.batch_code} — ${label.flavor_name}" />` : ""}
        </div>`,
      )
      .join("");
    win.document.write(`<!doctype html><html lang="pt-BR"><head><meta charset="utf-8" />
<title>Etiquetas de lote</title><style>
body { font-family: system-ui, sans-serif; margin: 12mm; }
.grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 6mm; }
.label { display: flex; justify-content: space-between; gap: 8px; border: 1px solid #999; border-radius: 6px; padding: 8px; font-size: 11px; }
.label img { width: 64px; height: 64px; }
strong { font-size: 13px; }
</style></head><body><div class="grid">${body}</div></body></html>`);
    win.document.close();
    win.focus();
    setTimeout(() => win.print(), 400);
  };

  return (
    <Card className="rounded-2xl">
      <CardHeader className="flex-row items-center justify-between gap-2 pb-2">
        <div className="flex items-center gap-2">
          <QrCode className="size-4 text-muted-foreground" />
          <CardTitle className="text-base">Etiquetas geradas</CardTitle>
        </div>
        <Button size="sm" variant="secondary" onClick={print} disabled={labels.length === 0}>
          <Printer className="mr-2 size-4" /> Imprimir etiquetas
        </Button>
      </CardHeader>
      <CardContent className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
        {labels.map((label) => (
          <LabelCard key={label.id} label={label} qr={codes[label.id]} />
        ))}
        {labels.length === 0 ? (
          <p className="py-6 text-sm text-muted-foreground">
            Nenhuma etiqueta ainda — elas são geradas automaticamente a cada lote produzido.
          </p>
        ) : null}
      </CardContent>
    </Card>
  );
}
