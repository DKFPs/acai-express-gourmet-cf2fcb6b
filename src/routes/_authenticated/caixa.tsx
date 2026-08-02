import { useEffect, useMemo, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import {
  ArrowDownCircle,
  ArrowUpCircle,
  FileSpreadsheet,
  FileText,
  HandCoins,
  LockKeyhole,
  Trash2,
  Wallet,
} from "lucide-react";

import { CashHistory } from "@/components/cash/cash-history";
import { CashTransactionDialog } from "@/components/cash/cash-transaction-dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useCashMutations, useCashSessions, useCashTransactions } from "@/hooks/use-cash";
import { usePermissions } from "@/hooks/use-permissions";
import { exportCashExcel, exportCashPdf } from "@/lib/cash-report";
import { formatCurrency } from "@/lib/format";
import { parseNumber } from "@/lib/validations/stock";
import { CASH_TYPE_LABEL, expectedBalance, type CashSession } from "@/types/cash";

export const Route = createFileRoute("/_authenticated/caixa")({
  head: () => ({
    meta: [
      { title: "Caixa — Açaí Express Manager" },
      {
        name: "description",
        content:
          "Abertura e fechamento de caixa com entradas, saídas, sangrias, saldo esperado, diferença e relatórios.",
      },
      { property: "og:title", content: "Caixa — Açaí Express Manager" },
      {
        property: "og:description",
        content: "Controle de caixa com histórico, fechamento automático e relatórios em PDF e Excel.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: CaixaPage,
});

function moment(value: string | null) {
  if (!value) return "—";
  return new Date(value).toLocaleString("pt-BR", { dateStyle: "short", timeStyle: "short" });
}

function KpiCard({
  label,
  value,
  icon: Icon,
  tone,
}: {
  label: string;
  value: string;
  icon: typeof Wallet;
  tone?: "positive" | "negative";
}) {
  return (
    <Card className="rounded-2xl">
      <CardContent className="flex items-center gap-3 p-4">
        <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10 text-primary">
          <Icon className="h-5 w-5" />
        </span>
        <div>
          <p className="text-xs text-muted-foreground">{label}</p>
          <p
            className={`text-lg font-semibold ${
              tone === "negative" ? "text-destructive" : tone === "positive" ? "text-primary" : ""
            }`}
          >
            {value}
          </p>
        </div>
      </CardContent>
    </Card>
  );
}

function CaixaPage() {
  const { can, isAdmin } = usePermissions();
  const canManage = can("cash.manage");

  const sessions = useCashSessions();
  const mutations = useCashMutations();

  const current = useMemo(
    () => (sessions.data ?? []).find((session) => session.status === "aberto") ?? null,
    [sessions.data],
  );
  const transactions = useCashTransactions(current?.id ?? null);

  const [amount, setAmount] = useState("");
  const [notes, setNotes] = useState("");
  const [error, setError] = useState("");

  // Fechamento automático de caixas deixados abertos de dias anteriores.
  const autoClose = mutations.autoClose.mutate;
  useEffect(() => {
    if (sessions.isSuccess) autoClose();
  }, [sessions.isSuccess, autoClose]);

  const expected = current ? expectedBalance(current) : 0;

  const submit = () => {
    const value = parseNumber(amount);
    if (Number.isNaN(value) || value < 0) {
      setError("Informe um valor válido");
      return;
    }
    setError("");
    if (current) mutations.close.mutate({ session: current, amount: value, notes: notes || null });
    else mutations.open.mutate({ amount: value, notes: notes || null });
    setAmount("");
    setNotes("");
  };

  const report = async (session: CashSession, kind: "pdf" | "excel") => {
    const { cashService } = await import("@/services/cash.service");
    const items = await cashService.transactions(session.id);
    if (kind === "pdf") exportCashPdf(session, items);
    else exportCashExcel(session, items);
  };

  return (
    <div className="space-y-6">
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Caixa</h1>
          <p className="text-sm text-muted-foreground">
            Abertura, movimentos, sangrias e fechamento com conferência de valores.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          {current ? (
            <>
              <Button variant="outline" onClick={() => void report(current, "pdf")}>
                <FileText className="mr-2 h-4 w-4" />
                PDF
              </Button>
              <Button variant="outline" onClick={() => void report(current, "excel")}>
                <FileSpreadsheet className="mr-2 h-4 w-4" />
                Excel
              </Button>
              <CashTransactionDialog
                disabled={!canManage}
                onSubmit={(input) =>
                  mutations.addTransaction.mutate({ sessionId: current.id, input })
                }
              />
            </>
          ) : null}
        </div>
      </header>

      {sessions.isLoading ? (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {Array.from({ length: 4 }).map((_, index) => (
            <Skeleton key={index} className="h-24 w-full rounded-2xl" />
          ))}
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <KpiCard
            label="Entradas"
            value={formatCurrency(current?.total_in ?? 0)}
            icon={ArrowUpCircle}
            tone="positive"
          />
          <KpiCard
            label="Saídas"
            value={formatCurrency(current?.total_out ?? 0)}
            icon={ArrowDownCircle}
            tone="negative"
          />
          <KpiCard
            label="Sangrias"
            value={formatCurrency(current?.total_withdrawal ?? 0)}
            icon={HandCoins}
            tone="negative"
          />
          <KpiCard label="Saldo atual / esperado" value={formatCurrency(expected)} icon={Wallet} />
        </div>
      )}

      <Tabs defaultValue="caixa">
        <TabsList>
          <TabsTrigger value="caixa">Caixa atual</TabsTrigger>
          <TabsTrigger value="historico">Histórico</TabsTrigger>
        </TabsList>

        <TabsContent value="caixa" className="mt-4">
          <div className="grid gap-4 lg:grid-cols-[360px_1fr]">
            <Card className="rounded-2xl">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Wallet className="h-5 w-5 text-primary" />
                  {current ? "Caixa aberto" : "Abrir caixa"}
                </CardTitle>
                <CardDescription>
                  {current
                    ? `Aberto em ${moment(current.opened_at)} com ${formatCurrency(current.opening_amount)}`
                    : "Registre o valor inicial em dinheiro no caixa."}
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                {current ? (
                  <div className="space-y-1 rounded-xl bg-muted/40 p-3 text-sm">
                    <p className="flex justify-between">
                      <span className="text-muted-foreground">Abertura</span>
                      <span className="font-semibold">{formatCurrency(current.opening_amount)}</span>
                    </p>
                    <p className="flex justify-between">
                      <span className="text-muted-foreground">Entradas</span>
                      <span className="font-semibold">{formatCurrency(current.total_in)}</span>
                    </p>
                    <p className="flex justify-between">
                      <span className="text-muted-foreground">Saídas + sangrias</span>
                      <span className="font-semibold">
                        {formatCurrency(Number(current.total_out) + Number(current.total_withdrawal))}
                      </span>
                    </p>
                    <p className="flex justify-between border-t border-border/60 pt-1">
                      <span className="text-muted-foreground">Saldo esperado</span>
                      <span className="font-semibold">{formatCurrency(expected)}</span>
                    </p>
                    {amount.trim() ? (
                      <p className="flex justify-between">
                        <span className="text-muted-foreground">Diferença prevista</span>
                        <span
                          className={`font-semibold ${
                            parseNumber(amount) - expected < 0 ? "text-destructive" : ""
                          }`}
                        >
                          {formatCurrency((parseNumber(amount) || 0) - expected)}
                        </span>
                      </p>
                    ) : null}
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
                <CardTitle>Movimentos do caixa</CardTitle>
                <CardDescription>Entradas, saídas e sangrias registradas na sessão</CardDescription>
              </CardHeader>
              <CardContent className="overflow-x-auto">
                {!current ? (
                  <p className="py-8 text-center text-sm text-muted-foreground">
                    Nenhum caixa aberto no momento.
                  </p>
                ) : transactions.isLoading ? (
                  <div className="space-y-2">
                    {Array.from({ length: 4 }).map((_, index) => (
                      <Skeleton key={index} className="h-10 w-full rounded-lg" />
                    ))}
                  </div>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Data</TableHead>
                        <TableHead>Tipo</TableHead>
                        <TableHead>Descrição</TableHead>
                        <TableHead>Pagamento</TableHead>
                        <TableHead className="text-right">Valor</TableHead>
                        <TableHead />
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {(transactions.data ?? []).map((item) => (
                        <TableRow key={item.id}>
                          <TableCell className="whitespace-nowrap">{moment(item.created_at)}</TableCell>
                          <TableCell>
                            <Badge variant={item.type === "entrada" ? "secondary" : "outline"}>
                              {CASH_TYPE_LABEL[item.type]}
                            </Badge>
                          </TableCell>
                          <TableCell>{item.description}</TableCell>
                          <TableCell className="capitalize">{item.payment_method ?? "—"}</TableCell>
                          <TableCell
                            className={`text-right ${item.type === "entrada" ? "" : "text-destructive"}`}
                          >
                            {item.type === "entrada" ? "" : "-"}
                            {formatCurrency(item.amount)}
                          </TableCell>
                          <TableCell className="text-right">
                            {isAdmin ? (
                              <Button
                                size="icon"
                                variant="ghost"
                                onClick={() => mutations.removeTransaction.mutate(item.id)}
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            ) : null}
                          </TableCell>
                        </TableRow>
                      ))}
                      {(transactions.data ?? []).length === 0 ? (
                        <TableRow>
                          <TableCell colSpan={6} className="py-8 text-center text-sm text-muted-foreground">
                            Nenhum movimento registrado.
                          </TableCell>
                        </TableRow>
                      ) : null}
                    </TableBody>
                  </Table>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="historico" className="mt-4">
          {sessions.isLoading ? (
            <Skeleton className="h-72 w-full rounded-2xl" />
          ) : (
            <CashHistory
              sessions={sessions.data ?? []}
              onReport={(session) => void report(session, "pdf")}
            />
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
