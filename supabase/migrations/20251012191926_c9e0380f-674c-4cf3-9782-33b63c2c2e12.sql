-- Allow drivers to update pending orders (to accept or reject them)
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
);