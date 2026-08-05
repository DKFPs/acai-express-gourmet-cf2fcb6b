import { useEffect, useMemo, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Loader2 } from "lucide-react";

import { ImageUpload } from "@/components/products/image-upload";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { useProductMutations } from "@/hooks/use-products";
import { calcMargin, formatPercent } from "@/lib/format";
import {
  productSchema,
  type ProductFormOutput,
  type ProductFormValues,
} from "@/lib/validations/product";
import type { Category, Product, ProductInput } from "@/types/product";

interface ProductFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  product: Product | null;
  categories: Category[];
}

const EMPTY: ProductFormValues = {
  name: "",
  category_id: "",
  internal_code: "",
  description: "",
  image_url: null,
  price: "",
  promo_price: "",
  cost: "",
  status: "ativo",
  stock_quantity: "0",
  min_stock: "0",
};

const toInput = (value: number | string | null) =>
  value === null || value === undefined ? "" : String(value).replace(".", ",");

const toNumber = (value: string) => {
  const parsed = Number(String(value).replace(/\./g, "").replace(",", "."));
  return Number.isFinite(parsed) ? parsed : 0;
};

export function ProductFormDialog({
  open,
  onOpenChange,
  product,
  categories,
}: ProductFormDialogProps) {
  const { create, update } = useProductMutations();
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);

  const form = useForm<ProductFormValues, unknown, ProductFormOutput>({
    resolver: zodResolver(productSchema),
    defaultValues: EMPTY,
    mode: "onBlur",
  });

  const { register, handleSubmit, reset, watch, setValue, formState } = form;
  const errors = formState.errors;

  useEffect(() => {
    if (!open) return;
    if (product) {
      reset({
        name: product.name,
        category_id: product.category_id ?? "",
        internal_code: product.internal_code ?? "",
        description: product.description ?? "",
        image_url: product.image_url,
        price: toInput(product.price),
        promo_price: toInput(product.promo_price),
        cost: toInput(product.cost),
        status: product.status,
        stock_quantity: toInput(product.stock_quantity),
        min_stock: toInput(product.min_stock),
      });
      setPreviewUrl(product.imageUrl);
    } else {
      reset(EMPTY);
      setPreviewUrl(null);
    }
  }, [open, product, reset]);

  const price = watch("price");
  const promo = watch("promo_price");
  const cost = watch("cost");
  const imagePath = watch("image_url") ?? null;

  const margin = useMemo(
    () => calcMargin(toNumber(price), toNumber(cost), promo ? toNumber(promo) : null),
    [price, promo, cost],
  );

  const saving = create.isPending || update.isPending;

  const onSubmit = handleSubmit(async (values) => {
    const input: ProductInput = {
      name: values.name,
      category_id: values.category_id || null,
      internal_code: values.internal_code?.trim() || null,
      description: values.description?.trim() || null,
      image_url: values.image_url ?? null,
      price: values.price,
      promo_price: values.promo_price,
      cost: values.cost,
      status: values.status,
      stock_quantity: values.stock_quantity,
      min_stock: values.min_stock,
    };

    if (product) {
      await update.mutateAsync({ id: product.id, input });
    } else {
      await create.mutateAsync(input);
    }
    onOpenChange(false);
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[92vh] max-w-2xl overflow-y-auto rounded-2xl">
        <DialogHeader>
          <DialogTitle>{product ? "Editar produto" : "Novo produto"}</DialogTitle>
          <DialogDescription>
            Preencha as informações do produto. A margem de lucro é calculada automaticamente.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={onSubmit} className="space-y-5">
          <ImageUpload
            value={imagePath}
            previewUrl={previewUrl}
            disabled={saving}
            onChange={(path, url) => {
              setValue("image_url", path, { shouldDirty: true });
              setPreviewUrl(url);
            }}
          />

          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Nome" error={errors.name?.message} className="sm:col-span-2">
              <Input placeholder="Açaí 500ml" {...register("name")} />
            </Field>

            <Field label="Categoria" error={errors.category_id?.message}>
              <Select
                value={watch("category_id")}
                onValueChange={(value) => setValue("category_id", value, { shouldValidate: true })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Selecione" />
                </SelectTrigger>
                <SelectContent>
                  {categories.map((category) => (
                    <SelectItem key={category.id} value={category.id}>
                      {category.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </Field>

            <Field label="Código interno" error={errors.internal_code?.message}>
              <Input placeholder="ACAI500" {...register("internal_code")} />
            </Field>

            <Field label="Preço (R$)" error={errors.price?.message}>
              <Input inputMode="decimal" placeholder="19,90" {...register("price")} />
            </Field>

            <Field label="Preço promocional (R$)" error={errors.promo_price?.message}>
              <Input inputMode="decimal" placeholder="Opcional" {...register("promo_price")} />
            </Field>

            <Field label="Custo (R$)" error={errors.cost?.message}>
              <Input inputMode="decimal" placeholder="8,40" {...register("cost")} />
            </Field>

            <div className="space-y-1.5">
              <Label>Margem de lucro</Label>
              <div className="flex h-9 items-center rounded-md border border-gold/30 bg-gold/10 px-3 text-sm font-semibold text-gold">
                {formatPercent(margin)}
              </div>
            </div>

            <Field label="Estoque atual" error={errors.stock_quantity?.message}>
              <Input inputMode="decimal" placeholder="0" {...register("stock_quantity")} />
            </Field>

            <Field label="Estoque mínimo" error={errors.min_stock?.message}>
              <Input inputMode="decimal" placeholder="0" {...register("min_stock")} />
            </Field>

            <Field label="Status" error={errors.status?.message}>
              <Select
                value={watch("status")}
                onValueChange={(value) =>
                  setValue("status", value as ProductFormValues["status"], { shouldValidate: true })
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ativo">Ativo</SelectItem>
                  <SelectItem value="inativo">Inativo</SelectItem>
                </SelectContent>
              </Select>
            </Field>

            <Field label="Descrição" error={errors.description?.message} className="sm:col-span-2">
              <Textarea rows={3} placeholder="Detalhes do produto" {...register("description")} />
            </Field>
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="ghost"
              onClick={() => onOpenChange(false)}
              disabled={saving}
            >
              Cancelar
            </Button>
            <Button type="submit" disabled={saving}>
              {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
              {product ? "Salvar alterações" : "Criar produto"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function Field({
  label,
  error,
  className,
  children,
}: {
  label: string;
  error?: string | undefined;
  className?: string | undefined;
  children: React.ReactNode;
}) {
  return (
    <div className={`space-y-1.5 ${className ?? ""}`}>
      <Label>{label}</Label>
      {children}
      {error ? <p className="text-xs font-medium text-destructive">{error}</p> : null}
    </div>
  );
}
