-- Fix security issues

-- Enable RLS on temp_auth_users table
ALTER TABLE public.temp_auth_users ENABLE ROW LEVEL SECURITY;

-- Fix function search path
CREATE OR REPLACE FUNCTION create_auth_user_for_existing(
  user_email TEXT,
  user_password TEXT,
  user_phone TEXT,
  user_name TEXT,
  user_type TEXT
) RETURNS UUID 
LANGUAGE plpgsql 
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  new_user_id UUID;
BEGIN
  INSERT INTO public.temp_auth_users (email, password, phone, name, user_type)
  VALUES (user_email, user_password, user_phone, user_name, user_type)
  ON CONFLICT (email) DO NOTHING;
  
  RETURN null;
END;
$$;

-- Create RLS policy for temp_auth_users (admins only for now)
CREATE POLICY "Only admins can access temp auth users"
ON public.temp_auth_users
FOR ALL
TO authenticated
USING (is_admin())
WITH CHECK (is_admin());