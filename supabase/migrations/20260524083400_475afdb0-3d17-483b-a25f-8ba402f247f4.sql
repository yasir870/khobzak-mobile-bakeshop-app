
-- 1) Bakeries: remove anon visibility of email/phone columns
REVOKE SELECT ON public.bakeries FROM anon;
GRANT SELECT (id, name, logo_url, address, approved, created_at, updated_at, owner_user_id)
  ON public.bakeries TO anon;
-- authenticated keeps full SELECT (still gated by RLS for owner/admin full view + public approved rows)
GRANT SELECT ON public.bakeries TO authenticated;

-- 2) Drivers update: add WITH CHECK preventing phone reassignment
DROP POLICY IF EXISTS "Users can update own driver record" ON public.drivers;
CREATE POLICY "Users can update own driver record"
ON public.drivers
FOR UPDATE
USING (
  auth.uid() IS NOT NULL AND EXISTS (
    SELECT 1 FROM public.profiles
    WHERE profiles.id = auth.uid() AND profiles.phone = drivers.phone
  )
)
WITH CHECK (
  auth.uid() IS NOT NULL AND EXISTS (
    SELECT 1 FROM public.profiles
    WHERE profiles.id = auth.uid() AND profiles.phone = drivers.phone
  )
);

-- 3) Notifications: drivers can only insert for customers of their assigned orders
DROP POLICY IF EXISTS "Drivers can insert notifications" ON public.notifications;
CREATE POLICY "Drivers can insert notifications"
ON public.notifications
FOR INSERT
WITH CHECK (
  auth.uid() IS NOT NULL AND EXISTS (
    SELECT 1
    FROM public.profiles p
    JOIN public.drivers d ON p.phone = d.phone
    JOIN public.orders o ON o.driver_id = d.id
    WHERE p.id = auth.uid()
      AND p.user_type = 'driver'
      AND o.customer_phone = notifications.customer_phone
  )
);

-- 4) Revoke execute on sensitive helper functions from anon/authenticated
REVOKE EXECUTE ON FUNCTION public.create_auth_user_for_existing(text, text, text, text, text) FROM anon, authenticated, public;
REVOKE EXECUTE ON FUNCTION public.get_driver_id_from_auth() FROM anon;
