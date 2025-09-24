-- Drop the problematic policy first
DROP POLICY IF EXISTS "Drivers can accept unassigned orders" ON public.orders;

-- Create a simpler policy for drivers to accept orders
CREATE POLICY "Drivers can accept pending orders"
ON public.orders
FOR UPDATE
USING (
  auth.uid() IS NOT NULL 
  AND status = 'pending'
  AND EXISTS (
    SELECT 1 FROM profiles p
    JOIN drivers d ON p.phone = d.phone
    WHERE p.id = auth.uid() AND p.user_type = 'driver'
  )
);