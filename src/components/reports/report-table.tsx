import { Card, CardContent } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { formatValue } from "@/lib/report-format";
import type { ReportResult } from "@/types/report";

export function ReportTable({ result }: { result: ReportResult }) {
  if (!result.rows.length) {
    return (
      <Card>
        <CardContent className="py-12 text-center text-sm text-muted-foreground">
          Nenhum registro encontrado para o período selecionado.
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardContent className="overflow-x-auto p-0">
        <Table>
          <TableHeader>
            <TableRow>
              {result.columns.map((column) => (
                <TableHead
                  key={column.key}
                  className={column.format === "text" ? "" : "text-right"}
                >
                  {column.label}
                </TableHead>
              ))}
            </TableRow>
          </TableHeader>
          <TableBody>
            {result.rows.slice(0, 300).map((row, index) => (
              <TableRow key={index}>
                {result.columns.map((column) => (
                  <TableCell
                    key={column.key}
                    className={column.format === "text" ? "" : "text-right tabular-nums"}
                  >
                    {formatValue(row[column.key] ?? null, column.format)}
                  </TableCell>
                ))}
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}
