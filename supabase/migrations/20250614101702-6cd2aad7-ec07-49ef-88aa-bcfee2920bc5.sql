
-- جدول العملاء
CREATE TABLE public.customers (
  id BIGSERIAL PRIMARY KEY,
  name TEXT NOT NULL,
  email TEXT NOT NULL UNIQUE,
  phone TEXT NOT NULL UNIQUE,
  password TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- تفعيل الأمن على مستوى الصفوف
ALTER TABLE public.customers ENABLE ROW LEVEL SECURITY;

-- سماح للعملاء بإضافة أنفسهم
CREATE POLICY "Allow insert customer" 
  ON public.customers 
  FOR INSERT 
  WITH CHECK (true);

-- سماح لكل شخص بقراءة بريده الخاص (للدخول)
CREATE POLICY "Allow customer to select own"
  ON public.customers
  FOR SELECT
  USING (
    email = current_setting('request.jwt.claim.email', true)
    OR phone = current_setting('request.jwt.claim.phone', true)
  );
