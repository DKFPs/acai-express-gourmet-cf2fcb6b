import { Link } from "@tanstack/react-router";
import { Crown, Trophy } from "lucide-react";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { formatCurrency } from "@/lib/format";
import type { CustomerWithStats } from "@/types/customer";

interface Props {
  customers: CustomerWithStats[];
  loading?: boolean;
}

export function CustomerRanking({ customers, loading }: Props) {
  return (
    <Card className="rounded-2xl border-border/60 bg-card/60 shadow-soft">
      <CardHeader className="flex flex-row items-center gap-2 pb-3">
        <Trophy className="h-4 w-4 text-primary" />
        <CardTitle className="text-base">Melhores clientes</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {loading &&
          Array.from({ length: 5 }).map((_, index) => (
            <Skeleton key={index} className="h-10 w-full rounded-xl" />
          ))}

        {!loading && !customers.length && (
          <p className="text-sm text-muted-foreground">
            Ainda não há compras suficientes para gerar o ranking.
          </p>
        )}

        {!loading &&
          customers.map((customer, index) => (
            <Link
              key={customer.id}
              to="/clientes/$customerId"
              params={{ customerId: customer.id }}
              className="flex items-center gap-3 rounded-xl border border-border/40 bg-background/40 p-3 transition-colors hover:border-primary/50"
            >
              <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-primary/15 text-xs font-semibold text-primary">
                {index === 0 ? <Crown className="h-3.5 w-3.5" /> : index + 1}
              </span>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium">{customer.name}</p>
                <p className="text-xs text-muted-foreground">
                  {customer.stats.orders_count} pedido
                  {customer.stats.orders_count === 1 ? "" : "s"}
                </p>
              </div>
              <span className="text-sm font-semibold">
                {formatCurrency(customer.stats.total_spent)}
              </span>
            </Link>
          ))}
      </CardContent>
    </Card>
  );
}
