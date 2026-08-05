// Reaproveita os skeletons padronizados em @/components/common/loading.
import { CardsSkeleton, TableSkeleton } from "@/components/common/loading";
import { Skeleton } from "@/components/ui/skeleton";

export function CustomerTableSkeleton() {
  return <TableSkeleton rows={6} />;
}

export function CustomerCardsSkeleton() {
  return <CardsSkeleton count={4} />;
}

export function CustomerDetailSkeleton() {
  return (
    <div className="space-y-4">
      <Skeleton className="h-24 w-full rounded-2xl" />
      <div className="grid gap-3 sm:grid-cols-4">
        {Array.from({ length: 4 }).map((_, index) => (
          <Skeleton key={index} className="h-24 rounded-2xl" />
        ))}
      </div>
      <Skeleton className="h-64 w-full rounded-2xl" />
    </div>
  );
}
