
-- 1. Bakeries: restrict public exposure of email/phone
DROP POLICY IF EXISTS "Public can view approved bakeries" ON public.bakeries;

CREATE POLICY "Owner or admin can view full bakery"
ON public.bakeries FOR SELECT
USING (owner_user_id = auth.uid() OR is_admin());

CREATE OR REPLACE VIEW public.bakeries_public
WITH (security_invoker = true) AS
SELECT id, name, logo_url, address, approved, created_at
FROM public.bakeries
WHERE approved = true;

GRANT SELECT ON public.bakeries_public TO anon, authenticated;

-- Allow anon/auth to read approved rows but only safe columns via direct table too
CREATE POLICY "Public can view approved bakeries safe"
ON public.bakeries FOR SELECT
USING (approved = true);

REVOKE SELECT ON public.bakeries FROM anon, authenticated;
GRANT SELECT (id, name, logo_url, address, approved, created_at, updated_at, owner_user_id) ON public.bakeries TO anon, authenticated;
GRANT SELECT (email, phone) ON public.bakeries TO authenticated;

-- 2. Drivers: prevent self-approval via trigger
CREATE OR REPLACE FUNCTION public.prevent_driver_self_approval()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.approved IS DISTINCT FROM OLD.approved AND NOT public.is_admin() THEN
    RAISE EXCEPTION 'Only admins can change driver approval status';
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_prevent_driver_self_approval ON public.drivers;
CREATE TRIGGER trg_prevent_driver_self_approval
BEFORE UPDATE ON public.drivers
FOR EACH ROW EXECUTE FUNCTION public.prevent_driver_self_approval();

-- Same protection for bakeries approved field
CREATE OR REPLACE FUNCTION public.prevent_bakery_self_approval()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.approved IS DISTINCT FROM OLD.approved AND NOT public.is_admin() THEN
    RAISE EXCEPTION 'Only admins can change bakery approval status';
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_prevent_bakery_self_approval ON public.bakeries;
CREATE TRIGGER trg_prevent_bakery_self_approval
BEFORE UPDATE ON public.bakeries
FOR EACH ROW EXECUTE FUNCTION public.prevent_bakery_self_approval();

-- 3. Orders: enforce drivers can only assign themselves when accepting
DROP POLICY IF EXISTS "Drivers can accept pending orders" ON public.orders;

CREATE POLICY "Drivers can accept pending orders"
ON public.orders FOR UPDATE
USING (
  auth.uid() IS NOT NULL
  AND status = 'pending'
  AND EXISTS (
    SELECT 1 FROM profiles p JOIN drivers d ON p.phone = d.phone
    WHERE p.id = auth.uid() AND p.user_type = 'driver'
  )
)
WITH CHECK (
  auth.uid() IS NOT NULL
  AND (
    (status = 'rejected' AND driver_id IS NULL)
    OR (
      status IN ('accepted','assigned')
      AND driver_id IS NOT NULL
      AND EXISTS (
        SELECT 1 FROM profiles p JOIN drivers d ON p.phone = d.phone
        WHERE p.id = auth.uid() AND p.user_type = 'driver' AND d.id = orders.driver_id
      )
    )
  )
);

-- 4. Storage: fix path-based ownership check
DROP POLICY IF EXISTS "Bakery owners and admins can upload photos" ON storage.objects;
DROP POLICY IF EXISTS "Bakery owners and admins can update photos" ON storage.objects;
DROP POLICY IF EXISTS "Bakery owners and admins can delete photos" ON storage.objects;

CREATE POLICY "Bakery owners and admins can upload photos"
ON storage.objects FOR INSERT
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
ON storage.objects FOR UPDATE
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
ON storage.objects FOR DELETE
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
