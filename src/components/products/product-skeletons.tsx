import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { TableCell, TableRow } from "@/components/ui/table";

export function ProductTableSkeleton({ rows = 6 }: { rows?: number }) {
  return (
    <>
      {Array.from({ length: rows }).map((_, index) => (
        <TableRow key={index}>
          <TableCell>
            <div className="flex items-center gap-3">
              <Skeleton className="h-11 w-11 rounded-xl" />
              <div className="space-y-2">
                <Skeleton className="h-3.5 w-40" />
                <Skeleton className="h-3 w-24" />
              </div>
            </div>
          </TableCell>
          {Array.from({ length: 5 }).map((__, cell) => (
            <TableCell key={cell}>
              <Skeleton className="h-3.5 w-16" />
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

export function ProductCardsSkeleton({ items = 4 }: { items?: number }) {
  return (
    <div className="grid gap-3">
      {Array.from({ length: items }).map((_, index) => (
        <Card key={index} className="rounded-2xl border-border/60 bg-card/70 shadow-soft">
          <CardContent className="flex gap-4 p-4">
            <Skeleton className="h-16 w-16 rounded-xl" />
            <div className="flex-1 space-y-2">
              <Skeleton className="h-4 w-2/3" />
              <Skeleton className="h-3 w-1/3" />
              <Skeleton className="h-3 w-1/2" />
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
