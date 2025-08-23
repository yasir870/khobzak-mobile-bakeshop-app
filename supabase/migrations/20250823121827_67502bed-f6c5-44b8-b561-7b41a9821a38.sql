-- CRITICAL SECURITY FIX: Remove dangerous temporary policies and implement secure RLS

-- Remove all dangerous temporary policies that expose all data publicly
DROP POLICY IF EXISTS "Temporary: Allow customer data access" ON public.customers;
DROP POLICY IF EXISTS "Temporary: Allow driver data access" ON public.drivers;
DROP POLICY IF EXISTS "Temporary: Allow order data access" ON public.orders;

-- Create secure RLS policies for customers that work with Supabase Auth
CREATE POLICY "Customers can view own profile"
ON public.customers
FOR SELECT
USING (auth.uid()::text = id::text);

CREATE POLICY "Customers can update own profile"
ON public.customers
FOR UPDATE
USING (auth.uid()::text = id::text)
WITH CHECK (auth.uid()::text = id::text);

CREATE POLICY "Allow customer registration"
ON public.customers
FOR INSERT
WITH CHECK (auth.uid()::text = id::text);

-- Create secure RLS policies for drivers that work with Supabase Auth
CREATE POLICY "Drivers can view own profile"
ON public.drivers
FOR SELECT
USING (auth.uid()::text = id::text);

CREATE POLICY "Drivers can update own profile"
ON public.drivers
FOR UPDATE
USING (auth.uid()::text = id::text)
WITH CHECK (auth.uid()::text = id::text);

CREATE POLICY "Allow driver registration"
ON public.drivers
FOR INSERT
WITH CHECK (auth.uid()::text = id::text);

-- Create secure RLS policies for orders
CREATE POLICY "Customers can view own orders"
ON public.orders
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.customers 
    WHERE customers.id::text = auth.uid()::text 
    AND customers.phone = orders.customer_phone
  )
);

CREATE POLICY "Drivers can view assigned orders"
ON public.orders
FOR SELECT
USING (driver_id::text = auth.uid()::text);

CREATE POLICY "Drivers can update assigned orders"
ON public.orders
FOR UPDATE
USING (driver_id::text = auth.uid()::text);

CREATE POLICY "Customers can create orders"
ON public.orders
FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.customers 
    WHERE customers.id::text = auth.uid()::text 
    AND customers.phone = NEW.customer_phone
  )
);

-- Create profiles table for additional user data with Supabase Auth integration
CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
  user_type TEXT NOT NULL CHECK (user_type IN ('customer', 'driver')),
  phone TEXT,
  name TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS on profiles table
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for profiles
CREATE POLICY "Users can view own profile"
ON public.profiles
FOR SELECT
USING (auth.uid() = id);

CREATE POLICY "Users can update own profile"
ON public.profiles
FOR UPDATE
USING (auth.uid() = id)
WITH CHECK (auth.uid() = id);

CREATE POLICY "Users can create own profile"
ON public.profiles
FOR INSERT
WITH CHECK (auth.uid() = id);

-- Create function to handle new user registration
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, user_type, phone, name)
  VALUES (
    NEW.id, 
    COALESCE(NEW.raw_user_meta_data->>'user_type', 'customer'),
    NEW.raw_user_meta_data->>'phone',
    NEW.raw_user_meta_data->>'name'
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger for automatic profile creation
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();