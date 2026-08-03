import { useEffect, useMemo, useState } from "react";

import { Button } from "@/components/ui/button";
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
import { Separator } from "@/components/ui/separator";
import { formatCurrency, formatNumber } from "@/lib/format";
import type { Recipe } from "@/types/production";

interface QuickProduceDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  recipe: Recipe | null;
  loading?: boolean;
  onConfirm: (batches: number) => void;
}

export function QuickProduceDialog({
  open,
  onOpenChange,
  recipe,
  loading,
  onConfirm,
}: QuickProduceDialogProps) {
  const [batches, setBatches] = useState("1");
  const [step, setStep] = useState<"quantidade" | "resumo">("quantidade");

  useEffect(() => {
    if (open) {
      setBatches("1");
      setStep("quantidade");
    }
  }, [open, recipe?.id]);

  const quantity = Number(batches.replace(",", ".")) || 0;

  const summary = useMemo(() => {
    if (!recipe) return null;
    const produced = (recipe.yield_quantity ?? 0) * quantity;
    const totalCost = (recipe.total_cost ?? 0) * quantity;
    const profit = ((recipe.sale_price ?? 0) - (recipe.cost_per_unit ?? 0)) * produced;
    return {
      produced,
      totalCost,
      profit,
      items: recipe.items.map((item) => ({
        id: item.id,
        name: item.ingredient?.name ?? "Ingrediente",
        quantity: Number(item.quantity) * quantity,
        unit: item.unit,
        available: Number(item.ingredient ? item.ingredient.purchase_price : 0),
      })),
    };
  }, [recipe, quantity]);

  if (!recipe) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Produzir {recipe.name}</DialogTitle>
          <DialogDescription>
            {step === "quantidade"
              ? "Quantas receitas deseja produzir?"
              : "Confira o resumo antes de confirmar a produção."}
          </DialogDescription>
        </DialogHeader>

        {step === "quantidade" ? (
          <div className="space-y-2">
            <Label htmlFor="quick-batches">Quantidade de receitas</Label>
            <Input
              id="quick-batches"
              inputMode="decimal"
              autoFocus
              value={batches}
              onChange={(event) => setBatches(event.target.value)}
            />
            <p className="text-sm text-muted-foreground">
              Rendimento: {formatNumber((recipe.yield_quantity ?? 0) * quantity)} garrafinhas
            </p>
          </div>
        ) : (
          summary && (
            <div className="space-y-3 text-sm">
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">Quantidade produzida</span>
                <span className="font-medium">{formatNumber(summary.produced)} un</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">Custo total</span>
                <span className="font-medium">{formatCurrency(summary.totalCost)}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">Lucro estimado</span>
                <span className="font-medium text-primary">{formatCurrency(summary.profit)}</span>
              </div>
              <Separator />
              <p className="font-medium">Ingredientes consumidos</p>
              <ul className="max-h-48 space-y-1 overflow-auto">
                {summary.items.map((item) => (
                  <li key={item.id} className="flex items-center justify-between">
                    <span className="text-muted-foreground">{item.name}</span>
                    <span>
                      {formatNumber(item.quantity)} {item.unit}
                    </span>
                  </li>
                ))}
              </ul>
              <p className="text-xs text-muted-foreground">
                As embalagens cadastradas também serão baixadas automaticamente.
              </p>
            </div>
          )
        )}

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={loading}>
            Cancelar
          </Button>
          {step === "quantidade" ? (
            <Button onClick={() => setStep("resumo")} disabled={quantity <= 0}>
              Continuar
            </Button>
          ) : (
            <Button onClick={() => onConfirm(quantity)} disabled={loading || quantity <= 0}>
              {loading ? "Produzindo..." : "Confirmar produção"}
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
