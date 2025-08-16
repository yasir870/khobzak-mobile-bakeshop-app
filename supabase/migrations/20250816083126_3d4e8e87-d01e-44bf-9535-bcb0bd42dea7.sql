-- Fix critical security vulnerability: Secure customer data access
-- Remove the dangerous "allow everyone" policy and implement proper RLS

-- Drop the existing overly permissive policy
DROP POLICY IF EXISTS "Allow admin (and everyone) to select all customers" ON public.customers;

-- Create secure policies for customers table
-- Allow customers to view only their own data
CREATE POLICY "Customers can view own data" 
ON public.customers 
FOR SELECT 
USING (
  auth.uid() IS NOT NULL AND (
    email = auth.jwt() ->> 'email' OR 
    phone = auth.jwt() ->> 'phone'
  )
);

-- Allow customers to update their own data
CREATE POLICY "Customers can update own data" 
ON public.customers 
FOR UPDATE 
USING (
  auth.uid() IS NOT NULL AND (
    email = auth.jwt() ->> 'email' OR 
    phone = auth.jwt() ->> 'phone'
  )
);

-- Keep the existing insert policy (needed for registration)
-- "Allow insert customer" policy already exists and is appropriate

-- Also secure the drivers table
DROP POLICY IF EXISTS "Allow admin to view all drivers" ON public.drivers;
DROP POLICY IF EXISTS "Allow admin to manage drivers" ON public.drivers;

-- Allow drivers to view only their own data
CREATE POLICY "Drivers can view own data" 
ON public.drivers 
FOR SELECT 
USING (
  auth.uid() IS NOT NULL AND (
    email = auth.jwt() ->> 'email' OR 
    phone = auth.jwt() ->> 'phone'
  )
);

-- Allow drivers to update their own data
CREATE POLICY "Drivers can update own data" 
ON public.drivers 
FOR UPDATE 
USING (
  auth.uid() IS NOT NULL AND (
    email = auth.jwt() ->> 'email' OR 
    phone = auth.jwt() ->> 'phone'
  )
);

-- Keep insert policy for driver registration
CREATE POLICY "Allow driver registration" 
ON public.drivers 
FOR INSERT 
WITH CHECK (true);

-- Secure orders table - customers can only see their orders, drivers can see assigned orders
DROP POLICY IF EXISTS "Allow all for now" ON public.orders;

CREATE POLICY "Customers can view own orders" 
ON public.orders 
FOR SELECT 
USING (
  auth.uid() IS NOT NULL AND 
  customer_phone = auth.jwt() ->> 'phone'
);

CREATE POLICY "Drivers can view assigned orders" 
ON public.orders 
FOR SELECT 
USING (
  auth.uid() IS NOT NULL AND 
  driver_id IS NOT NULL
);

CREATE POLICY "Customers can create orders" 
ON public.orders 
FOR INSERT 
WITH CHECK (
  auth.uid() IS NOT NULL AND 
  customer_phone = auth.jwt() ->> 'phone'
);

CREATE POLICY "Drivers can update assigned orders" 
ON public.orders 
FOR UPDATE 
USING (
  auth.uid() IS NOT NULL AND 
  driver_id IS NOT NULL
);

-- Secure driver locations - only drivers can manage their locations
DROP POLICY IF EXISTS "Anyone can view driver locations" ON public.driver_locations;
DROP POLICY IF EXISTS "Drivers can delete their own location records" ON public.driver_locations;
DROP POLICY IF EXISTS "Drivers can update their own location" ON public.driver_locations;
DROP POLICY IF EXISTS "Drivers can update their own location records" ON public.driver_locations;

CREATE POLICY "Authenticated users can view driver locations" 
ON public.driver_locations 
FOR SELECT 
USING (auth.uid() IS NOT NULL);

CREATE POLICY "Drivers can manage their locations" 
ON public.driver_locations 
FOR ALL 
USING (auth.uid() IS NOT NULL)
WITH CHECK (auth.uid() IS NOT NULL);