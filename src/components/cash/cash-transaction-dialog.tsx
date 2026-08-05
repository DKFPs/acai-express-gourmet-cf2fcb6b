import { useState } from "react";
import { ArrowDownCircle, ArrowUpCircle, HandCoins, Plus } from "lucide-react";

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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { parseNumber } from "@/lib/validations/stock";
import {
  CASH_TRANSACTION_TYPES,
  type CashTransactionInput,
  type CashTransactionType,
} from "@/types/cash";
import { FINANCE_PAYMENT_METHODS } from "@/types/finance";

interface CashTransactionDialogProps {
  disabled?: boolean;
  onSubmit: (input: CashTransactionInput) => void;
}

const ICONS: Record<CashTransactionType, typeof ArrowUpCircle> = {
  entrada: ArrowUpCircle,
  saida: ArrowDownCircle,
  sangria: HandCoins,
};

export function CashTransactionDialog({ disabled, onSubmit }: CashTransactionDialogProps) {
  const [open, setOpen] = useState(false);
  const [type, setType] = useState<CashTransactionType>("entrada");
  const [amount, setAmount] = useState("");
  const [description, setDescription] = useState("");
  const [method, setMethod] = useState("dinheiro");
  const [errors, setErrors] = useState<{ amount?: string; description?: string }>({});

  const Icon = ICONS[type];

  const submit = () => {
    const value = parseNumber(amount);
    const next: typeof errors = {};
    if (Number.isNaN(value) || value <= 0) next.amount = "Informe um valor maior que zero";
    if (description.trim().length < 3) next.description = "Informe uma descrição";
    setErrors(next);
    if (Object.keys(next).length > 0) return;

    onSubmit({ type, amount: value, description: description.trim(), payment_method: method });
    setAmount("");
    setDescription("");
    setErrors({});
    setOpen(false);
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <Button onClick={() => setOpen(true)} disabled={disabled}>
        <Plus className="mr-2 h-4 w-4" />
        Novo movimento
      </Button>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Icon className="h-5 w-5 text-primary" />
            Registrar movimento
          </DialogTitle>
          <DialogDescription>Entradas, saídas e sangrias do caixa aberto.</DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-2">
            <Label>Tipo</Label>
            <Select value={type} onValueChange={(value) => setType(value as CashTransactionType)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {CASH_TRANSACTION_TYPES.map((item) => (
                  <SelectItem key={item.value} value={item.value}>
                    {item.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="cash-tx-amount">Valor (R$)</Label>
            <Input
              id="cash-tx-amount"
              inputMode="decimal"
              placeholder="0,00"
              value={amount}
              onChange={(event) => setAmount(event.target.value)}
            />
            {errors.amount ? <p className="text-xs text-destructive">{errors.amount}</p> : null}
          </div>

          <div className="space-y-2">
            <Label htmlFor="cash-tx-desc">Descrição</Label>
            <Input
              id="cash-tx-desc"
              placeholder="Ex.: venda balcão, troco, sangria para banco"
              value={description}
              onChange={(event) => setDescription(event.target.value)}
            />
            {errors.description ? (
              <p className="text-xs text-destructive">{errors.description}</p>
            ) : null}
          </div>

          <div className="space-y-2">
            <Label>Forma de pagamento</Label>
            <Select value={method} onValueChange={setMethod}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {FINANCE_PAYMENT_METHODS.map((item) => (
                  <SelectItem key={item.value} value={item.value}>
                    {item.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)}>
            Cancelar
          </Button>
          <Button onClick={submit}>Registrar</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
