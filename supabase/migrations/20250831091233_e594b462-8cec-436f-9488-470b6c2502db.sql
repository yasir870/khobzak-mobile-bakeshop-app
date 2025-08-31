-- Create Supabase Auth accounts for existing users

-- First, let's create a function to safely create auth users
CREATE OR REPLACE FUNCTION create_auth_user_for_existing(
  user_email TEXT,
  user_password TEXT,
  user_phone TEXT,
  user_name TEXT,
  user_type TEXT
) RETURNS UUID AS $$
DECLARE
  new_user_id UUID;
BEGIN
  -- Insert into auth.users (this requires superuser privileges in production)
  -- For development, we'll create a migration that the user needs to run manually
  
  -- Instead, let's create a temporary table with the data needed
  INSERT INTO public.temp_auth_users (email, password, phone, name, user_type)
  VALUES (user_email, user_password, user_phone, user_name, user_type)
  ON CONFLICT (email) DO NOTHING;
  
  RETURN null;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create temporary table for auth user data
CREATE TABLE IF NOT EXISTS public.temp_auth_users (
  email TEXT PRIMARY KEY,
  password TEXT,
  phone TEXT,
  name TEXT,
  user_type TEXT,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Insert all customers
INSERT INTO public.temp_auth_users (email, password, phone, name, user_type)
SELECT email, password, phone, name, 'customer'
FROM customers
ON CONFLICT (email) DO NOTHING;

-- Insert all drivers
INSERT INTO public.temp_auth_users (email, password, phone, name, user_type)
SELECT email, password, phone, name, 'driver'
FROM drivers
ON CONFLICT (email) DO NOTHING;