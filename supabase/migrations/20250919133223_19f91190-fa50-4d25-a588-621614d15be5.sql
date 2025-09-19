-- Create 3 test drivers and fix location tracking issue

-- First, let's create 3 test drivers with Supabase Auth accounts
-- Note: For security, we cannot store plaintext passwords in the database
-- Instead, we'll create a temporary table for testing credentials

-- Create temporary test credentials table (for testing only)
CREATE TABLE IF NOT EXISTS public.test_credentials (
  id SERIAL PRIMARY KEY,
  email TEXT UNIQUE NOT NULL,
  password TEXT NOT NULL,
  user_type TEXT NOT NULL,
  phone TEXT NOT NULL,
  name TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Enable RLS on test credentials
ALTER TABLE public.test_credentials ENABLE ROW LEVEL SECURITY;

-- Only admins can access test credentials
CREATE POLICY "Only admins can access test credentials"
ON public.test_credentials
FOR ALL
USING (is_admin())
WITH CHECK (is_admin());

-- Insert test driver credentials
INSERT INTO public.test_credentials (email, password, user_type, phone, name) VALUES
('driver1@test.com', 'password123', 'driver', '07801234567', 'سائق تجريبي 1'),
('driver2@test.com', 'password123', 'driver', '07801234568', 'سائق تجريبي 2'),
('driver3@test.com', 'password123', 'driver', '07801234569', 'سائق تجريبي 3');

-- Insert corresponding driver records with sequential IDs
-- We need to make sure these IDs match what will be used in driver_locations
INSERT INTO public.drivers (id, name, phone, email, approved) VALUES
(1001, 'سائق تجريبي 1', '07801234567', 'driver1@test.com', true),
(1002, 'سائق تجريبي 2', '07801234568', 'driver2@test.com', true),
(1003, 'سائق تجريبي 3', '07801234569', 'driver3@test.com', true);

-- Fix the driver_locations table structure to handle both UUID and bigint driver_id
-- Add a new column for auth_user_id to link with Supabase Auth
ALTER TABLE public.driver_locations 
ADD COLUMN IF NOT EXISTS auth_user_id UUID REFERENCES auth.users(id);

-- Update the existing RLS policy to work with both driver_id types
DROP POLICY IF EXISTS "Drivers can manage their own locations" ON public.driver_locations;

CREATE POLICY "Drivers can manage their own locations"
ON public.driver_locations
FOR ALL
USING (
  -- Check if user matches either the auth_user_id or through drivers table
  (auth_user_id = auth.uid()) OR 
  (EXISTS (
    SELECT 1 
    FROM profiles p 
    JOIN drivers d ON (p.phone = d.phone)
    WHERE p.id = auth.uid() 
    AND p.user_type = 'driver' 
    AND d.id = driver_locations.driver_id
  ))
);

-- Add a function to get driver_id from auth user
CREATE OR REPLACE FUNCTION public.get_driver_id_from_auth()
RETURNS bigint
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  driver_record_id bigint;
BEGIN
  SELECT d.id INTO driver_record_id
  FROM profiles p
  JOIN drivers d ON p.phone = d.phone
  WHERE p.id = auth.uid() AND p.user_type = 'driver';
  
  RETURN driver_record_id;
END;
$$;