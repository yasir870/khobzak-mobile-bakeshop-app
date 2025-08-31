-- Fix remaining search path issue for update_driver_location_timestamp
CREATE OR REPLACE FUNCTION public.update_driver_location_timestamp()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path = 'public'
AS $function$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$function$