import { useState } from "react";
import { Pencil, Plus, Trash2 } from "lucide-react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";

import { ConfirmDeleteDialog } from "@/components/products/confirm-delete-dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { expenseCategorySchema, type ExpenseCategoryFormValues } from "@/lib/validations/finance";
import {
  FINANCIAL_TYPES,
  TYPE_LABEL,
  type ExpenseCategory,
  type ExpenseCategoryInput,
} from "@/types/finance";

interface CategoriesDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  categories: ExpenseCategory[];
  canManage: boolean;
  onCreate: (input: ExpenseCategoryInput) => void;
  onUpdate: (id: string, input: ExpenseCategoryInput) => void;
  onDelete: (id: string) => void;
}

const EMPTY: ExpenseCategoryFormValues = {
  name: "",
  type: "despesa",
  color: "#6D28D9",
  description: "",
  is_active: true,
};

export function CategoriesDialog({
  open,
  onOpenChange,
  categories,
  canManage,
  onCreate,
  onUpdate,
  onDelete,
}: CategoriesDialogProps) {
  const [editing, setEditing] = useState<ExpenseCategory | null>(null);
  const [toDelete, setToDelete] = useState<ExpenseCategory | null>(null);

  const form = useForm<ExpenseCategoryFormValues>({
    resolver: zodResolver(expenseCategorySchema),
    defaultValues: EMPTY,
  });

  const submit = form.handleSubmit((values) => {
    const input: ExpenseCategoryInput = {
      name: values.name,
      type: values.type,
      color: values.color ? values.color : null,
      description: values.description ? values.description : null,
      is_active: values.is_active,
    };
    if (editing) onUpdate(editing.id, input);
    else onCreate(input);
    setEditing(null);
    form.reset(EMPTY);
  });

  return (
    <Dialog
      open={open}
      onOpenChange={(value) => {
        if (!value) {
          setEditing(null);
          form.reset(EMPTY);
        }
        onOpenChange(value);
      }}
    >
      <DialogContent className="max-h-[90vh] overflow-y-auto rounded-2xl sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>Categorias financeiras</DialogTitle>
          <DialogDescription>
            Organize receitas, despesas, compras e investimentos por categoria.
          </DialogDescription>
        </DialogHeader>

        {canManage ? (
          <Form {...form}>
            <form
              onSubmit={submit}
              className="grid gap-3 rounded-2xl border border-border/60 p-4 sm:grid-cols-4"
            >
              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem className="sm:col-span-2">
                    <FormLabel>Nome</FormLabel>
                    <FormControl>
                      <Input placeholder="Ex.: Aluguel" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="type"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Tipo</FormLabel>
                    <Select value={field.value} onValueChange={field.onChange}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {FINANCIAL_TYPES.map((option) => (
                          <SelectItem key={option.value} value={option.value}>
                            {option.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="color"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Cor</FormLabel>
                    <FormControl>
                      <Input type="color" className="h-10 p-1" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <div className="flex gap-2 sm:col-span-4">
                <Button type="submit" size="sm">
                  <Plus className="mr-1 h-4 w-4" />
                  {editing ? "Salvar categoria" : "Adicionar categoria"}
                </Button>
                {editing ? (
                  <Button
                    type="button"
                    size="sm"
                    variant="ghost"
                    onClick={() => {
                      setEditing(null);
                      form.reset(EMPTY);
                    }}
                  >
                    Cancelar edição
                  </Button>
                ) : null}
              </div>
            </form>
          </Form>
        ) : null}

        <div className="space-y-2">
          {categories.map((category) => (
            <div
              key={category.id}
              className="flex items-center justify-between gap-3 rounded-xl border border-border/60 px-3 py-2"
            >
              <div className="flex items-center gap-3">
                <span
                  className="h-3 w-3 rounded-full"
                  style={{ backgroundColor: category.color ?? "#6D28D9" }}
                />
                <div>
                  <p className="text-sm font-medium">{category.name}</p>
                  <p className="text-xs text-muted-foreground">{TYPE_LABEL[category.type]}</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                {!category.is_active ? <Badge variant="outline">Inativa</Badge> : null}
                {canManage ? (
                  <>
                    <Button
                      size="icon"
                      variant="ghost"
                      onClick={() => {
                        setEditing(category);
                        form.reset({
                          name: category.name,
                          type: category.type,
                          color: category.color ?? "#6D28D9",
                          description: category.description ?? "",
                          is_active: category.is_active,
                        });
                      }}
                    >
                      <Pencil className="h-4 w-4" />
                    </Button>
                    <Button size="icon" variant="ghost" onClick={() => setToDelete(category)}>
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  </>
                ) : null}
              </div>
            </div>
          ))}
          {categories.length === 0 ? (
            <p className="py-6 text-center text-sm text-muted-foreground">
              Nenhuma categoria cadastrada.
            </p>
          ) : null}
        </div>

        <ConfirmDeleteDialog
          open={Boolean(toDelete)}
          onOpenChange={(value) => !value && setToDelete(null)}
          title="Excluir categoria"
          description={`Tem certeza que deseja excluir "${toDelete?.name ?? ""}"? Esta ação não pode ser desfeita.`}
          onConfirm={() => {
            if (toDelete) onDelete(toDelete.id);
            setToDelete(null);
          }}
        />
      </DialogContent>
    </Dialog>
  );
}
