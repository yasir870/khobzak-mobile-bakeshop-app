-- Drop old policy if exists and create new one for drivers to view pending unassigned orders
DROP POLICY IF EXISTS "Drivers can view pending unassigned orders" ON public.orders;

CREATE POLICY "Drivers can view pending unassigned orders"
ON public.orders
FOR SELECT
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
);

-- Ensure realtime is configured for orders table
ALTER TABLE public.orders REPLICA IDENTITY FULL;

-- Add orders to supabase_realtime publication if not there
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables 
    WHERE pubname = 'supabase_realtime' 
    AND schemaname = 'public' 
    AND tablename = 'orders'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.orders;
  END IF;
END$$;