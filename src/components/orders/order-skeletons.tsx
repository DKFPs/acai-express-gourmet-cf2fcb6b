import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { TableCell, TableRow } from "@/components/ui/table";

export function OrderTableSkeleton({ rows = 6 }: { rows?: number }) {
  return (
    <>
      {Array.from({ length: rows }).map((_, index) => (
        <TableRow key={index}>
          {Array.from({ length: 6 }).map((__, cell) => (
            <TableCell key={cell}>
              <Skeleton className="h-3.5 w-20" />
            </TableCell>
          ))}
          <TableCell>
            <Skeleton className="ml-auto h-8 w-8 rounded-lg" />
          </TableCell>
        </TableRow>
      ))}
    </>
  );
}

export function OrderCardsSkeleton({ items = 4 }: { items?: number }) {
  return (
    <div className="grid gap-3">
      {Array.from({ length: items }).map((_, index) => (
        <Card key={index} className="rounded-2xl border-border/60 bg-card/70 shadow-soft">
          <CardContent className="space-y-3 p-4">
            <div className="flex items-center justify-between">
              <Skeleton className="h-4 w-24" />
              <Skeleton className="h-5 w-20 rounded-full" />
            </div>
            <Skeleton className="h-3 w-40" />
            <Skeleton className="h-3 w-28" />
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
