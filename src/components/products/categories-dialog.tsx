import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Loader2, Pencil, Plus, Trash2, X } from "lucide-react";

import { ConfirmDeleteDialog } from "@/components/products/confirm-delete-dialog";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { Switch } from "@/components/ui/switch";
import { useCategoryMutations } from "@/hooks/use-products";
import { categorySchema, type CategoryFormValues } from "@/lib/validations/product";
import type { Category } from "@/types/product";

interface CategoriesDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  categories: Category[];
  loading: boolean;
  canManage: boolean;
}

const EMPTY: CategoryFormValues = { name: "", description: "", color: "", is_active: true };

export function CategoriesDialog({
  open,
  onOpenChange,
  categories,
  loading,
  canManage,
}: CategoriesDialogProps) {
  const { create, update, remove } = useCategoryMutations();
  const [editing, setEditing] = useState<Category | null>(null);
  const [toDelete, setToDelete] = useState<Category | null>(null);

  const { register, handleSubmit, reset, watch, setValue, formState } =
    useForm<CategoryFormValues>({
      resolver: zodResolver(categorySchema),
      defaultValues: EMPTY,
    });

  const saving = create.isPending || update.isPending;

  const onSubmit = handleSubmit(async (values) => {
    const payload = {
      name: values.name,
      description: values.description?.trim() || null,
      color: values.color?.trim() || null,
      is_active: values.is_active,
    };
    if (editing) {
      await update.mutateAsync({ id: editing.id, input: payload });
    } else {
      await create.mutateAsync(payload);
    }
    setEditing(null);
    reset(EMPTY);
  });

  function startEdit(category: Category) {
    setEditing(category);
    reset({
      name: category.name,
      description: category.description ?? "",
      color: category.color ?? "",
      is_active: category.is_active,
    });
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[92vh] max-w-xl overflow-y-auto rounded-2xl">
        <DialogHeader>
          <DialogTitle>Categorias</DialogTitle>
          <DialogDescription>Organize os produtos por categoria.</DialogDescription>
        </DialogHeader>

        {canManage ? (
          <form onSubmit={onSubmit} className="space-y-3 rounded-2xl border border-border/60 p-4">
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label>Nome</Label>
                <Input placeholder="Complementos" {...register("name")} />
                {formState.errors.name ? (
                  <p className="text-xs font-medium text-destructive">
                    {formState.errors.name.message}
                  </p>
                ) : null}
              </div>
              <div className="space-y-1.5">
                <Label>Cor (hex)</Label>
                <Input placeholder="#6D28D9" {...register("color")} />
              </div>
              <div className="space-y-1.5 sm:col-span-2">
                <Label>Descrição</Label>
                <Input placeholder="Opcional" {...register("description")} />
              </div>
            </div>

            <div className="flex items-center justify-between gap-3">
              <label className="flex items-center gap-2 text-sm text-muted-foreground">
                <Switch
                  checked={watch("is_active")}
                  onCheckedChange={(checked) => setValue("is_active", checked)}
                />
                Categoria ativa
              </label>
              <div className="flex gap-2">
                {editing ? (
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                      setEditing(null);
                      reset(EMPTY);
                    }}
                  >
                    <X className="h-4 w-4" /> Cancelar
                  </Button>
                ) : null}
                <Button type="submit" size="sm" disabled={saving}>
                  {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
                  {editing ? "Salvar" : "Adicionar"}
                </Button>
              </div>
            </div>
          </form>
        ) : null}

        <div className="space-y-2">
          {loading ? (
            Array.from({ length: 4 }).map((_, index) => (
              <Skeleton key={index} className="h-12 w-full rounded-xl" />
            ))
          ) : categories.length === 0 ? (
            <p className="py-6 text-center text-sm text-muted-foreground">
              Nenhuma categoria cadastrada.
            </p>
          ) : (
            categories.map((category) => (
              <div
                key={category.id}
                className="flex items-center justify-between gap-3 rounded-xl border border-border/60 bg-card/60 px-3 py-2.5"
              >
                <div className="flex min-w-0 items-center gap-3">
                  <span
                    className="h-3 w-3 shrink-0 rounded-full border border-border/60"
                    style={{ backgroundColor: category.color ?? "transparent" }}
                  />
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium">
                      {category.name}
                      {category.is_active ? "" : " (inativa)"}
                    </p>
                    {category.description ? (
                      <p className="truncate text-xs text-muted-foreground">{category.description}</p>
                    ) : null}
                  </div>
                </div>
                {canManage ? (
                  <div className="flex shrink-0 gap-1">
                    <Button variant="ghost" size="icon" onClick={() => startEdit(category)}>
                      <Pencil className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="text-destructive hover:text-destructive"
                      onClick={() => setToDelete(category)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                ) : null}
              </div>
            ))
          )}
        </div>

        <ConfirmDeleteDialog
          open={Boolean(toDelete)}
          onOpenChange={(value) => !value && setToDelete(null)}
          title="Excluir categoria?"
          description={`A categoria "${toDelete?.name ?? ""}" será removida e os produtos ficarão sem categoria.`}
          loading={remove.isPending}
          onConfirm={async () => {
            if (!toDelete) return;
            await remove.mutateAsync(toDelete.id);
            setToDelete(null);
          }}
        />
      </DialogContent>
    </Dialog>
  );
}
