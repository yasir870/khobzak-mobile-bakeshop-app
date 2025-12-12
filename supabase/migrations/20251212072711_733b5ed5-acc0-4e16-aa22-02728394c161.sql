-- Update RLS policy to allow customers to view driver location for accepted/on_the_way orders
DROP POLICY IF EXISTS "Customers can view driver location for their active orders" ON public.driver_locations;

CREATE POLICY "Customers can view driver location for their active orders" 
ON public.driver_locations 
FOR SELECT 
USING (
  EXISTS (
    SELECT 1 FROM orders o
    JOIN profiles p ON p.phone = o.customer_phone
    WHERE p.id = auth.uid() 
    AND o.driver_id = driver_locations.driver_id 
    AND o.status IN ('accepted', 'assigned', 'on_the_way', 'in-transit')
  )
);