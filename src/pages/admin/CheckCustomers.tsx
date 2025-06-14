
import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { supabase } from "@/integrations/supabase/client";

interface Customer {
  id: number;
  name: string | null;
  email: string | null;
  phone: string | null;
  created_at: string;
}

export default function CheckCustomersPage() {
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchCustomers() {
      setLoading(true);
      const { data, error } = await supabase.from("customers").select("*").order("created_at", { ascending: false });
      if (error) {
        alert("ERROR: " + error.message);
        setCustomers([]);
      } else {
        setCustomers(data || []);
      }
      setLoading(false);
    }
    fetchCustomers();
  }, []);

  return (
    <div className="min-h-screen bg-gradient-to-br from-amber-50 to-orange-100 flex items-center justify-center p-4">
      <Card className="max-w-2xl w-full shadow-lg border-0 bg-white/90 backdrop-blur-sm">
        <CardHeader className="pb-2">
          <CardTitle className="text-xl text-amber-800">جرد جميع حسابات الزبائن (customers) — لوحة خاصة للإدارة</CardTitle>
          <p className="text-amber-700 text-sm pt-1">
            يعرض جميع الزبائن مع تمييز أي صف ناقص الحقول الأساسية، مباشر من Supabase.
          </p>
        </CardHeader>
        <CardContent>
          <ScrollArea className="h-[500px] w-full pr-2">
            {loading ? (
              <div className="my-12 text-center text-amber-700 font-bold">جاري التحميل...</div>
            ) : (
              <table className="min-w-full text-sm text-gray-800">
                <thead>
                  <tr className="bg-amber-100">
                    <th className="px-2 py-1 border-b">ID</th>
                    <th className="px-2 py-1 border-b">Name</th>
                    <th className="px-2 py-1 border-b">Email</th>
                    <th className="px-2 py-1 border-b">Phone</th>
                    <th className="px-2 py-1 border-b">Created At</th>
                  </tr>
                </thead>
                <tbody>
                  {customers.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="py-8 text-center text-red-400 font-bold">لا يوجد زبائن مسجلين...</td>
                    </tr>
                  ) : (
                    customers.map((c) => {
                      const hasWarning = !c.name || !c.email || !c.phone;
                      return (
                        <tr
                          key={c.id}
                          className={
                            hasWarning
                              ? "bg-red-100 text-red-700 font-semibold"
                              : ""
                          }
                        >
                          <td className="px-2 py-1 border-b text-center">{c.id}</td>
                          <td className="px-2 py-1 border-b">{c.name || <Badge variant="destructive">null</Badge>}</td>
                          <td className="px-2 py-1 border-b">{c.email || <Badge variant="destructive">null</Badge>}</td>
                          <td className="px-2 py-1 border-b">{c.phone || <Badge variant="destructive">null</Badge>}</td>
                          <td className="px-2 py-1 border-b text-xs">{c.created_at}</td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            )}
          </ScrollArea>
        </CardContent>
      </Card>
    </div>
  );
}
