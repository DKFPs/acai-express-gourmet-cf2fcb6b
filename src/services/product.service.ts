import { supabase } from "@/integrations/supabase/client";
import type {
  Category,
  CategoryInput,
  Product,
  ProductFilters,
  ProductInput,
  ProductRow,
} from "@/types/product";

const BUCKET = "product-images";

const PRODUCT_SELECT = "*, category:categories(id, name, color)";

export interface ProductListResult {
  items: Product[];
  total: number;
}

type RawProduct = ProductRow & { category: Pick<Category, "id" | "name" | "color"> | null };

async function withSignedUrls(rows: RawProduct[]): Promise<Product[]> {
  const paths = rows.map((row) => row.image_url).filter((path): path is string => Boolean(path));
  const map = new Map<string, string>();

  if (paths.length > 0) {
    const { data } = await supabase.storage.from(BUCKET).createSignedUrls(paths, 60 * 60);
    for (const item of data ?? []) {
      if (item.path && item.signedUrl) map.set(item.path, item.signedUrl);
    }
  }

  return rows.map((row) => ({
    ...row,
    imageUrl: row.image_url ? (map.get(row.image_url) ?? null) : null,
  }));
}

export const productService = {
  async list(filters: ProductFilters): Promise<ProductListResult> {
    const from = (filters.page - 1) * filters.pageSize;
    const to = from + filters.pageSize - 1;

    let query = supabase
      .from("products")
      .select(PRODUCT_SELECT, { count: "exact" })
      .order("created_at", { ascending: false })
      .range(from, to);

    const search = filters.search.trim();
    if (search) {
      const escaped = search.replace(/[%,()]/g, " ");
      query = query.or(`name.ilike.%${escaped}%,internal_code.ilike.%${escaped}%`);
    }
    if (filters.categoryId !== "todas") query = query.eq("category_id", filters.categoryId);
    if (filters.status !== "todos") query = query.eq("status", filters.status);
    if (filters.stock === "sem") query = query.lte("stock_quantity", 0);

    const { data, error, count } = await query;
    if (error) throw error;

    let rows = (data ?? []) as unknown as RawProduct[];
    if (filters.stock === "baixo") {
      rows = rows.filter((row) => Number(row.stock_quantity) <= Number(row.min_stock));
    }

    return { items: await withSignedUrls(rows), total: count ?? 0 };
  },

  async create(input: ProductInput, companyId: string | null) {
    const { error } = await supabase.from("products").insert({ ...input, ...(companyId ? { company_id: companyId } : {}) });
    if (error) throw error;
  },

  async update(id: string, input: ProductInput) {
    const { error } = await supabase.from("products").update(input).eq("id", id);
    if (error) throw error;
  },

  async remove(product: Pick<ProductRow, "id" | "image_url">) {
    const { error } = await supabase.from("products").delete().eq("id", product.id);
    if (error) throw error;
    if (product.image_url) {
      await supabase.storage.from(BUCKET).remove([product.image_url]);
    }
  },

  async uploadImage(file: File): Promise<string> {
    const { data: userData } = await supabase.auth.getUser();
    const userId = userData.user?.id;
    if (!userId) throw new Error("Sessão expirada. Faça login novamente.");

    const { data: profile, error: profileError } = await supabase
      .from("profiles")
      .select("company_id")
      .eq("id", userId)
      .maybeSingle();
    if (profileError) throw profileError;
    if (!profile?.company_id) throw new Error("Empresa não identificada para o upload.");

    const extension = file.name.split(".").pop()?.toLowerCase() || "jpg";
    const path = `${profile.company_id}/${crypto.randomUUID()}.${extension}`;
    const { error } = await supabase.storage.from(BUCKET).upload(path, file, {
      cacheControl: "3600",
      upsert: false,
    });
    if (error) throw error;
    return path;
  },

  async signedUrl(path: string) {
    const { data } = await supabase.storage.from(BUCKET).createSignedUrl(path, 60 * 60);
    return data?.signedUrl ?? null;
  },
};

export const categoryService = {
  async list(): Promise<Category[]> {
    const { data, error } = await supabase
      .from("categories")
      .select("*")
      .order("name", { ascending: true });
    if (error) throw error;
    return data ?? [];
  },

  async create(input: CategoryInput, companyId: string | null) {
    const { error } = await supabase.from("categories").insert({ ...input, ...(companyId ? { company_id: companyId } : {}) });
    if (error) throw error;
  },

  async update(id: string, input: Partial<CategoryInput>) {
    const { error } = await supabase.from("categories").update(input).eq("id", id);
    if (error) throw error;
  },

  async remove(id: string) {
    const { error } = await supabase.from("categories").delete().eq("id", id);
    if (error) throw error;
  },
};
