-- Fix driver data exposure by implementing proper RLS policies
-- Remove the overly permissive policies and create secure ones

-- Drop existing insecure policies
DROP POLICY IF EXISTS "Allow admin to manage drivers" ON public.drivers;
DROP POLICY IF EXISTS "Allow admin to view all drivers" ON public.drivers;

-- Create secure policies for drivers table
-- Drivers can only view and update their own profile
CREATE POLICY "Drivers can view own profile" 
ON public.drivers 
FOR SELECT 
TO authenticated
USING (auth.uid()::text = id::text);

CREATE POLICY "Drivers can update own profile" 
ON public.drivers 
FOR UPDATE 
TO authenticated
USING (auth.uid()::text = id::text)
WITH CHECK (auth.uid()::text = id::text);

-- Allow driver registration (insert their own profile)
CREATE POLICY "Drivers can create own profile" 
ON public.drivers 
FOR INSERT 
TO authenticated
WITH CHECK (auth.uid()::text = id::text);

-- Create a security definer function to check if user is admin
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
AS $$
  -- For now, return false until proper admin system is implemented
  -- This can be updated later to check admin roles from a user_roles table
  SELECT false;
$$;

-- Admin policies (disabled until proper admin authentication is implemented)
-- These can be enabled once admin roles are properly set up
/*
CREATE POLICY "Admins can view all drivers" 
ON public.drivers 
FOR SELECT 
TO authenticated
USING (public.is_admin());

CREATE POLICY "Admins can manage all drivers" 
ON public.drivers 
FOR ALL 
TO authenticated
USING (public.is_admin())
WITH CHECK (public.is_admin());
*/