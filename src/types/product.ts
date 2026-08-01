import type { Tables } from "@/integrations/supabase/types";

export type ProductRow = Tables<"products">;
export type Category = Tables<"categories">;

export type ProductStatus = "ativo" | "inativo";

export interface Product extends ProductRow {
  /** Categoria relacionada (join). */
  category: Pick<Category, "id" | "name" | "color"> | null;
  /** URL assinada da foto (bucket privado). */
  imageUrl: string | null;
}

export type StockFilter = "todos" | "baixo" | "sem";

export interface ProductFilters {
  search: string;
  categoryId: string; // "todas" | uuid
  status: ProductStatus | "todos";
  stock: StockFilter;
  page: number;
  pageSize: number;
}

export interface ProductInput {
  name: string;
  category_id: string | null;
  internal_code: string | null;
  description: string | null;
  image_url: string | null;
  price: number;
  promo_price: number | null;
  cost: number;
  status: ProductStatus;
  stock_quantity: number;
  min_stock: number;
}

export interface CategoryInput {
  name: string;
  description: string | null;
  color: string | null;
  is_active: boolean;
}
