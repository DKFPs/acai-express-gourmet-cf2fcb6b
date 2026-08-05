import { useMemo, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import {
  AlertTriangle,
  FileSpreadsheet,
  FileText,
  Plus,
  Search,
  Tags,
  TrendingDown,
  TrendingUp,
  Wallet,
} from "lucide-react";

import { PageHeader } from "@/components/common/page-header";
import { CashRegisterPanel } from "@/components/finance/cash-register-panel";
import { CategoriesDialog } from "@/components/finance/categories-dialog";
import { EntryCards } from "@/components/finance/entry-cards";
import { EntryDialog } from "@/components/finance/entry-dialog";
import { EntryTable } from "@/components/finance/entry-table";
import { FinanceCharts } from "@/components/finance/finance-charts";
import {
  FinanceCardsSkeleton,
  FinanceChartsSkeleton,
  FinanceKpiSkeleton,
  FinanceTableSkeleton,
} from "@/components/finance/finance-skeletons";
import { ConfirmDeleteDialog } from "@/components/products/confirm-delete-dialog";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  useCashRegisterMutations,
  useCashRegisters,
  useExpenseCategories,
  useExpenseCategoryMutations,
  useFinancialEntries,
  useFinancialEntryMutations,
  useFinancialRange,
} from "@/hooks/use-finance";
import { useIsMobile } from "@/hooks/use-mobile";
import { usePermissions } from "@/hooks/use-permissions";
import { useSuppliers } from "@/hooks/use-stock";
import { exportFinanceExcel, exportFinancePdf } from "@/lib/finance-export";
import { summarize } from "@/lib/finance-metrics";
import { formatCurrency, formatPercent } from "@/lib/format";
import {
  FINANCIAL_STATUS,
  FINANCIAL_TYPES,
  type FinancialEntry,
  type FinancialFilters,
} from "@/types/finance";

export const Route = createFileRoute("/_authenticated/financeiro")({
  head: () => ({
    meta: [
      { title: "Financeiro — Açaí Express Manager" },
      {
        name: "description",
        content:
          "Controle financeiro completo: receitas, despesas, compras, investimentos, fluxo de caixa, lucro e margem.",
      },
      { property: "og:title", content: "Financeiro — Açaí Express Manager" },
      {
        property: "og:description",
        content: "Dashboard financeiro com fluxo de caixa, contas pagas e pendentes e exportações.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: FinanceiroPage,
});

function monthStart() {
  const date = new Date();
  return new Date(date.getFullYear(), date.getMonth(), 1).toISOString().slice(0, 10);
}

function monthEnd() {
  const date = new Date();
  return new Date(date.getFullYear(), date.getMonth() + 1, 0).toISOString().slice(0, 10);
}

const DEFAULT_FILTERS: FinancialFilters = {
  search: "",
  type: "todos",
  status: "todos",
  categoryId: "todas",
  from: monthStart(),
  to: monthEnd(),
  page: 1,
  pageSize: 10,
};

function FinanceiroPage() {
  const [filters, setFilters] = useState<FinancialFilters>(DEFAULT_FILTERS);
  const [entryDialog, setEntryDialog] = useState(false);
  const [categoriesDialog, setCategoriesDialog] = useState(false);
  const [editing, setEditing] = useState<FinancialEntry | null>(null);
  const [toDelete, setToDelete] = useState<FinancialEntry | null>(null);

  const isMobile = useIsMobile();
  const { can } = usePermissions();
  const canManage = can("finance.manage");

  const list = useFinancialEntries(filters);
  const period = useFinancialRange(filters.from, filters.to);
  const categories = useExpenseCategories();
  const suppliers = useSuppliers();
  const registers = useCashRegisters();

  const entryMutations = useFinancialEntryMutations();
  const categoryMutations = useExpenseCategoryMutations();
  const cashMutations = useCashRegisterMutations();

  const periodEntries = useMemo(() => period.data ?? [], [period.data]);
  const summary = useMemo(() => summarize(periodEntries), [periodEntries]);
  const paidCash = useMemo(
    () =>
      periodEntries
        .filter((entry) => entry.status === "pago")
        .reduce(
          (total, entry) =>
            entry.type === "receita" ? total + Number(entry.amount) : total - Number(entry.amount),
          0,
        ),
    [periodEntries],
  );

  const periodLabel = `${filters.from.split("-").reverse().join("/")} a ${filters.to
    .split("-")
    .reverse()
    .join("/")}`;

  const total = list.data?.total ?? 0;
  const pageCount = Math.max(1, Math.ceil(total / filters.pageSize));

  const patch = (values: Partial<FinancialFilters>) =>
    setFilters((current) => ({ ...current, page: 1, ...values }));

  const kpis = [
    {
      label: "Receitas",
      value: formatCurrency(summary.receitas),
      icon: TrendingUp,
      tone: "text-emerald-500",
    },
    {
      label: "Saídas",
      value: formatCurrency(summary.saidas),
      icon: TrendingDown,
      tone: "text-destructive",
    },
    {
      label: "Lucro do período",
      value: formatCurrency(summary.lucro),
      icon: Wallet,
      tone: summary.lucro >= 0 ? "text-emerald-500" : "text-destructive",
    },
    {
      label: "Margem",
      value: formatPercent(summary.margem),
      icon: TrendingUp,
      tone: "text-primary",
    },
  ];

  return (
    <div className="space-y-6">
      <PageHeader
        title="Financeiro"
        description="Receitas, despesas, compras, investimentos, caixa e resultado do negócio."
        actions={
          <>
            <Button variant="outline" onClick={() => setCategoriesDialog(true)}>
              <Tags className="mr-2 h-4 w-4" /> Categorias
            </Button>
            <Button
              variant="outline"
              onClick={() => exportFinancePdf(periodEntries, summary, periodLabel)}
              disabled={periodEntries.length === 0}
            >
              <FileText className="mr-2 h-4 w-4" /> PDF
            </Button>
            <Button
              variant="outline"
              onClick={() => exportFinanceExcel(periodEntries, summary, periodLabel)}
              disabled={periodEntries.length === 0}
            >
              <FileSpreadsheet className="mr-2 h-4 w-4" /> Excel
            </Button>
            {canManage ? (
              <Button
                onClick={() => {
                  setEditing(null);
                  setEntryDialog(true);
                }}
              >
                <Plus className="mr-2 h-4 w-4" /> Novo lançamento
              </Button>
            ) : null}
          </>
        }
      />

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <div className="space-y-2 sm:col-span-2 lg:col-span-2">
          <Label htmlFor="finance-search">Pesquisar</Label>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              id="finance-search"
              className="pl-9"
              placeholder="Buscar por descrição"
              value={filters.search}
              onChange={(event) => patch({ search: event.target.value })}
            />
          </div>
        </div>
        <div className="space-y-2">
          <Label htmlFor="finance-from">De</Label>
          <Input
            id="finance-from"
            type="date"
            value={filters.from}
            onChange={(event) => patch({ from: event.target.value })}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="finance-to">Até</Label>
          <Input
            id="finance-to"
            type="date"
            value={filters.to}
            onChange={(event) => patch({ to: event.target.value })}
          />
        </div>
      </div>

      <div className="grid gap-3 sm:grid-cols-3">
        <Select
          value={filters.type}
          onValueChange={(value) => patch({ type: value as FinancialFilters["type"] })}
        >
          <SelectTrigger>
            <SelectValue placeholder="Tipo" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="todos">Todos os tipos</SelectItem>
            {FINANCIAL_TYPES.map((option) => (
              <SelectItem key={option.value} value={option.value}>
                {option.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select
          value={filters.status}
          onValueChange={(value) => patch({ status: value as FinancialFilters["status"] })}
        >
          <SelectTrigger>
            <SelectValue placeholder="Situação" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="todos">Todas as situações</SelectItem>
            {FINANCIAL_STATUS.map((option) => (
              <SelectItem key={option.value} value={option.value}>
                {option.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select value={filters.categoryId} onValueChange={(value) => patch({ categoryId: value })}>
          <SelectTrigger>
            <SelectValue placeholder="Categoria" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="todas">Todas as categorias</SelectItem>
            {(categories.data ?? []).map((category) => (
              <SelectItem key={category.id} value={category.id}>
                {category.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {period.isLoading ? (
        <FinanceKpiSkeleton />
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {kpis.map((kpi) => (
            <Card key={kpi.label} className="rounded-2xl">
              <CardContent className="flex items-center justify-between p-5">
                <div>
                  <p className="text-sm text-muted-foreground">{kpi.label}</p>
                  <p className={`text-2xl font-semibold ${kpi.tone}`}>{kpi.value}</p>
                </div>
                <kpi.icon className={`h-8 w-8 ${kpi.tone}`} />
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <div className="grid gap-4 sm:grid-cols-2">
        <Card className="rounded-2xl">
          <CardContent className="p-5">
            <p className="text-sm text-muted-foreground">Contas pagas no período</p>
            <p className="text-xl font-semibold text-emerald-500">
              {formatCurrency(summary.pagas)}
            </p>
          </CardContent>
        </Card>
        <Card className="rounded-2xl">
          <CardContent className="p-5">
            <p className="text-sm text-muted-foreground">
              Contas pendentes ({summary.pendentesCount})
            </p>
            <p className="text-xl font-semibold text-amber-500">
              {formatCurrency(summary.pendentes)}
            </p>
          </CardContent>
        </Card>
      </div>

      {summary.vencidas > 0 ? (
        <Alert variant="destructive" className="rounded-2xl">
          <AlertTriangle className="h-4 w-4" />
          <AlertTitle>Contas vencidas</AlertTitle>
          <AlertDescription>
            Existem {summary.vencidas} conta(s) pendente(s) com vencimento ultrapassado.
          </AlertDescription>
        </Alert>
      ) : null}

      <Tabs defaultValue="lancamentos" className="space-y-4">
        <TabsList>
          <TabsTrigger value="lancamentos">Lançamentos</TabsTrigger>
          <TabsTrigger value="graficos">Gráficos</TabsTrigger>
          <TabsTrigger value="caixa">Caixa</TabsTrigger>
        </TabsList>

        <TabsContent value="lancamentos" className="space-y-4">
          {list.isLoading ? (
            isMobile ? (
              <FinanceCardsSkeleton />
            ) : (
              <FinanceTableSkeleton />
            )
          ) : isMobile ? (
            <EntryCards
              items={list.data?.items ?? []}
              canManage={canManage}
              onEdit={(entry) => {
                setEditing(entry);
                setEntryDialog(true);
              }}
              onDelete={setToDelete}
              onSettle={(entry) => entryMutations.settle.mutate(entry.id)}
            />
          ) : (
            <EntryTable
              items={list.data?.items ?? []}
              canManage={canManage}
              onEdit={(entry) => {
                setEditing(entry);
                setEntryDialog(true);
              }}
              onDelete={setToDelete}
              onSettle={(entry) => entryMutations.settle.mutate(entry.id)}
            />
          )}

          <div className="flex items-center justify-between gap-3">
            <p className="text-sm text-muted-foreground">
              {total} lançamento(s) · página {filters.page} de {pageCount}
            </p>
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                disabled={filters.page <= 1}
                onClick={() => setFilters((current) => ({ ...current, page: current.page - 1 }))}
              >
                Anterior
              </Button>
              <Button
                variant="outline"
                size="sm"
                disabled={filters.page >= pageCount}
                onClick={() => setFilters((current) => ({ ...current, page: current.page + 1 }))}
              >
                Próxima
              </Button>
            </div>
          </div>
        </TabsContent>

        <TabsContent value="graficos">
          {period.isLoading ? <FinanceChartsSkeleton /> : <FinanceCharts entries={periodEntries} />}
        </TabsContent>

        <TabsContent value="caixa">
          <CashRegisterPanel
            registers={registers.data ?? []}
            expected={paidCash}
            canManage={canManage}
            onOpen={(amount, notes) => cashMutations.open.mutate({ amount, notes })}
            onClose={(id, amount, expected, notes) =>
              cashMutations.close.mutate({ id, amount, expected, notes })
            }
          />
        </TabsContent>
      </Tabs>

      <EntryDialog
        open={entryDialog}
        onOpenChange={setEntryDialog}
        entry={editing}
        categories={categories.data ?? []}
        suppliers={suppliers.data ?? []}
        loading={entryMutations.create.isPending || entryMutations.update.isPending}
        onSubmit={(input) => {
          if (editing) entryMutations.update.mutate({ id: editing.id, input });
          else entryMutations.create.mutate(input);
          setEntryDialog(false);
        }}
      />

      <CategoriesDialog
        open={categoriesDialog}
        onOpenChange={setCategoriesDialog}
        categories={categories.data ?? []}
        canManage={canManage}
        onCreate={(input) => categoryMutations.create.mutate(input)}
        onUpdate={(id, input) => categoryMutations.update.mutate({ id, input })}
        onDelete={(id) => categoryMutations.remove.mutate(id)}
      />

      <ConfirmDeleteDialog
        open={Boolean(toDelete)}
        onOpenChange={(value) => !value && setToDelete(null)}
        title="Excluir lançamento"
        description={`Tem certeza que deseja excluir "${toDelete?.description ?? ""}"? Esta ação não pode ser desfeita.`}
        loading={entryMutations.remove.isPending}
        onConfirm={() => {
          if (toDelete) entryMutations.remove.mutate(toDelete.id);
          setToDelete(null);
        }}
      />
    </div>
  );
}
