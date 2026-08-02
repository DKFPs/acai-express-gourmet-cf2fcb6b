import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import * as XLSX from "xlsx";

import { formatValue } from "@/lib/report-format";
import { periodLabel, type ReportPeriod, type ReportResult } from "@/types/report";

function fileName(result: ReportResult, extension: string) {
  return `relatorio-${result.kind}-${new Date().toISOString().slice(0, 10)}.${extension}`;
}

function tableRows(result: ReportResult) {
  return result.rows.map((row) =>
    result.columns.map((column) => formatValue(row[column.key] ?? null, column.format)),
  );
}

export function exportReportExcel(result: ReportResult, period: ReportPeriod) {
  const workbook = XLSX.utils.book_new();

  const resumo = XLSX.utils.json_to_sheet([
    { Indicador: "Relatório", Valor: result.title },
    { Indicador: "Período", Valor: periodLabel(period) },
    ...result.kpis.map((kpi) => ({ Indicador: kpi.label, Valor: kpi.value })),
  ]);
  resumo["!cols"] = [{ wch: 26 }, { wch: 26 }];
  XLSX.utils.book_append_sheet(workbook, resumo, "Resumo");

  const dados = XLSX.utils.json_to_sheet(
    result.rows.map((row) => {
      const output: Record<string, string | number | null> = {};
      for (const column of result.columns) {
        const raw = row[column.key] ?? null;
        output[column.label] =
          column.format === "currency" || column.format === "number" || column.format === "percent"
            ? raw === null
              ? null
              : Number(raw)
            : formatValue(raw, column.format);
      }
      return output;
    }),
  );
  dados["!cols"] = result.columns.map((column) => ({ wch: Math.max(14, column.label.length + 6) }));
  XLSX.utils.book_append_sheet(workbook, dados, "Dados");

  XLSX.writeFile(workbook, fileName(result, "xlsx"));
}

export function exportReportPdf(result: ReportResult, period: ReportPeriod) {
  const doc = new jsPDF({ orientation: "landscape", unit: "pt", format: "a4" });

  doc.setFontSize(16);
  doc.text(result.title, 40, 40);
  doc.setFontSize(10);
  doc.text(`Período: ${periodLabel(period)}`, 40, 58);

  autoTable(doc, {
    startY: 76,
    head: [result.kpis.map((kpi) => kpi.label)],
    body: [result.kpis.map((kpi) => formatValue(kpi.value, kpi.format))],
    theme: "grid",
    headStyles: { fillColor: [109, 40, 217] },
    styles: { fontSize: 9 },
  });

  autoTable(doc, {
    startY: (doc as unknown as { lastAutoTable: { finalY: number } }).lastAutoTable.finalY + 20,
    head: [result.columns.map((column) => column.label)],
    body: tableRows(result),
    theme: "striped",
    headStyles: { fillColor: [42, 11, 61] },
    styles: { fontSize: 8 },
  });

  doc.save(fileName(result, "pdf"));
}

export function printReport(result: ReportResult, period: ReportPeriod) {
  const win = window.open("", "_blank", "width=1024,height=768");
  if (!win) return;

  const escape = (value: string) =>
    value.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

  const kpis = result.kpis
    .map(
      (kpi) =>
        `<div class="kpi"><span>${escape(kpi.label)}</span><strong>${escape(
          formatValue(kpi.value, kpi.format),
        )}</strong></div>`,
    )
    .join("");

  const head = result.columns.map((column) => `<th>${escape(column.label)}</th>`).join("");
  const body = tableRows(result)
    .map((row) => `<tr>${row.map((cell) => `<td>${escape(cell)}</td>`).join("")}</tr>`)
    .join("");

  win.document.write(`<!doctype html><html lang="pt-BR"><head><meta charset="utf-8" />
<title>${escape(result.title)}</title>
<style>
  body { font-family: system-ui, sans-serif; color: #1c1c1c; margin: 24px; }
  h1 { font-size: 20px; margin: 0 0 4px; }
  p.period { margin: 0 0 18px; color: #555; font-size: 13px; }
  .kpis { display: flex; flex-wrap: wrap; gap: 12px; margin-bottom: 20px; }
  .kpi { border: 1px solid #ddd; border-radius: 8px; padding: 10px 14px; min-width: 150px; }
  .kpi span { display: block; font-size: 11px; text-transform: uppercase; color: #666; }
  .kpi strong { font-size: 16px; }
  table { width: 100%; border-collapse: collapse; font-size: 11px; }
  th, td { border-bottom: 1px solid #e3e3e3; padding: 6px 8px; text-align: left; }
  th { background: #f4f1fb; }
  @media print { body { margin: 10mm; } }
</style></head><body>
<h1>${escape(result.title)}</h1>
<p class="period">Período: ${escape(periodLabel(period))}</p>
<div class="kpis">${kpis}</div>
<table><thead><tr>${head}</tr></thead><tbody>${body}</tbody></table>
</body></html>`);
  win.document.close();
  win.focus();
  setTimeout(() => win.print(), 300);
}
