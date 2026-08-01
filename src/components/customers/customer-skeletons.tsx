import { Skeleton } from "@/components/ui/skeleton";

export function CustomerTableSkeleton() {
  return (
    <div className="space-y-2 rounded-2xl border border-border/60 bg-card/60 p-4">
      {Array.from({ length: 6 }).map((_, index) => (
        <div key={index} className="flex items-center gap-4">
          <Skeleton className="h-10 w-10 rounded-full" />
          <Skeleton className="h-4 flex-1" />
          <Skeleton className="hidden h-4 w-32 sm:block" />
          <Skeleton className="hidden h-4 w-24 md:block" />
          <Skeleton className="h-4 w-16" />
        </div>
      ))}
    </div>
  );
}

export function CustomerCardsSkeleton() {
  return (
    <div className="grid gap-3">
      {Array.from({ length: 4 }).map((_, index) => (
        <div key={index} className="space-y-3 rounded-2xl border border-border/60 bg-card/60 p-4">
          <Skeleton className="h-5 w-2/3" />
          <Skeleton className="h-4 w-1/2" />
          <Skeleton className="h-4 w-1/3" />
        </div>
      ))}
    </div>
  );
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
