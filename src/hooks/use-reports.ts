import { useQuery } from "@tanstack/react-query";

import { reportService } from "@/services/report.service";
import type { ReportKind, ReportPeriod } from "@/types/report";

export function useReport(kind: ReportKind, period: ReportPeriod) {
  return useQuery({
    queryKey: ["report", kind, period.from, period.to],
    queryFn: () => reportService.generate(kind, period),
    placeholderData: (previous) => previous,
  });
}
