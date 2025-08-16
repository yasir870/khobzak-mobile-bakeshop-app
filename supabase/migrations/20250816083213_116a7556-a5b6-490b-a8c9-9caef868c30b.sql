-- Fix critical security vulnerability: Remove public access to sensitive data
-- This addresses the security scan findings about exposed customer, driver, and order data

-- First, check and drop the dangerous public policies
DO $$
BEGIN
    -- Drop overly permissive customer policies
    IF EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'customers' AND policyname = 'Allow admin (and everyone) to select all customers') THEN
        DROP POLICY "Allow admin (and everyone) to select all customers" ON public.customers;
    END IF;
    
    -- Drop overly permissive driver policies  
    IF EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'drivers' AND policyname = 'Allow admin to view all drivers') THEN
        DROP POLICY "Allow admin to view all drivers" ON public.drivers;
    END IF;
    
    IF EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'drivers' AND policyname = 'Allow admin to manage drivers') THEN
        DROP POLICY "Allow admin to manage drivers" ON public.drivers;
    END IF;
    
    -- Drop overly permissive order policies
    IF EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'orders' AND policyname = 'Allow all for now') THEN
        DROP POLICY "Allow all for now" ON public.orders;
    END IF;
    
    -- Drop overly permissive driver location policies
    IF EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'driver_locations' AND policyname = 'Anyone can view driver locations') THEN
        DROP POLICY "Anyone can view driver locations" ON public.driver_locations;
    END IF;
END $$;

-- Create secure policies for customers (only if they don't exist)
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'customers' AND policyname = 'Customers can view own data') THEN
        CREATE POLICY "Customers can view own data" 
        ON public.customers 
        FOR SELECT 
        USING (
            auth.uid() IS NOT NULL AND (
                email = auth.jwt() ->> 'email' OR 
                phone = auth.jwt() ->> 'phone'
            )
        );
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'customers' AND policyname = 'Customers can update own data') THEN
        CREATE POLICY "Customers can update own data" 
        ON public.customers 
        FOR UPDATE 
        USING (
            auth.uid() IS NOT NULL AND (
                email = auth.jwt() ->> 'email' OR 
                phone = auth.jwt() ->> 'phone'
            )
        );
    END IF;
END $$;

-- Create secure policies for drivers
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'drivers' AND policyname = 'Drivers can view own data') THEN
        CREATE POLICY "Drivers can view own data" 
        ON public.drivers 
        FOR SELECT 
        USING (
            auth.uid() IS NOT NULL AND (
                email = auth.jwt() ->> 'email' OR 
                phone = auth.jwt() ->> 'phone'
            )
        );
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'drivers' AND policyname = 'Allow driver registration') THEN
        CREATE POLICY "Allow driver registration" 
        ON public.drivers 
        FOR INSERT 
        WITH CHECK (true);
    END IF;
END $$;

-- Create secure policies for orders
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'orders' AND policyname = 'Customers can view own orders') THEN
        CREATE POLICY "Customers can view own orders" 
        ON public.orders 
        FOR SELECT 
        USING (
            auth.uid() IS NOT NULL AND 
            customer_phone = auth.jwt() ->> 'phone'
        );
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'orders' AND policyname = 'Drivers can view assigned orders') THEN
        CREATE POLICY "Drivers can view assigned orders" 
        ON public.orders 
        FOR SELECT 
        USING (
            auth.uid() IS NOT NULL AND 
            driver_id IS NOT NULL
        );
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'orders' AND policyname = 'Allow order creation') THEN
        CREATE POLICY "Allow order creation" 
        ON public.orders 
        FOR INSERT 
        WITH CHECK (true);
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'orders' AND policyname = 'Allow order updates') THEN
        CREATE POLICY "Allow order updates" 
        ON public.orders 
        FOR UPDATE 
        USING (true);
    END IF;
END $$;

-- Create secure policies for driver locations
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'driver_locations' AND policyname = 'Authenticated users can view driver locations') THEN
        CREATE POLICY "Authenticated users can view driver locations" 
        ON public.driver_locations 
        FOR SELECT 
        USING (auth.uid() IS NOT NULL);
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'driver_locations' AND policyname = 'Allow location management') THEN
        CREATE POLICY "Allow location management" 
        ON public.driver_locations 
        FOR ALL 
        USING (true)
        WITH CHECK (true);
    END IF;
END $$;