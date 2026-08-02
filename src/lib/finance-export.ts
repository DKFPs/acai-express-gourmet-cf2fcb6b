import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import * as XLSX from "xlsx";

import type { FinanceSummary } from "@/lib/finance-metrics";
import { formatCurrency } from "@/lib/format";
import { STATUS_LABEL, TYPE_LABEL, type FinancialEntry } from "@/types/finance";

function formatDate(value: string | null) {
  if (!value) return "—";
  const date = new Date(value.length === 10 ? `${value}T12:00:00` : value);
  return date.toLocaleDateString("pt-BR");
}

function rows(entries: FinancialEntry[]) {
  return entries.map((entry) => ({
    Data: formatDate(entry.due_date),
    Tipo: TYPE_LABEL[entry.type],
    Descrição: entry.description,
    Categoria: entry.category?.name ?? "—",
    Situação: STATUS_LABEL[entry.status],
    Pagamento: formatDate(entry.paid_at),
    Valor: Number(entry.amount),
  }));
}

export function exportFinanceExcel(
  entries: FinancialEntry[],
  summary: FinanceSummary,
  period: string,
) {
  const workbook = XLSX.utils.book_new();

  const sheet = XLSX.utils.json_to_sheet(rows(entries));
  sheet["!cols"] = [{ wch: 12 }, { wch: 14 }, { wch: 38 }, { wch: 20 }, { wch: 12 }, { wch: 12 }, { wch: 14 }];
  XLSX.utils.book_append_sheet(workbook, sheet, "Lançamentos");

  const resumo = XLSX.utils.json_to_sheet([
    { Indicador: "Período", Valor: period },
    { Indicador: "Receitas", Valor: summary.receitas },
    { Indicador: "Despesas", Valor: summary.despesas },
    { Indicador: "Compras", Valor: summary.compras },
    { Indicador: "Investimentos", Valor: summary.investimentos },
    { Indicador: "Lucro", Valor: summary.lucro },
    { Indicador: "Margem (%)", Valor: summary.margem },
    { Indicador: "Contas pagas", Valor: summary.pagas },
    { Indicador: "Contas pendentes", Valor: summary.pendentes },
  ]);
  resumo["!cols"] = [{ wch: 22 }, { wch: 22 }];
  XLSX.utils.book_append_sheet(workbook, resumo, "Resumo");

  XLSX.writeFile(workbook, `financeiro-${new Date().toISOString().slice(0, 10)}.xlsx`);
}

export function exportFinancePdf(
  entries: FinancialEntry[],
  summary: FinanceSummary,
  period: string,
) {
  const doc = new jsPDF({ orientation: "landscape", unit: "pt", format: "a4" });

  doc.setFontSize(16);
  doc.text("Relatório Financeiro", 40, 40);
  doc.setFontSize(10);
  doc.text(`Período: ${period}`, 40, 58);

  autoTable(doc, {
    startY: 76,
    head: [["Receitas", "Despesas", "Compras", "Investimentos", "Lucro", "Margem", "Pendentes"]],
    body: [
      [
        formatCurrency(summary.receitas),
        formatCurrency(summary.despesas),
        formatCurrency(summary.compras),
        formatCurrency(summary.investimentos),
        formatCurrency(summary.lucro),
        `${summary.margem}%`,
        formatCurrency(summary.pendentes),
      ],
    ],
    theme: "grid",
    headStyles: { fillColor: [109, 40, 217] },
    styles: { fontSize: 9 },
  });

  autoTable(doc, {
    startY: (doc as unknown as { lastAutoTable: { finalY: number } }).lastAutoTable.finalY + 20,
    head: [["Data", "Tipo", "Descrição", "Categoria", "Situação", "Pagamento", "Valor"]],
    body: entries.map((entry) => [
      formatDate(entry.due_date),
      TYPE_LABEL[entry.type],
      entry.description,
      entry.category?.name ?? "—",
      STATUS_LABEL[entry.status],
      formatDate(entry.paid_at),
      formatCurrency(entry.amount),
    ]),
    theme: "striped",
    headStyles: { fillColor: [42, 11, 61] },
    styles: { fontSize: 9 },
  });

  doc.save(`financeiro-${new Date().toISOString().slice(0, 10)}.pdf`);
}
