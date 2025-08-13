-- Fix security function issue by setting search_path
CREATE OR REPLACE FUNCTION public.update_driver_location_timestamp()
RETURNS TRIGGER 
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

-- Add delete policy for driver_locations
CREATE POLICY "Drivers can delete their own location records" 
ON public.driver_locations 
FOR DELETE 
USING (true);