

## تحليل المشكلة

### مشكلة تسجيل الخروج التلقائي
من سجلات Supabase Auth، المشكلة واضحة:
1. تسجيل الدخول ينجح (status 200) ✅
2. فوراً بعدها، Supabase يحاول تحديث الـ token عبر `refresh_token`
3. يفشل بخطأ: `"500: missing destination name oauth_client_id in *models.Session"`
4. الـ `onAuthStateChange` يستلم الحدث مع `session = null` → يسجل خروج

هذا خطأ من جانب Supabase infrastructure، لكن الكود يمكن أن يتعامل معه بشكل أفضل.

### السبب في الكود
في `AuthContext.tsx` سطر 35-41، الـ `onAuthStateChange` يقبل أي حدث ويضع `session` مباشرة حتى لو كانت `null` بسبب خطأ في التحديث. هذا يلغي الجلسة الصالحة.

أيضاً في `CustomerApp.tsx` سطر 23-31، إذا `user` صار `null` (بسبب الخطأ أعلاه) يعرض "جلسة منتهية" ويسجل خروج.

---

## الحسابات الموجودة

### زبائن:
| الإيميل | كلمة السر |
|---------|-----------|
| yh572831@gmail.com | (كلمة السر المستخدمة عند التسجيل - لا يمكن استرجاعها من القاعدة) |

### سائقين:
| الإيميل | كلمة السر |
|---------|-----------|
| driver1@test.com | password123 |
| driver2@test.com | password123 |
| driver3@test.com | password123 |

> ملاحظة: كلمة سر الزبون `yh572831@gmail.com` مشفرة في Supabase ولا يمكن قراءتها. فقط حسابات السائقين التجريبية معروفة كلمات سرها.

---

## خطة الإصلاح

### الخطوة 1: إصلاح AuthContext.tsx
- في `onAuthStateChange`، تجاهل أحداث الخطأ التي تأتي مع `session = null` إذا كان هناك مستخدم مسجل دخول فعلاً
- إضافة فحص: إذا كان الحدث `TOKEN_REFRESHED` والـ session فاضية، لا تحدث الحالة
- استخدام `getSession()` كمصدر أساسي للحقيقة بدلاً من الاعتماد فقط على الأحداث

```typescript
// تعديل onAuthStateChange ليتجاهل أخطاء تحديث التوكن
onAuthStateChange((event, session) => {
  // إذا الحدث فيه session = null لكن ما هو SIGNED_OUT صريح، تجاهل
  if (!session && event !== 'SIGNED_OUT') {
    // تحقق من الجلسة الفعلية قبل مسح الحالة
    return; // لا تمسح المستخدم
  }
  setSession(session);
  setUser(session?.user ?? null);
  setIsLoading(false);
});
```

### الخطوة 2: إصلاح CustomerApp.tsx
- إضافة حماية من التسجيل الخروج المتكرر بسبب تغيرات سريعة في حالة المصادقة
- استخدام `ref` لتتبع ما إذا تم تنفيذ الخروج بالفعل

### التفاصيل التقنية
- **الملفات المعدلة**: `src/context/AuthContext.tsx`, `src/components/customer/CustomerApp.tsx`
- **المنهج**: حماية الجلسة الصالحة من أخطاء تحديث التوكن عبر عدم مسح الحالة إلا عند `SIGNED_OUT` صريح

