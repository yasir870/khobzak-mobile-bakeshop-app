
DROP POLICY IF EXISTS "Bakery owners and admins can upload photos" ON storage.objects;
DROP POLICY IF EXISTS "Bakery owners and admins can update photos" ON storage.objects;
DROP POLICY IF EXISTS "Bakery owners and admins can delete photos" ON storage.objects;

CREATE POLICY "Bakery owners and admins can upload photos"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (
  bucket_id = 'photos' AND (
    is_admin() OR EXISTS (
      SELECT 1 FROM public.bakeries b
      WHERE b.owner_user_id = auth.uid()
        AND (storage.foldername(name))[1] = ANY (ARRAY['bakeries','breads'])
        AND (storage.foldername(name))[2] = b.id::text
    )
  )
);

CREATE POLICY "Bakery owners and admins can update photos"
ON storage.objects FOR UPDATE TO authenticated
USING (
  bucket_id = 'photos' AND (
    is_admin() OR EXISTS (
      SELECT 1 FROM public.bakeries b
      WHERE b.owner_user_id = auth.uid()
        AND (storage.foldername(name))[1] = ANY (ARRAY['bakeries','breads'])
        AND (storage.foldername(name))[2] = b.id::text
    )
  )
);

CREATE POLICY "Bakery owners and admins can delete photos"
ON storage.objects FOR DELETE TO authenticated
USING (
  bucket_id = 'photos' AND (
    is_admin() OR EXISTS (
      SELECT 1 FROM public.bakeries b
      WHERE b.owner_user_id = auth.uid()
        AND (storage.foldername(name))[1] = ANY (ARRAY['bakeries','breads'])
        AND (storage.foldername(name))[2] = b.id::text
    )
  )
);
