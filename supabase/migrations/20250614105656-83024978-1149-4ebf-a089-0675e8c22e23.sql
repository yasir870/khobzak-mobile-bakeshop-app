
-- إنشاء جدول الطلبات بالاعتماد على جداول العملاء والسائقين باستخدام bigint
CREATE TABLE public.orders (
  id BIGSERIAL PRIMARY KEY,
  customer_id bigint NOT NULL REFERENCES customers(id),
  driver_id bigint REFERENCES drivers(id),
  type text NOT NULL,            -- نوع الخبز
  quantity int NOT NULL,         -- الكمية
  total_price numeric NOT NULL,  -- السعر الكلي
  notes text,                    -- ملاحظات إضافية
  status text NOT NULL DEFAULT 'pending', -- الحالة: pending/accepted/delivered/rejected
  address text NOT NULL,
  customer_phone text NOT NULL,
  delivered_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- يمكن تفعيل RLS مع سياسة عامة مؤقتاً
ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;

-- سياسة عامة: كل المستخدمين يمكنهم رؤية وتعديل الطلبات مؤقتاً
CREATE POLICY "Allow all for now"
  ON public.orders
  FOR ALL
  USING (true);

