CREATE TYPE public.product_status AS ENUM ('ativo','inativo');

CREATE TABLE public.categories (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid REFERENCES public.companies(id) ON DELETE CASCADE,
  name text NOT NULL,
  description text,
  color text,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.categories TO authenticated;
GRANT ALL ON public.categories TO service_role;
ALTER TABLE public.categories ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Autenticados veem categorias" ON public.categories
  FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admins gerenciam categorias" ON public.categories
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'administrador'))
  WITH CHECK (public.has_role(auth.uid(), 'administrador'));

CREATE TABLE public.products (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid REFERENCES public.companies(id) ON DELETE CASCADE,
  category_id uuid REFERENCES public.categories(id) ON DELETE SET NULL,
  name text NOT NULL,
  internal_code text,
  description text,
  image_url text,
  price numeric(12,2) NOT NULL DEFAULT 0,
  promo_price numeric(12,2),
  cost numeric(12,2) NOT NULL DEFAULT 0,
  margin_percent numeric(12,2) GENERATED ALWAYS AS (
    CASE WHEN COALESCE(promo_price, price) > 0
      THEN ROUND(((COALESCE(promo_price, price) - cost) / COALESCE(promo_price, price)) * 100, 2)
      ELSE 0 END
  ) STORED,
  status public.product_status NOT NULL DEFAULT 'ativo',
  stock_quantity numeric(12,3) NOT NULL DEFAULT 0,
  min_stock numeric(12,3) NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (company_id, internal_code)
);

CREATE INDEX products_category_id_idx ON public.products(category_id);
CREATE INDEX products_name_idx ON public.products(name);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.products TO authenticated;
GRANT ALL ON public.products TO service_role;
ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Autenticados veem produtos" ON public.products
  FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admins gerenciam produtos" ON public.products
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'administrador'))
  WITH CHECK (public.has_role(auth.uid(), 'administrador'));

CREATE TRIGGER set_categories_updated_at BEFORE UPDATE ON public.categories
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE TRIGGER set_products_updated_at BEFORE UPDATE ON public.products
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

INSERT INTO public.categories (company_id, name, description, color)
SELECT c.id, v.name, v.description, v.color
FROM (SELECT id FROM public.companies ORDER BY created_at LIMIT 1) c
RIGHT JOIN (VALUES
  ('Açaí','Copos e tigelas de açaí','#6D28D9'),
  ('Complementos','Adicionais e coberturas','#D4AF37'),
  ('Bebidas','Sucos, água e refrigerantes','#2A0B3D'),
  ('Embalagens','Copos, tampas e colheres','#94A3B8')
) AS v(name, description, color) ON true;

INSERT INTO public.products (company_id, category_id, name, internal_code, description, price, promo_price, cost, status, stock_quantity, min_stock)
SELECT cat.company_id, cat.id, v.name, v.code, v.description, v.price, v.promo, v.cost, 'ativo', v.stock, v.minstock
FROM (VALUES
  ('Açaí','Açaí 300ml','ACAI300','Copo de açaí tradicional 300ml',14.90,12.90,6.20,120,20),
  ('Açaí','Açaí 500ml','ACAI500','Copo de açaí tradicional 500ml',19.90,NULL,8.40,80,15),
  ('Complementos','Leite Ninho 50g','COMP-NINHO','Porção de leite em pó',3.50,NULL,1.20,60,10),
  ('Bebidas','Água Mineral 500ml','BEB-AGUA','Água sem gás',4.00,NULL,1.50,40,12),
  ('Embalagens','Copo 500ml','EMB-C500','Copo descartável com tampa',0.90,NULL,0.45,300,50)
) AS v(cat_name, name, code, description, price, promo, cost, stock, minstock)
JOIN public.categories cat ON cat.name = v.cat_name;