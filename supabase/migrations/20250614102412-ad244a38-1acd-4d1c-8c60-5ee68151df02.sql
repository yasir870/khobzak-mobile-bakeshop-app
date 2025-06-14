
-- إضافة عمود كلمة المرور لجدول السائقين
ALTER TABLE public.drivers
ADD COLUMN password TEXT;

-- تحديث كلمات السر حسب الطلب
UPDATE public.drivers SET password = 'ahmad123' WHERE id = 1;
UPDATE public.drivers SET password = 'mustafa123' WHERE id = 3;
UPDATE public.drivers SET password = 'saif123' WHERE id = 4;
