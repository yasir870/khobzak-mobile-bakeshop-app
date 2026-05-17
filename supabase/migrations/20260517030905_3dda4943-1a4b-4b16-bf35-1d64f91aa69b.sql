
-- 1. Drop plaintext password storage
DROP TABLE IF EXISTS public.temp_auth_users;
ALTER TABLE public.test_credentials DROP COLUMN IF EXISTS password;

-- 2. Tighten drivers INSERT policy: phone must match caller's profile
DROP POLICY IF EXISTS "Users can insert driver record" ON public.drivers;
CREATE POLICY "Users can insert driver record"
ON public.drivers
FOR INSERT
WITH CHECK (
  auth.uid() IS NOT NULL
  AND EXISTS (
    SELECT 1 FROM public.profiles p
    WHERE p.id = auth.uid() AND p.phone = drivers.phone
  )
);

-- 3. Tighten customers INSERT policy: phone must match caller's profile
DROP POLICY IF EXISTS "Users can insert customer record" ON public.customers;
CREATE POLICY "Users can insert customer record"
ON public.customers
FOR INSERT
WITH CHECK (
  auth.uid() IS NOT NULL
  AND EXISTS (
    SELECT 1 FROM public.profiles p
    WHERE p.id = auth.uid() AND p.phone = customers.phone
  )
);

-- 4. Tighten storage photos UPDATE/DELETE to bakery ownership of path
DROP POLICY IF EXISTS "Bakery owners and admins can update photos" ON storage.objects;
DROP POLICY IF EXISTS "Bakery owners and admins can delete photos" ON storage.objects;

CREATE POLICY "Bakery owners and admins can update photos"
ON storage.objects
FOR UPDATE
USING (
  bucket_id = 'photos'
  AND (
    public.is_admin()
    OR EXISTS (
      SELECT 1 FROM public.bakeries b
      WHERE b.owner_user_id = auth.uid()
        AND (storage.foldername(name))[1] IN ('bakeries','breads')
        AND (storage.foldername(name))[2] = b.id::text
    )
  )
);

CREATE POLICY "Bakery owners and admins can delete photos"
ON storage.objects
FOR DELETE
USING (
  bucket_id = 'photos'
  AND (
    public.is_admin()
    OR EXISTS (
      SELECT 1 FROM public.bakeries b
      WHERE b.owner_user_id = auth.uid()
        AND (storage.foldername(name))[1] IN ('bakeries','breads')
        AND (storage.foldername(name))[2] = b.id::text
    )
  )
);

-- Also restrict INSERT to bakery's own folder
DROP POLICY IF EXISTS "Bakery owners and admins can upload photos" ON storage.objects;
CREATE POLICY "Bakery owners and admins can upload photos"
ON storage.objects
FOR INSERT
WITH CHECK (
  bucket_id = 'photos'
  AND (
    public.is_admin()
    OR EXISTS (
      SELECT 1 FROM public.bakeries b
      WHERE b.owner_user_id = auth.uid()
        AND (storage.foldername(name))[1] IN ('bakeries','breads')
        AND (storage.foldername(name))[2] = b.id::text
    )
  )
);

-- 5. Fix function search_path
CREATE OR REPLACE FUNCTION public.touch_updated_at()
RETURNS trigger
LANGUAGE plpgsql
SET search_path TO 'public'
AS $function$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$function$;
