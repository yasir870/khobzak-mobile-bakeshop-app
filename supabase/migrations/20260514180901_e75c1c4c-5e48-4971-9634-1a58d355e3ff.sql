
CREATE TABLE public.bakeries (
  id BIGSERIAL PRIMARY KEY,
  owner_user_id UUID,
  name TEXT NOT NULL,
  phone TEXT,
  email TEXT,
  address TEXT,
  logo_url TEXT,
  approved BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.bakeries ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public can view approved bakeries"
ON public.bakeries FOR SELECT
USING (approved = true OR owner_user_id = auth.uid() OR public.is_admin());

CREATE POLICY "Owner or admin can update bakery"
ON public.bakeries FOR UPDATE
USING (owner_user_id = auth.uid() OR public.is_admin())
WITH CHECK (owner_user_id = auth.uid() OR public.is_admin());

CREATE POLICY "Owner or admin can insert bakery"
ON public.bakeries FOR INSERT
WITH CHECK (public.is_admin() OR owner_user_id = auth.uid());

CREATE POLICY "Admin can delete bakeries"
ON public.bakeries FOR DELETE
USING (public.is_admin());

CREATE TABLE public.bread_products (
  id BIGSERIAL PRIMARY KEY,
  bakery_id BIGINT NOT NULL REFERENCES public.bakeries(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  price NUMERIC NOT NULL DEFAULT 0,
  image_url TEXT,
  available BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.bread_products ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public can view available bread products"
ON public.bread_products FOR SELECT
USING (
  available = true
  OR EXISTS (SELECT 1 FROM public.bakeries b WHERE b.id = bread_products.bakery_id AND b.owner_user_id = auth.uid())
  OR public.is_admin()
);

CREATE POLICY "Owner or admin can manage bread products"
ON public.bread_products FOR ALL
USING (
  EXISTS (SELECT 1 FROM public.bakeries b WHERE b.id = bread_products.bakery_id AND b.owner_user_id = auth.uid())
  OR public.is_admin()
)
WITH CHECK (
  EXISTS (SELECT 1 FROM public.bakeries b WHERE b.id = bread_products.bakery_id AND b.owner_user_id = auth.uid())
  OR public.is_admin()
);

CREATE OR REPLACE FUNCTION public.assign_default_role()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  INSERT INTO public.user_roles (user_id, role)
  VALUES (
    NEW.id,
    CASE
      WHEN NEW.user_type = 'driver' THEN 'driver'::app_role
      WHEN NEW.user_type = 'bakery' THEN 'bakery'::app_role
      WHEN NEW.user_type = 'admin' THEN 'admin'::app_role
      WHEN NEW.user_type = 'customer' THEN 'customer'::app_role
      ELSE 'customer'::app_role
    END
  )
  ON CONFLICT (user_id, role) DO NOTHING;
  RETURN NEW;
END;
$function$;

CREATE OR REPLACE FUNCTION public.touch_updated_at()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_bakeries_updated BEFORE UPDATE ON public.bakeries
FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

CREATE TRIGGER trg_bread_products_updated BEFORE UPDATE ON public.bread_products
FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

DO $$ BEGIN
  CREATE POLICY "Public read photos"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'photos');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE POLICY "Bakery owners and admins can upload photos"
  ON storage.objects FOR INSERT
  WITH CHECK (
    bucket_id = 'photos'
    AND (public.is_admin() OR public.has_role(auth.uid(), 'bakery'))
  );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE POLICY "Bakery owners and admins can update photos"
  ON storage.objects FOR UPDATE
  USING (
    bucket_id = 'photos'
    AND (public.is_admin() OR public.has_role(auth.uid(), 'bakery'))
  );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE POLICY "Bakery owners and admins can delete photos"
  ON storage.objects FOR DELETE
  USING (
    bucket_id = 'photos'
    AND (public.is_admin() OR public.has_role(auth.uid(), 'bakery'))
  );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
