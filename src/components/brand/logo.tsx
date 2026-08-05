import { cn } from "@/lib/utils";

export function Logo({ className, compact = false }: { className?: string; compact?: boolean }) {
  return (
    <div className={cn("flex items-center gap-3", className)}>
      <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-primary text-lg font-black text-primary-foreground shadow-soft ring-1 ring-gold/40">
        AE
      </span>
      {!compact && (
        <span className="flex flex-col leading-tight">
          <span className="text-sm font-bold tracking-tight">Açaí Express</span>
          <span className="text-[11px] font-medium uppercase tracking-[0.18em] text-gold">
            Manager
          </span>
        </span>
      )}
    </div>
  );
}
