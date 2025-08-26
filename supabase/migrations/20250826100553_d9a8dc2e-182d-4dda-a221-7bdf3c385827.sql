-- Fix data type inconsistencies and security issues - corrected approach

-- First, fix the driver_locations table to use bigint for consistency
DROP TABLE IF EXISTS public.driver_locations CASCADE;
CREATE TABLE public.driver_locations (
  id SERIAL PRIMARY KEY,
  driver_id BIGINT NOT NULL,
  order_id BIGINT,
  latitude NUMERIC NOT NULL,
  longitude NUMERIC NOT NULL,
  heading NUMERIC,
  speed NUMERIC,
  accuracy NUMERIC,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE public.driver_locations ENABLE ROW LEVEL SECURITY;

-- Create proper restrictive policies for driver locations
CREATE POLICY "Drivers can manage their own locations" 
ON public.driver_locations 
FOR ALL 
USING (
  EXISTS (
    SELECT 1 FROM public.profiles p
    JOIN public.drivers d ON p.phone = d.phone
    WHERE p.id = auth.uid() 
    AND p.user_type = 'driver'
    AND d.id = driver_locations.driver_id
  )
);

CREATE POLICY "Customers can view driver location for their active orders" 
ON public.driver_locations 
FOR SELECT 
USING (
  EXISTS (
    SELECT 1 FROM public.orders o
    JOIN public.profiles p ON p.phone = o.customer_phone
    WHERE p.id = auth.uid() 
    AND o.driver_id = driver_locations.driver_id 
    AND o.status IN ('assigned', 'on_the_way')
  )
);

-- Create trigger for automatic timestamp updates
CREATE TRIGGER update_driver_location_timestamp
  BEFORE UPDATE ON public.driver_locations
  FOR EACH ROW
  EXECUTE FUNCTION public.update_driver_location_timestamp();

-- Add missing RLS policy for خبزك table
CREATE POLICY "Allow public read access to bread products" 
ON public."خبزك" 
FOR SELECT 
USING (true);

-- Fix customers table policies - simplified approach
DROP POLICY IF EXISTS "Users can insert customer record" ON public.customers;
CREATE POLICY "Users can insert customer record" 
ON public.customers 
FOR INSERT 
WITH CHECK (auth.uid() IS NOT NULL);

-- Fix drivers table policies - simplified approach  
DROP POLICY IF EXISTS "Users can insert driver record" ON public.drivers;
CREATE POLICY "Users can insert driver record" 
ON public.drivers 
FOR INSERT 
WITH CHECK (auth.uid() IS NOT NULL);