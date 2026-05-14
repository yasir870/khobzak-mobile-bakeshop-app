# لوحة تحكم المدير + حسابات المخابز

## نظرة عامة
بناء لوحة تحكم للمدير لإدارة السائقين والمخابز، وإضافة نوع جديد من الحسابات (مخبز) يستطيع إدارة منتجاته بنفسه.

## 1. تغييرات قاعدة البيانات

### إضافات Enum
- إضافة `'bakery'` إلى `app_role` و إلى `user_type` في `profiles`.

### جدول `bakeries` (جديد)
- `name`, `phone`, `email`, `address`, `logo_url`, `owner_user_id` (uuid)، `approved` (bool)، `created_at`.
- RLS: المالك يقرأ/يعدّل بياناته، المدير يدير الكل، الكل يقرأ المخابز المعتمدة.

### جدول `bread_products` (جديد)
- `bakery_id`, `name`, `description`, `price` (numeric)، `image_url`, `available` (bool)، `created_at`.
- RLS: قراءة عامة، الإدارة (insert/update/delete) لمالك المخبز فقط + المدير.

### تخزين
- استخدام bucket `photos` الموجود (public). سيتم تنظيم المسارات: `bakeries/{bakery_id}/logo.jpg` و `breads/{bakery_id}/{product_id}.jpg`.
- إضافة سياسات storage للسماح للمالك المعتمد بالرفع/الحذف، والمدير بكل شيء.

### Trigger
- تحديث `assign_default_role` ليدعم `'bakery'`.

## 2. Edge Functions

### `admin-manage-users` (جديدة)
- مصادقة: تتحقق أن المستدعي `is_admin`.
- العمليات: `create | update | delete | list` على حسابات `driver` و`bakery` (تشمل تغيير email/password/phone/name).
- تستخدم `SUPABASE_SERVICE_ROLE_KEY` داخلياً، تنشئ/تحدّث `auth.users` ثم تزامن `drivers` أو `bakeries`.

### `create-test-drivers` (موجودة) — تبقى كما هي.

## 3. الواجهات

### لوحة المدير `/admin/dashboard`
تبويبات:
- **السائقون**: جدول مع بحث، إضافة/تعديل/حذف، تعديل (الاسم، الهاتف، الإيميل، كلمة السر، الموافقة).
- **المخابز**: جدول مع بحث، إضافة/تعديل/حذف، رفع شعار، تعديل المنتجات نيابةً عن المخبز.
- **المنتجات**: عرض كل منتجات الخبز مع رفع صور.
- حماية: التحقق من `has_role(uid,'admin')` قبل العرض.

### واجهة حساب المخبز `BakeryApp`
- بعد تسجيل الدخول كمخبز يفتح: ملف المخبز (تعديل الاسم/الشعار/العنوان) + إدارة المنتجات (إضافة/حذف/تعديل/رفع صورة).
- التوجيه في `Index.tsx` يضيف فرع `bakery` بجانب `customer` و`driver`.

### `AuthPage`
- إضافة دور `'bakery'` للتسجيل/الدخول. عند التسجيل ينشئ سجل في `bakeries` (غير معتمد افتراضياً، يحتاج موافقة المدير).

### `BakeriesListPage` (موجودة)
- التحويل لقراءة من جدول `bakeries` (المعتمدة فقط) بدلاً من البيانات الحالية، وعرض الشعار.
- صفحة قائمة الخبز للمخبز تقرأ من `bread_products` لذلك المخبز.

## 4. الأمان
- جميع الجداول الجديدة RLS مفعّل.
- لا يحفظ المدير service role في الفرونت — كل عمليات auth.admin عبر edge function.
- التحقق من الدور server-side في كل edge function.

## 5. ترتيب التنفيذ
1. Migration: enums، جداول، RLS، storage policies.
2. Edge function `admin-manage-users`.
3. تحديث `AuthPage` + توجيه `Index.tsx` للمخابز.
4. `BakeryApp` (ملف + منتجات).
5. `AdminDashboard` بثلاث تبويبات.
6. تحديث `BakeriesListPage` لاستخدام البيانات الفعلية.

## ملاحظات
- لوحة المدير ستكون على `/admin/dashboard` (تستبدل الصفحات الفرعية الحالية أو تتعايش معها).
- يجب أن يكون لدى المستخدم الحالي دور `admin` للوصول — لو ما عندك حساب مدير، نضيف خطوة لتعيين أول مدير عبر SQL.
