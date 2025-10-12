-- Fix driver update policy to allow reject action
DROP POLICY IF EXISTS "Drivers can update pending orders" ON public.orders;

CREATE POLICY "Drivers can update pending orders"
ON public.orders
FOR UPDATE
USING (
  (auth.uid() IS NOT NULL)
  AND EXISTS (
    SELECT 1
    FROM public.profiles p
    JOIN public.drivers d ON p.phone = d.phone
    WHERE p.id = auth.uid() AND p.user_type = 'driver'
  )
  AND status = 'pending'
  AND driver_id IS NULL
)
WITH CHECK (
  (auth.uid() IS NOT NULL)
  AND EXISTS (
    SELECT 1
    FROM public.profiles p
    JOIN public.drivers d ON p.phone = d.phone
    WHERE p.id = auth.uid() AND p.user_type = 'driver'
  )
  AND (
    -- Allow driver to reject (status changes to 'rejected' and driver_id stays NULL)
    (status = 'rejected' AND driver_id IS NULL)
    OR
    -- Allow driver to accept (status changes to 'accepted' and driver_id is set to their ID)
    (status = 'accepted' AND driver_id IS NOT NULL)
  )
);