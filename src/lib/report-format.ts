import { formatCurrency, formatNumber, formatPercent } from "@/lib/format";
import type { ReportRow, ValueFormat } from "@/types/report";

export function formatValue(value: ReportRow[string], format: ValueFormat) {
  if (value === null || value === undefined || value === "") return "—";
  switch (format) {
    case "currency":
      return formatCurrency(Number(value));
    case "number":
      return formatNumber(Number(value));
    case "percent":
      return formatPercent(Number(value));
    case "date":
      return new Date(String(value).length === 10 ? `${value}T12:00:00` : String(value)).toLocaleDateString("pt-BR");
    case "datetime":
      return new Date(String(value)).toLocaleString("pt-BR", { dateStyle: "short", timeStyle: "short" });
    default:
      return String(value);
  }
}
