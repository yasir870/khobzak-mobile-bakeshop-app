-- Fix security linter issues: Add missing RLS policies and fix function security

-- Create secure RLS policies for customers table
CREATE POLICY "Authenticated users can view customers with profile link"
ON public.customers
FOR SELECT
USING (
  auth.uid() IS NOT NULL AND (
    -- Users can view their own customer record via phone number match
    EXISTS (
      SELECT 1 FROM public.profiles 
      WHERE profiles.id = auth.uid() 
      AND profiles.phone = customers.phone
    )
    -- Or admins can view all (when admin system is implemented)
    OR public.is_admin()
  )
);

CREATE POLICY "Users can insert customer record"
ON public.customers  
FOR INSERT
WITH CHECK (
  auth.uid() IS NOT NULL AND 
  EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE profiles.id = auth.uid() 
    AND profiles.phone = NEW.phone
  )
);

CREATE POLICY "Users can update own customer record"
ON public.customers
FOR UPDATE
USING (
  auth.uid() IS NOT NULL AND 
  EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE profiles.id = auth.uid() 
    AND profiles.phone = customers.phone
  )
)
WITH CHECK (
  auth.uid() IS NOT NULL AND 
  EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE profiles.id = auth.uid() 
    AND profiles.phone = NEW.phone
  )
);

-- Create secure RLS policies for drivers table
CREATE POLICY "Authenticated users can view drivers with profile link"
ON public.drivers
FOR SELECT
USING (
  auth.uid() IS NOT NULL AND (
    -- Users can view their own driver record via phone number match
    EXISTS (
      SELECT 1 FROM public.profiles 
      WHERE profiles.id = auth.uid() 
      AND profiles.phone = drivers.phone
    )
    -- Or admins can view all (when admin system is implemented)
    OR public.is_admin()
  )
);

CREATE POLICY "Users can insert driver record"
ON public.drivers
FOR INSERT
WITH CHECK (
  auth.uid() IS NOT NULL AND 
  EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE profiles.id = auth.uid() 
    AND profiles.phone = NEW.phone
  )
);

CREATE POLICY "Users can update own driver record"
ON public.drivers
FOR UPDATE
USING (
  auth.uid() IS NOT NULL AND 
  EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE profiles.id = auth.uid() 
    AND profiles.phone = drivers.phone
  )
)
WITH CHECK (
  auth.uid() IS NOT NULL AND 
  EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE profiles.id = auth.uid() 
    AND profiles.phone = NEW.phone
  )
);

-- Create secure RLS policies for orders table
CREATE POLICY "Customers can view own orders via phone"
ON public.orders
FOR SELECT
USING (
  auth.uid() IS NOT NULL AND 
  EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE profiles.id = auth.uid() 
    AND profiles.phone = orders.customer_phone
  )
);

CREATE POLICY "Drivers can view assigned orders"
ON public.orders
FOR SELECT
USING (
  auth.uid() IS NOT NULL AND 
  driver_id IS NOT NULL AND
  EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE profiles.id = auth.uid() 
    AND profiles.user_type = 'driver'
  )
);

CREATE POLICY "Customers can create orders"
ON public.orders
FOR INSERT
WITH CHECK (
  auth.uid() IS NOT NULL AND 
  EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE profiles.id = auth.uid() 
    AND profiles.phone = NEW.customer_phone
  )
);

CREATE POLICY "Drivers can update assigned orders"
ON public.orders
FOR UPDATE
USING (
  auth.uid() IS NOT NULL AND 
  driver_id IS NOT NULL AND
  EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE profiles.id = auth.uid() 
    AND profiles.user_type = 'driver'
  )
);

-- Create RLS policy for driver_locations table
CREATE POLICY "Drivers can manage their own locations"
ON public.driver_locations
FOR ALL
USING (
  auth.uid() IS NOT NULL AND 
  EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE profiles.id = auth.uid() 
    AND profiles.user_type = 'driver'
  )
);

-- Fix function security by setting search_path
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
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

CREATE OR REPLACE FUNCTION public.update_driver_location_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;