DROP VIEW IF EXISTS public.bakeries_public;

CREATE TABLE public.bakeries_public (
  id bigint PRIMARY KEY REFERENCES public.bakeries(id) ON DELETE CASCADE,
  name text NOT NULL,
  logo_url text,
  address text,
  approved boolean NOT NULL DEFAULT false,
  created_at timestamp with time zone NOT NULL
);

GRANT SELECT ON public.bakeries_public TO anon;
GRANT SELECT ON public.bakeries_public TO authenticated;
GRANT ALL ON public.bakeries_public TO service_role;

ALTER TABLE public.bakeries_public ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public can view approved bakery directory"
ON public.bakeries_public
FOR SELECT
TO anon, authenticated
USING (approved = true);

INSERT INTO public.bakeries_public (id, name, logo_url, address, approved, created_at)
SELECT id, name, logo_url, address, approved, created_at
FROM public.bakeries
ON CONFLICT (id) DO UPDATE SET
  name = EXCLUDED.name,
  logo_url = EXCLUDED.logo_url,
  address = EXCLUDED.address,
  approved = EXCLUDED.approved,
  created_at = EXCLUDED.created_at;

CREATE OR REPLACE FUNCTION public.sync_bakery_public_directory()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF TG_OP = 'DELETE' THEN
    DELETE FROM public.bakeries_public WHERE id = OLD.id;
    RETURN OLD;
  END IF;

  INSERT INTO public.bakeries_public (id, name, logo_url, address, approved, created_at)
  VALUES (NEW.id, NEW.name, NEW.logo_url, NEW.address, NEW.approved, NEW.created_at)
  ON CONFLICT (id) DO UPDATE SET
    name = EXCLUDED.name,
    logo_url = EXCLUDED.logo_url,
    address = EXCLUDED.address,
    approved = EXCLUDED.approved,
    created_at = EXCLUDED.created_at;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS sync_bakery_public_directory_trigger ON public.bakeries;
CREATE TRIGGER sync_bakery_public_directory_trigger
AFTER INSERT OR UPDATE OR DELETE ON public.bakeries
FOR EACH ROW
EXECUTE FUNCTION public.sync_bakery_public_directory();

DROP TRIGGER IF EXISTS enforce_driver_approval_admin_only ON public.drivers;
CREATE TRIGGER enforce_driver_approval_admin_only
BEFORE INSERT OR UPDATE OF approved ON public.drivers
FOR EACH ROW
EXECUTE FUNCTION public.prevent_driver_self_approval();

DROP TRIGGER IF EXISTS enforce_bakery_approval_admin_only ON public.bakeries;
CREATE TRIGGER enforce_bakery_approval_admin_only
BEFORE INSERT OR UPDATE OF approved ON public.bakeries
FOR EACH ROW
EXECUTE FUNCTION public.prevent_bakery_self_approval();

DROP POLICY IF EXISTS "Public can view available bread products" ON public.bread_products;
CREATE POLICY "Public can view available bread products"
ON public.bread_products
FOR SELECT
TO public
USING (
  (
    available = true
    AND EXISTS (
      SELECT 1
      FROM public.bakeries_public bp
      WHERE bp.id = bread_products.bakery_id
        AND bp.approved = true
    )
  )
  OR EXISTS (
    SELECT 1
    FROM public.bakeries b
    WHERE b.id = bread_products.bakery_id
      AND b.owner_user_id = auth.uid()
  )
  OR public.is_admin()
);

DROP POLICY IF EXISTS "Drivers can manage their own locations" ON public.driver_locations;

CREATE POLICY "Drivers can view their own locations"
ON public.driver_locations
FOR SELECT
TO authenticated
USING (
  auth_user_id = auth.uid()
  OR EXISTS (
    SELECT 1
    FROM public.profiles p
    JOIN public.drivers d ON p.phone = d.phone
    WHERE p.id = auth.uid()
      AND p.user_type = 'driver'
      AND d.id = driver_locations.driver_id
  )
);

CREATE POLICY "Drivers can add their own locations"
ON public.driver_locations
FOR INSERT
TO authenticated
WITH CHECK (
  auth_user_id = auth.uid()
  AND EXISTS (
    SELECT 1
    FROM public.profiles p
    JOIN public.drivers d ON p.phone = d.phone
    WHERE p.id = auth.uid()
      AND p.user_type = 'driver'
      AND d.id = driver_locations.driver_id
  )
  AND (
    order_id IS NULL
    OR EXISTS (
      SELECT 1
      FROM public.orders o
      WHERE o.id = driver_locations.order_id
        AND o.driver_id = driver_locations.driver_id
        AND o.status = ANY (ARRAY['accepted', 'assigned', 'on_the_way', 'in-transit'])
    )
  )
);

CREATE POLICY "Drivers can update their own locations"
ON public.driver_locations
FOR UPDATE
TO authenticated
USING (
  auth_user_id = auth.uid()
  OR EXISTS (
    SELECT 1
    FROM public.profiles p
    JOIN public.drivers d ON p.phone = d.phone
    WHERE p.id = auth.uid()
      AND p.user_type = 'driver'
      AND d.id = driver_locations.driver_id
  )
)
WITH CHECK (
  auth_user_id = auth.uid()
  AND EXISTS (
    SELECT 1
    FROM public.profiles p
    JOIN public.drivers d ON p.phone = d.phone
    WHERE p.id = auth.uid()
      AND p.user_type = 'driver'
      AND d.id = driver_locations.driver_id
  )
  AND (
    order_id IS NULL
    OR EXISTS (
      SELECT 1
      FROM public.orders o
      WHERE o.id = driver_locations.order_id
        AND o.driver_id = driver_locations.driver_id
        AND o.status = ANY (ARRAY['accepted', 'assigned', 'on_the_way', 'in-transit'])
    )
  )
);

CREATE POLICY "Drivers can delete their own locations"
ON public.driver_locations
FOR DELETE
TO authenticated
USING (
  auth_user_id = auth.uid()
  AND EXISTS (
    SELECT 1
    FROM public.profiles p
    JOIN public.drivers d ON p.phone = d.phone
    WHERE p.id = auth.uid()
      AND p.user_type = 'driver'
      AND d.id = driver_locations.driver_id
  )
);

CREATE POLICY "Admins can delete driver locations"
ON public.driver_locations
FOR DELETE
TO authenticated
USING (public.is_admin());