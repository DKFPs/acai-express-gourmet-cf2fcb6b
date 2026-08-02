import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { formatCurrency } from "@/lib/format";
import { expectedBalance, type CashSession } from "@/types/cash";

interface CashHistoryProps {
  sessions: CashSession[];
  onReport: (session: CashSession) => void;
}

function moment(value: string | null) {
  if (!value) return "—";
  return new Date(value).toLocaleString("pt-BR", { dateStyle: "short", timeStyle: "short" });
}

export function CashHistory({ sessions, onReport }: CashHistoryProps) {
  return (
    <Card className="rounded-2xl">
      <CardHeader>
        <CardTitle>Histórico de caixas</CardTitle>
        <CardDescription>Aberturas, fechamentos e diferenças</CardDescription>
      </CardHeader>
      <CardContent className="overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Abertura</TableHead>
              <TableHead>Fechamento</TableHead>
              <TableHead className="text-right">Inicial</TableHead>
              <TableHead className="text-right">Entradas</TableHead>
              <TableHead className="text-right">Saídas</TableHead>
              <TableHead className="text-right">Sangrias</TableHead>
              <TableHead className="text-right">Esperado</TableHead>
              <TableHead className="text-right">Contado</TableHead>
              <TableHead className="text-right">Diferença</TableHead>
              <TableHead>Situação</TableHead>
              <TableHead className="text-right">Relatório</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {sessions.map((session) => (
              <TableRow key={session.id}>
                <TableCell className="whitespace-nowrap">{moment(session.opened_at)}</TableCell>
                <TableCell className="whitespace-nowrap">{moment(session.closed_at)}</TableCell>
                <TableCell className="text-right">{formatCurrency(session.opening_amount)}</TableCell>
                <TableCell className="text-right">{formatCurrency(session.total_in)}</TableCell>
                <TableCell className="text-right">{formatCurrency(session.total_out)}</TableCell>
                <TableCell className="text-right">{formatCurrency(session.total_withdrawal)}</TableCell>
                <TableCell className="text-right">
                  {formatCurrency(session.expected_amount ?? expectedBalance(session))}
                </TableCell>
                <TableCell className="text-right">
                  {session.closing_amount === null ? "—" : formatCurrency(session.closing_amount)}
                </TableCell>
                <TableCell
                  className={`text-right ${Number(session.difference ?? 0) < 0 ? "text-destructive" : ""}`}
                >
                  {session.difference === null ? "—" : formatCurrency(session.difference)}
                </TableCell>
                <TableCell className="space-x-1 whitespace-nowrap">
                  <Badge variant={session.status === "aberto" ? "secondary" : "outline"}>
                    {session.status === "aberto" ? "Aberto" : "Fechado"}
                  </Badge>
                  {session.auto_closed ? <Badge variant="outline">Auto</Badge> : null}
                </TableCell>
                <TableCell className="text-right">
                  <Button size="sm" variant="ghost" onClick={() => onReport(session)}>
                    Gerar
                  </Button>
                </TableCell>
              </TableRow>
            ))}
            {sessions.length === 0 ? (
              <TableRow>
                <TableCell colSpan={11} className="py-8 text-center text-sm text-muted-foreground">
                  Nenhum caixa registrado.
                </TableCell>
              </TableRow>
            ) : null}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}
