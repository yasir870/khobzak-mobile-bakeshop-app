-- Keep public/customer bakery listings on the safe view only.
DROP POLICY IF EXISTS "Public can view approved bakeries safe" ON public.bakeries;

CREATE OR REPLACE VIEW public.bakeries_public AS
SELECT id, name, logo_url, address, approved, created_at
FROM public.bakeries
WHERE approved = true;

GRANT SELECT ON public.bakeries_public TO anon, authenticated;

-- Owners/admins still read the base bakery table through the owner/admin RLS policy.
REVOKE SELECT ON public.bakeries FROM anon;
GRANT SELECT ON public.bakeries TO authenticated;
GRANT ALL ON public.bakeries TO service_role;

-- Ensure non-admin drivers cannot self-approve, and keep only one active trigger.
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

DROP TRIGGER IF EXISTS trg_prevent_driver_self_approval ON public.drivers;
DROP TRIGGER IF EXISTS prevent_driver_self_approval_trigger ON public.drivers;
CREATE TRIGGER prevent_driver_self_approval_trigger
BEFORE INSERT OR UPDATE ON public.drivers
FOR EACH ROW
EXECUTE FUNCTION public.prevent_driver_self_approval();

-- Drivers may only create notifications for the exact active order assigned to them.
DROP POLICY IF EXISTS "Drivers can insert notifications" ON public.notifications;
CREATE POLICY "Drivers can insert notifications"
ON public.notifications
FOR INSERT
WITH CHECK (
  auth.uid() IS NOT NULL
  AND EXISTS (
    SELECT 1
    FROM public.profiles p
    JOIN public.drivers d ON p.phone = d.phone
    JOIN public.orders o ON o.driver_id = d.id
    WHERE p.id = auth.uid()
      AND p.user_type = 'driver'
      AND o.id = notifications.order_id
      AND o.customer_phone = notifications.customer_phone
      AND o.status IN ('accepted', 'assigned', 'on_the_way', 'in-transit')
  )
);