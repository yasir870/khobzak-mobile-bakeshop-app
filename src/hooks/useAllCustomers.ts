
import { useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";

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
        console.log("حسابات الزبائن الموجودة الآن:", data);
      }
    }
    fetchCustomers();
  }, []);
}
