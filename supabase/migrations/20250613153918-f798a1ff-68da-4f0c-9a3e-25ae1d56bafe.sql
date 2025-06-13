
-- إنشاء جدول حسابات السواق
CREATE TABLE public.drivers (
  id BIGSERIAL PRIMARY KEY,
  name TEXT NOT NULL,
  phone TEXT NOT NULL UNIQUE,
  email TEXT NOT NULL UNIQUE,
  approved BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- تفعيل Row Level Security
ALTER TABLE public.drivers ENABLE ROW LEVEL SECURITY;

-- سياسة للسماح للإدارة بمشاهدة جميع السواق
CREATE POLICY "Allow admin to view all drivers" 
  ON public.drivers 
  FOR SELECT 
  USING (true);

-- سياسة للسماح للإدارة بإدارة السواق
CREATE POLICY "Allow admin to manage drivers" 
  ON public.drivers 
  FOR ALL 
  USING (true);

-- إدراج البيانات المطلوبة
INSERT INTO public.drivers (id, name, phone, email, approved) VALUES
(1, 'أحمد سعيد', '07515497130', 'ahmad.driver1@mail.com', true),
(2, 'علي قاسم', '+9647512345678', 'ali.driver2@mail.com', false),
(3, 'مصطفى جلال', '07510001122', 'mustafa.driver3@mail.com', true),
(4, 'سيف حمزة', '+9647500098765', 'saif.driver4@mail.com', true);

-- تحديث sequence للـ id ليبدأ من 5
SELECT setval('public.drivers_id_seq', 4, true);
