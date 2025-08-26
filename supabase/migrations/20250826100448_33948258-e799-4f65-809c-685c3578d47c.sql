-- Fix security issues with driver locations and missing RLS policies

-- First, fix the overly permissive driver location policies
DROP POLICY IF EXISTS "Allow location management" ON public.driver_locations;
DROP POLICY IF EXISTS "Allow location updates" ON public.driver_locations;

-- Create proper restrictive policies for driver locations
CREATE POLICY "Drivers can view and update their own location" 
ON public.driver_locations 
FOR ALL 
USING (auth.uid() = driver_id);

CREATE POLICY "Customers can view driver location for their active orders" 
ON public.driver_locations 
FOR SELECT 
USING (
  EXISTS (
    SELECT 1 FROM public.orders 
    WHERE orders.driver_id = driver_locations.driver_id 
    AND orders.customer_id = auth.uid() 
    AND orders.status IN ('assigned', 'on_the_way')
  )
);

-- Fix function search paths
DROP FUNCTION IF EXISTS public.handle_new_user();
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER 
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, name, phone, user_type)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'name', ''),
    COALESCE(NEW.raw_user_meta_data->>'phone', ''),
    COALESCE(NEW.raw_user_meta_data->>'user_type', 'customer')
  );
  RETURN NEW;
END;
$$;

DROP FUNCTION IF EXISTS public.update_driver_location_timestamp();
CREATE OR REPLACE FUNCTION public.update_driver_location_timestamp()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;

DROP FUNCTION IF EXISTS public.is_admin();
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Add your admin logic here
  RETURN FALSE;
END;
$$;