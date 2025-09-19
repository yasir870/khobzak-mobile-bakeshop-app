-- Phase 1: Remove plaintext password columns and fix security vulnerabilities

-- Remove password columns from customers and drivers tables (critical security fix)
ALTER TABLE public.customers DROP COLUMN IF EXISTS password;
ALTER TABLE public.drivers DROP COLUMN IF EXISTS password;

-- Create proper user roles system to replace broken admin system
CREATE TYPE public.app_role AS ENUM ('admin', 'driver', 'customer');

CREATE TABLE public.user_roles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  role app_role NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE (user_id, role)
);

-- Enable RLS on user_roles
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

-- Create security definer function to check user roles (prevents RLS recursion)
CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role app_role)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = 'public'
AS $function$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = _user_id AND role = _role
  );
$function$;

-- Update is_admin function to use proper role system
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = 'public'
AS $function$
  SELECT public.has_role(auth.uid(), 'admin');
$function$;

-- Create function to get current user role
CREATE OR REPLACE FUNCTION public.get_current_user_role()
RETURNS app_role
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = 'public'
AS $function$
  SELECT role FROM public.user_roles WHERE user_id = auth.uid() LIMIT 1;
$function$;

-- Fix critical RLS vulnerability: Drivers should only see orders assigned to them specifically
DROP POLICY IF EXISTS "Drivers can view assigned orders" ON public.orders;
CREATE POLICY "Drivers can view orders assigned to them"
ON public.orders
FOR SELECT
USING (
  auth.uid() IS NOT NULL 
  AND driver_id IS NOT NULL 
  AND EXISTS (
    SELECT 1 FROM profiles p 
    JOIN drivers d ON p.phone = d.phone 
    WHERE p.id = auth.uid() 
    AND p.user_type = 'driver' 
    AND d.id = orders.driver_id
  )
);

-- Fix driver update policy to be more restrictive
DROP POLICY IF EXISTS "Drivers can update assigned orders" ON public.orders;
CREATE POLICY "Drivers can update only their assigned orders"
ON public.orders
FOR UPDATE
USING (
  auth.uid() IS NOT NULL 
  AND driver_id IS NOT NULL 
  AND EXISTS (
    SELECT 1 FROM profiles p 
    JOIN drivers d ON p.phone = d.phone 
    WHERE p.id = auth.uid() 
    AND p.user_type = 'driver' 
    AND d.id = orders.driver_id
  )
)
WITH CHECK (
  auth.uid() IS NOT NULL 
  AND driver_id IS NOT NULL 
  AND EXISTS (
    SELECT 1 FROM profiles p 
    JOIN drivers d ON p.phone = d.phone 
    WHERE p.id = auth.uid() 
    AND p.user_type = 'driver' 
    AND d.id = orders.driver_id
  )
);

-- Add RLS policies for user_roles table
CREATE POLICY "Users can view their own roles"
ON public.user_roles
FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Admins can manage all roles"
ON public.user_roles
FOR ALL
USING (public.has_role(auth.uid(), 'admin'))
WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- Create trigger to automatically assign customer role when profile is created
CREATE OR REPLACE FUNCTION public.assign_default_role()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $function$
BEGIN
  -- Assign role based on user_type in profiles
  INSERT INTO public.user_roles (user_id, role)
  VALUES (
    NEW.id, 
    CASE 
      WHEN NEW.user_type = 'driver' THEN 'driver'::app_role
      WHEN NEW.user_type = 'customer' THEN 'customer'::app_role
      ELSE 'customer'::app_role
    END
  )
  ON CONFLICT (user_id, role) DO NOTHING;
  
  RETURN NEW;
END;
$function$;

CREATE TRIGGER assign_user_role_trigger
  AFTER INSERT ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.assign_default_role();