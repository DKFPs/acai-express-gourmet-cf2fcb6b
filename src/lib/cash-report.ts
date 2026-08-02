import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import * as XLSX from "xlsx";

import { formatCurrency } from "@/lib/format";
import { CASH_TYPE_LABEL, expectedBalance, type CashSession, type CashTransaction } from "@/types/cash";

function moment(value: string | null) {
  if (!value) return "—";
  return new Date(value).toLocaleString("pt-BR", { dateStyle: "short", timeStyle: "short" });
}

function summaryRows(session: CashSession) {
  const expected = expectedBalance(session);
  return [
    { Indicador: "Abertura", Valor: moment(session.opened_at) },
    { Indicador: "Fechamento", Valor: moment(session.closed_at) },
    { Indicador: "Valor de abertura", Valor: Number(session.opening_amount) },
    { Indicador: "Entradas", Valor: Number(session.total_in) },
    { Indicador: "Saídas", Valor: Number(session.total_out) },
    { Indicador: "Sangrias", Valor: Number(session.total_withdrawal) },
    { Indicador: "Saldo esperado", Valor: session.expected_amount ?? expected },
    { Indicador: "Valor contado", Valor: session.closing_amount ?? "—" },
    { Indicador: "Diferença", Valor: session.difference ?? "—" },
    { Indicador: "Situação", Valor: session.status === "aberto" ? "Aberto" : "Fechado" },
  ];
}

export function exportCashExcel(session: CashSession, transactions: CashTransaction[]) {
  const workbook = XLSX.utils.book_new();

  const resumo = XLSX.utils.json_to_sheet(summaryRows(session));
  resumo["!cols"] = [{ wch: 22 }, { wch: 24 }];
  XLSX.utils.book_append_sheet(workbook, resumo, "Resumo");

  const sheet = XLSX.utils.json_to_sheet(
    transactions.map((item) => ({
      Data: moment(item.created_at),
      Tipo: CASH_TYPE_LABEL[item.type],
      Descrição: item.description,
      Pagamento: item.payment_method ?? "—",
      Valor: Number(item.amount),
    })),
  );
  sheet["!cols"] = [{ wch: 18 }, { wch: 12 }, { wch: 38 }, { wch: 16 }, { wch: 14 }];
  XLSX.utils.book_append_sheet(workbook, sheet, "Movimentos");

  XLSX.writeFile(workbook, `caixa-${new Date(session.opened_at).toISOString().slice(0, 10)}.xlsx`);
}

export function exportCashPdf(session: CashSession, transactions: CashTransaction[]) {
  const doc = new jsPDF({ unit: "pt", format: "a4" });
  doc.setFontSize(16);
  doc.text("Relatório de caixa", 40, 46);
  doc.setFontSize(10);
  doc.text(`Abertura: ${moment(session.opened_at)}`, 40, 64);
  doc.text(`Fechamento: ${moment(session.closed_at)}`, 300, 64);

  autoTable(doc, {
    startY: 84,
    head: [["Indicador", "Valor"]],
    body: summaryRows(session).map((row) => [
      row.Indicador,
      typeof row.Valor === "number" ? formatCurrency(row.Valor) : String(row.Valor),
    ]),
    styles: { fontSize: 9 },
  });

  autoTable(doc, {
    startY: (doc as unknown as { lastAutoTable: { finalY: number } }).lastAutoTable.finalY + 20,
    head: [["Data", "Tipo", "Descrição", "Pagamento", "Valor"]],
    body: transactions.map((item) => [
      moment(item.created_at),
      CASH_TYPE_LABEL[item.type],
      item.description,
      item.payment_method ?? "—",
      formatCurrency(Number(item.amount)),
    ]),
    styles: { fontSize: 9 },
  });

  doc.save(`caixa-${new Date(session.opened_at).toISOString().slice(0, 10)}.pdf`);
}
