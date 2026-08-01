CREATE POLICY "Autenticados veem imagens de produtos" ON storage.objects
  FOR SELECT TO authenticated USING (bucket_id = 'product-images');
CREATE POLICY "Admins enviam imagens de produtos" ON storage.objects
  FOR INSERT TO authenticated WITH CHECK (bucket_id = 'product-images' AND public.has_role(auth.uid(), 'administrador'));
CREATE POLICY "Admins atualizam imagens de produtos" ON storage.objects
  FOR UPDATE TO authenticated USING (bucket_id = 'product-images' AND public.has_role(auth.uid(), 'administrador'));
CREATE POLICY "Admins removem imagens de produtos" ON storage.objects
  FOR DELETE TO authenticated USING (bucket_id = 'product-images' AND public.has_role(auth.uid(), 'administrador'));