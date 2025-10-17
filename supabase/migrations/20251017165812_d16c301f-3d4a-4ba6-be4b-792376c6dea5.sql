-- Allow customers to confirm receipt of their own orders
DROP POLICY IF EXISTS "Customers can confirm receipt" ON public.orders;

CREATE POLICY "Customers can confirm receipt"
ON public.orders
FOR UPDATE
USING (
  auth.uid() IS NOT NULL
  AND EXISTS (
    SELECT 1 FROM public.profiles p
    WHERE p.id = auth.uid() AND p.phone = orders.customer_phone
  )
  AND status IN ('on_the_way','in-transit')
)
WITH CHECK (
  status = 'received'
  AND EXISTS (
    SELECT 1 FROM public.profiles p
    WHERE p.id = auth.uid() AND p.phone = orders.customer_phone
  )
);