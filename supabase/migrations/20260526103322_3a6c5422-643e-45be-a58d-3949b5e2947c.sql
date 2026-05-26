-- Prevent non-admin users from self-approving drivers or bakeries, including on insert.
CREATE OR REPLACE FUNCTION public.prevent_driver_self_approval()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  IF COALESCE(auth.role(), '') = 'service_role' OR public.is_admin() THEN
    RETURN NEW;
  END IF;

  IF TG_OP = 'INSERT' THEN
    NEW.approved := false;
  ELSIF NEW.approved IS DISTINCT FROM OLD.approved THEN
    RAISE EXCEPTION 'Only admins can change driver approval status';
  END IF;

  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.prevent_bakery_self_approval()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  IF COALESCE(auth.role(), '') = 'service_role' OR public.is_admin() THEN
    RETURN NEW;
  END IF;

  IF TG_OP = 'INSERT' THEN
    NEW.approved := false;
  ELSIF NEW.approved IS DISTINCT FROM OLD.approved THEN
    RAISE EXCEPTION 'Only admins can change bakery approval status';
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS prevent_driver_self_approval_trigger ON public.drivers;
CREATE TRIGGER prevent_driver_self_approval_trigger
BEFORE INSERT OR UPDATE ON public.drivers
FOR EACH ROW
EXECUTE FUNCTION public.prevent_driver_self_approval();

DROP TRIGGER IF EXISTS prevent_bakery_self_approval_trigger ON public.bakeries;
CREATE TRIGGER prevent_bakery_self_approval_trigger
BEFORE INSERT OR UPDATE ON public.bakeries
FOR EACH ROW
EXECUTE FUNCTION public.prevent_bakery_self_approval();

-- Restrict delivery-code creation to the driver assigned to the referenced order.
DROP POLICY IF EXISTS "Drivers can insert delivery codes" ON public.delivery_codes;
CREATE POLICY "Drivers can insert delivery codes"
ON public.delivery_codes
FOR INSERT
WITH CHECK (
  auth.uid() IS NOT NULL
  AND EXISTS (
    SELECT 1
    FROM public.profiles p
    JOIN public.drivers d ON p.phone = d.phone
    JOIN public.orders o ON o.id = delivery_codes.order_id
    WHERE p.id = auth.uid()
      AND p.user_type = 'driver'
      AND d.id = delivery_codes.driver_id
      AND o.driver_id = d.id
      AND o.customer_phone = delivery_codes.customer_phone
  )
);

-- Fix storage path checks to use the storage object's path, not the bakery display name.
DROP POLICY IF EXISTS "Bakery owners and admins can upload photos" ON storage.objects;
DROP POLICY IF EXISTS "Bakery owners and admins can update photos" ON storage.objects;
DROP POLICY IF EXISTS "Bakery owners and admins can delete photos" ON storage.objects;

CREATE POLICY "Bakery owners and admins can upload photos"
ON storage.objects
FOR INSERT
WITH CHECK (
  bucket_id = 'photos'
  AND (
    public.is_admin()
    OR EXISTS (
      SELECT 1
      FROM public.bakeries b
      WHERE b.owner_user_id = auth.uid()
        AND (storage.foldername(storage.objects.name))[1] = ANY (ARRAY['bakeries', 'breads'])
        AND (storage.foldername(storage.objects.name))[2] = b.id::text
    )
  )
);

CREATE POLICY "Bakery owners and admins can update photos"
ON storage.objects
FOR UPDATE
USING (
  bucket_id = 'photos'
  AND (
    public.is_admin()
    OR EXISTS (
      SELECT 1
      FROM public.bakeries b
      WHERE b.owner_user_id = auth.uid()
        AND (storage.foldername(storage.objects.name))[1] = ANY (ARRAY['bakeries', 'breads'])
        AND (storage.foldername(storage.objects.name))[2] = b.id::text
    )
  )
)
WITH CHECK (
  bucket_id = 'photos'
  AND (
    public.is_admin()
    OR EXISTS (
      SELECT 1
      FROM public.bakeries b
      WHERE b.owner_user_id = auth.uid()
        AND (storage.foldername(storage.objects.name))[1] = ANY (ARRAY['bakeries', 'breads'])
        AND (storage.foldername(storage.objects.name))[2] = b.id::text
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
      SELECT 1
      FROM public.bakeries b
      WHERE b.owner_user_id = auth.uid()
        AND (storage.foldername(storage.objects.name))[1] = ANY (ARRAY['bakeries', 'breads'])
        AND (storage.foldername(storage.objects.name))[2] = b.id::text
    )
  )
);

-- Authorize private realtime channels for sensitive order/notification subscriptions.
ALTER TABLE realtime.messages ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can subscribe to their own app realtime channels" ON realtime.messages;
CREATE POLICY "Users can subscribe to their own app realtime channels"
ON realtime.messages
FOR SELECT
TO authenticated
USING (
  public.is_admin()
  OR realtime.topic() = ('customer-orders-changes:' || auth.uid()::text)
  OR realtime.topic() = ('cart-orders-changes:' || auth.uid()::text)
  OR realtime.topic() = ('notifications-realtime:' || auth.uid()::text)
  OR realtime.topic() = ('notif-count-main:' || auth.uid()::text)
  OR realtime.topic() = ('notif-count:' || auth.uid()::text)
  OR realtime.topic() = ('driver-orders-changes:' || auth.uid()::text)
);
