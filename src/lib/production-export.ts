import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import * as XLSX from "xlsx";

export interface SimpleColumn {
  key: string;
  label: string;
}

export interface SimpleReport {
  slug: string;
  title: string;
  subtitle: string;
  kpis: { label: string; value: string }[];
  columns: SimpleColumn[];
  rows: Record<string, string | number | null>[];
}

function fileName(report: SimpleReport, extension: string) {
  return `producao-${report.slug}-${new Date().toISOString().slice(0, 10)}.${extension}`;
}

export function exportProductionExcel(report: SimpleReport) {
  const workbook = XLSX.utils.book_new();

  const resumo = XLSX.utils.json_to_sheet([
    { Indicador: "Relatório", Valor: report.title },
    { Indicador: "Período", Valor: report.subtitle },
    ...report.kpis.map((kpi) => ({ Indicador: kpi.label, Valor: kpi.value })),
  ]);
  resumo["!cols"] = [{ wch: 28 }, { wch: 28 }];
  XLSX.utils.book_append_sheet(workbook, resumo, "Resumo");

  const dados = XLSX.utils.json_to_sheet(
    report.rows.map((row) => {
      const output: Record<string, string | number | null> = {};
      for (const column of report.columns) output[column.label] = row[column.key] ?? null;
      return output;
    }),
  );
  dados["!cols"] = report.columns.map((column) => ({ wch: Math.max(14, column.label.length + 6) }));
  XLSX.utils.book_append_sheet(workbook, dados, "Dados");

  XLSX.writeFile(workbook, fileName(report, "xlsx"));
}

export function exportProductionPdf(report: SimpleReport) {
  const doc = new jsPDF({ orientation: "landscape", unit: "pt", format: "a4" });

  doc.setFontSize(16);
  doc.text(report.title, 40, 40);
  doc.setFontSize(10);
  doc.text(report.subtitle, 40, 58);

  if (report.kpis.length > 0) {
    autoTable(doc, {
      startY: 76,
      head: [report.kpis.map((kpi) => kpi.label)],
      body: [report.kpis.map((kpi) => kpi.value)],
      theme: "grid",
      headStyles: { fillColor: [109, 40, 217] },
      styles: { fontSize: 9 },
    });
  }

  autoTable(doc, {
    startY: (doc as unknown as { lastAutoTable?: { finalY: number } }).lastAutoTable
      ? (doc as unknown as { lastAutoTable: { finalY: number } }).lastAutoTable.finalY + 20
      : 76,
    head: [report.columns.map((column) => column.label)],
    body: report.rows.map((row) => report.columns.map((column) => String(row[column.key] ?? "—"))),
    theme: "striped",
    headStyles: { fillColor: [42, 11, 61] },
    styles: { fontSize: 8 },
  });

  doc.save(fileName(report, "pdf"));
}
