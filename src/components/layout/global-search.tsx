import { useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { Search } from "lucide-react";

import {
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
} from "@/components/ui/command";
import { Button } from "@/components/ui/button";
import { NAVIGATION } from "@/config/navigation";
import { usePermissions } from "@/hooks/use-permissions";
import { useFavorites } from "@/hooks/use-audit";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";

interface SearchResult {
  id: string;
  label: string;
  hint: string;
  to: string;
}

export function GlobalSearch() {
  const [open, setOpen] = useState(false);
  const [term, setTerm] = useState("");
  const [results, setResults] = useState<SearchResult[]>([]);
  const navigate = useNavigate();
  const { can } = usePermissions();
  const { favorites } = useFavorites();
  const { profile } = useAuth();
  const companyId = profile?.company_id ?? null;

  const pages = useMemo(
    () => NAVIGATION.flatMap((section) => section.items).filter((item) => !item.soon && can(item.permission)),
    [can],
  );

  useEffect(() => {
    const handler = (event: KeyboardEvent) => {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "k") {
        event.preventDefault();
        setOpen((value) => !value);
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, []);

  useEffect(() => {
    if (!open || !companyId) return;
    const query = term.trim();
    if (query.length < 2) {
      setResults([]);
      return;
    }
    let active = true;
    const timeout = window.setTimeout(async () => {
      const [products, customers, orders] = await Promise.all([
        supabase.from("products").select("id, name").ilike("name", `%${query}%`).limit(5),
        supabase.from("customers").select("id, name, phone").ilike("name", `%${query}%`).limit(5),
        supabase
          .from("orders")
          .select("id, order_number, customer_name")
          .or(`customer_name.ilike.%${query}%`)
          .limit(5),
      ]);
      if (!active) return;
      setResults([
        ...(products.data ?? []).map((row) => ({
          id: `p-${row.id}`,
          label: row.name,
          hint: "Produto",
          to: "/produtos",
        })),
        ...(customers.data ?? []).map((row) => ({
          id: `c-${row.id}`,
          label: row.name,
          hint: row.phone ?? "Cliente",
          to: `/clientes/${row.id}`,
        })),
        ...(orders.data ?? []).map((row) => ({
          id: `o-${row.id}`,
          label: `Pedido #${row.order_number}`,
          hint: row.customer_name ?? "Pedido",
          to: `/pedidos/${row.id}`,
        })),
      ]);
    }, 250);

    return () => {
      active = false;
      window.clearTimeout(timeout);
    };
  }, [term, open, companyId]);

  const go = (to: string) => {
    setOpen(false);
    setTerm("");
    void navigate({ to });
  };

  return (
    <>
      <Button
        variant="outline"
        onClick={() => setOpen(true)}
        className="hidden h-9 w-56 justify-start gap-2 rounded-xl px-3 text-muted-foreground lg:flex"
      >
        <Search className="h-4 w-4" />
        <span className="text-sm">Pesquisar...</span>
        <kbd className="ml-auto rounded border border-border px-1.5 text-[10px]">Ctrl K</kbd>
      </Button>
      <Button
        variant="ghost"
        size="icon"
        className="rounded-xl lg:hidden"
        aria-label="Pesquisar"
        onClick={() => setOpen(true)}
      >
        <Search className="h-[18px] w-[18px]" />
      </Button>

      <CommandDialog open={open} onOpenChange={setOpen}>
        <CommandInput
          placeholder="Buscar páginas, produtos, clientes ou pedidos..."
          value={term}
          onValueChange={setTerm}
        />
        <CommandList>
          <CommandEmpty>Nenhum resultado.</CommandEmpty>
          {favorites.length > 0 && (
            <CommandGroup heading="Favoritos">
              {favorites.map((item) => (
                <CommandItem key={item.id} value={`fav ${item.label}`} onSelect={() => go(item.path)}>
                  {item.label}
                </CommandItem>
              ))}
            </CommandGroup>
          )}
          <CommandGroup heading="Páginas">
            {pages.map((page) => (
              <CommandItem key={page.to} value={page.title} onSelect={() => go(page.to)}>
                <page.icon className="mr-2 h-4 w-4" />
                {page.title}
              </CommandItem>
            ))}
          </CommandGroup>
          {results.length > 0 && (
            <>
              <CommandSeparator />
              <CommandGroup heading="Registros">
                {results.map((result) => (
                  <CommandItem key={result.id} value={result.label} onSelect={() => go(result.to)}>
                    <span>{result.label}</span>
                    <span className="ml-auto text-xs text-muted-foreground">{result.hint}</span>
                  </CommandItem>
                ))}
              </CommandGroup>
            </>
          )}
        </CommandList>
      </CommandDialog>
    </>
  );
}
