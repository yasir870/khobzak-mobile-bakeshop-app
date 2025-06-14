
import { useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";

// هوك لقراءة جميع الزبائن وفحص حفظ الأرقام بالضبط في supabase
export function useAllCustomers() {
  useEffect(() => {
    async function fetchCustomers() {
      const { data, error } = await supabase
        .from("customers")
        .select("*")
        .order("created_at", { ascending: false });
      if (error) {
        console.error("حدث خطأ أثناء جلب الزبائن:", error);
      } else {
        console.log("جميع حسابات الزبائن من قاعدة البيانات:", data);
        if (!data || data.length === 0) {
          console.warn("جدول الزبائن فارغ! تحقق من عملية إنشاء الحساب.");
        }
        // تحقق من الحقول الفارغة أو غير المتوافقة
        data.forEach(cust => {
          if (!cust.phone || !cust.email || !cust.name) {
            console.warn("هناك زبون ناقص البيانات:", cust);
          }
        });
      }
    }
    fetchCustomers();
  }, []);
}
