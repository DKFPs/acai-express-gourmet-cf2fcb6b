import { useState } from "react";
import { LockKeyhole, Wallet } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
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
import { formatCurrency } from "@/lib/format";
import { parseNumber } from "@/lib/validations/stock";
import type { CashRegister } from "@/types/finance";

interface CashRegisterPanelProps {
  registers: CashRegister[];
  expected: number;
  canManage: boolean;
  onOpen: (amount: number, notes: string | null) => void;
  onClose: (id: string, amount: number, expected: number, notes: string | null) => void;
}

function formatMoment(value: string | null) {
  if (!value) return "—";
  return new Date(value).toLocaleString("pt-BR", { dateStyle: "short", timeStyle: "short" });
}

export function CashRegisterPanel({
  registers,
  expected,
  canManage,
  onOpen,
  onClose,
}: CashRegisterPanelProps) {
  const [amount, setAmount] = useState("");
  const [notes, setNotes] = useState("");
  const [error, setError] = useState("");

  const current = registers.find((register) => register.status === "aberto") ?? null;

  const submit = () => {
    const value = parseNumber(amount);
    if (Number.isNaN(value) || value < 0) {
      setError("Informe um valor válido");
      return;
    }
    setError("");
    if (current) onClose(current.id, value, expected, notes || null);
    else onOpen(value, notes || null);
    setAmount("");
    setNotes("");
  };

  return (
    <div className="grid gap-4 lg:grid-cols-[360px_1fr]">
      <Card className="rounded-2xl">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Wallet className="h-5 w-5 text-primary" />
            {current ? "Caixa aberto" : "Abrir caixa"}
          </CardTitle>
          <CardDescription>
            {current
              ? `Aberto em ${formatMoment(current.opened_at)} com ${formatCurrency(current.opening_amount)}`
              : "Registre o valor inicial em dinheiro no caixa."}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          {current ? (
            <div className="rounded-xl bg-muted/40 p-3 text-sm">
              <p className="flex justify-between">
                <span className="text-muted-foreground">Movimento pago no período</span>
                <span className="font-semibold">{formatCurrency(expected)}</span>
              </p>
              <p className="flex justify-between">
                <span className="text-muted-foreground">Esperado no fechamento</span>
                <span className="font-semibold">
                  {formatCurrency(Number(current.opening_amount) + expected)}
                </span>
              </p>
            </div>
          ) : null}

          <div className="space-y-2">
            <Label htmlFor="cash-amount">
              {current ? "Valor contado no fechamento (R$)" : "Valor de abertura (R$)"}
            </Label>
            <Input
              id="cash-amount"
              inputMode="decimal"
              placeholder="0,00"
              value={amount}
              onChange={(event) => setAmount(event.target.value)}
            />
            {error ? <p className="text-xs text-destructive">{error}</p> : null}
          </div>

          <div className="space-y-2">
            <Label htmlFor="cash-notes">Observações</Label>
            <Input
              id="cash-notes"
              placeholder="Opcional"
              value={notes}
              onChange={(event) => setNotes(event.target.value)}
            />
          </div>

          <Button className="w-full" onClick={submit} disabled={!canManage}>
            <LockKeyhole className="mr-2 h-4 w-4" />
            {current ? "Fechar caixa" : "Abrir caixa"}
          </Button>
        </CardContent>
      </Card>

      <Card className="rounded-2xl">
        <CardHeader>
          <CardTitle>Histórico de caixa</CardTitle>
          <CardDescription>Últimas aberturas e fechamentos</CardDescription>
        </CardHeader>
        <CardContent className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Abertura</TableHead>
                <TableHead>Fechamento</TableHead>
                <TableHead className="text-right">Inicial</TableHead>
                <TableHead className="text-right">Final</TableHead>
                <TableHead className="text-right">Diferença</TableHead>
                <TableHead>Situação</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {registers.map((register) => (
                <TableRow key={register.id}>
                  <TableCell className="whitespace-nowrap">{formatMoment(register.opened_at)}</TableCell>
                  <TableCell className="whitespace-nowrap">{formatMoment(register.closed_at)}</TableCell>
                  <TableCell className="text-right">{formatCurrency(register.opening_amount)}</TableCell>
                  <TableCell className="text-right">
                    {register.closing_amount === null ? "—" : formatCurrency(register.closing_amount)}
                  </TableCell>
                  <TableCell
                    className={`text-right ${
                      Number(register.difference ?? 0) < 0 ? "text-destructive" : ""
                    }`}
                  >
                    {register.difference === null ? "—" : formatCurrency(register.difference)}
                  </TableCell>
                  <TableCell>
                    <Badge variant={register.status === "aberto" ? "secondary" : "outline"}>
                      {register.status === "aberto" ? "Aberto" : "Fechado"}
                    </Badge>
                  </TableCell>
                </TableRow>
              ))}
              {registers.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="py-8 text-center text-sm text-muted-foreground">
                    Nenhum caixa registrado.
                  </TableCell>
                </TableRow>
              ) : null}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
