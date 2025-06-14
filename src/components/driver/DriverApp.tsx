import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { LogOut, MapPin, Phone, Clock, Archive, Truck, RefreshCw } from 'lucide-react';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Info } from 'lucide-react';

type OrderStatus = 'pending' | 'accepted' | 'in-transit' | 'delivered' | 'rejected';

interface Order {
  id: number;
  customer_id: number;
  driver_id: number | null;
  type: string;
  quantity: number;
  total_price: number;
  notes: string | null;
  status: OrderStatus;
  address: string;
  customer_phone: string;
  delivered_at: string | null;
  created_at: string;
  updated_at: string;
}

interface Customer {
  id: number;
  name: string;
  phone: string;
}

interface DriverAppProps {
  onLogout: () => void;
}

const STATUS_LABELS: Record<OrderStatus, string> = {
  pending: "بانتظار القبول",
  accepted: "مقبول",
  "in-transit": "قيد التوصيل",
  delivered: "تم التسليم",
  rejected: "مرفوض",
};

const STATUS_COLOR: Record<OrderStatus, string> = {
  pending: "bg-yellow-500",
  accepted: "bg-blue-500",
  "in-transit": "bg-purple-500",
  delivered: "bg-green-500",
  rejected: "bg-red-600",
};

const TABS = [
  { key: "active", label: "الطلبات الجديدة", icon: <Truck className="h-4 w-4 mr-1" /> },
  { key: "archive", label: "الأرشيف", icon: <Archive className="h-4 w-4 mr-1" /> },
];

const DriverApp = ({ onLogout }: DriverAppProps) => {
  const [orders, setOrders] = useState<Order[]>([]);
  const [customers, setCustomers] = useState<Record<number, Customer>>({});
  const [isLoading, setIsLoading] = useState(true);
  const [tab, setTab] = useState<'active' | 'archive'>('active');
  const { toast } = useToast();

  // جلب الطلبات والعملاء
  const fetchOrders = async () => {
    setIsLoading(true);
    // جلب جميع الطلبات
    const { data: ordersData, error } = await supabase
      .from('orders')
      .select('*')
      .order('created_at', { ascending: false });
    if (error) {
      toast({
        title: "حدث خطأ",
        description: "فشل جلب الطلبات من الخادم.",
        variant: "destructive",
      });
      setIsLoading(false);
      return;
    }
    setOrders(ordersData || []);

    // جلب معلومات العملاء المرتبطة
    const customerIds = Array.from(new Set((ordersData || []).map((o: Order) => o.customer_id)));
    if (customerIds.length) {
      const { data: customersData } = await supabase
        .from('customers')
        .select('id, name, phone')
        .in('id', customerIds);
      // تحويل لماب سريعة
      const custMap: Record<number, Customer> = {};
      (customersData || []).forEach((c: Customer) => { custMap[c.id] = c });
      setCustomers(custMap);
    } else {
      setCustomers({});
    }
    setIsLoading(false);
  };

  useEffect(() => {
    fetchOrders();
    // إضافة زر تحديث في المستقبل عبر سوكيت real-time إذا رغبت
  }, []);

  // تحديث حالة الطلب
  const updateOrderStatus = async (orderId: number, nextStatus: OrderStatus) => {
    const { error } = await supabase
      .from('orders')
      .update({ status: nextStatus })
      .eq('id', orderId);
    if (error) {
      toast({
        title: "فشل تحديث الحالة",
        description: "لم يتم تغيير حالة الطلب.",
        variant: "destructive"
      });
      return;
    }
    toast({ title: "تم تحديث حالة الطلب بنجاح" });
    fetchOrders();
  };

  // تصنيف الطلبات حسب التبويب
  const filteredOrders = orders.filter(order =>
    tab === 'active'
      ? ['pending', 'accepted', 'in-transit'].includes(order.status)
      : ['delivered', 'rejected'].includes(order.status)
  );

  // إضافة حالة زر كشف كل الأرقام
  const [showAllPhones, setShowAllPhones] = useState(false);
  const [allPhones, setAllPhones] = useState<string[]>([]);
  const [loadingPhones, setLoadingPhones] = useState(false);

  // دالة جلب الأرقام من قاعدة البيانات
  const handleShowAllPhones = async () => {
    setLoadingPhones(true);
    setShowAllPhones(true);
    const { data, error } = await supabase.from('customers').select('phone');
    setLoadingPhones(false);
    if (data && Array.isArray(data)) {
      setAllPhones(data.map((e: any) => e.phone));
    } else {
      setAllPhones(['حدث خطأ في جلب الأرقام!']);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
      {/* Header */}
      <header className="bg-white/90 backdrop-blur-sm shadow-sm border-b border-blue-200">
        <div className="max-w-4xl mx-auto px-4 py-4 flex justify-between items-center">
          <div>
            <h1 className="text-2xl font-bold text-blue-800">لوحة السائق</h1>
            <p className="text-sm text-blue-600">خبزك – توصيل الطلبات</p>
          </div>
          <div className="flex gap-2 items-center">
            {/* زر فحص كل الأرقام */}
            <Button 
              variant="outline" 
              size="sm" 
              className="border-blue-600 text-blue-900"
              onClick={handleShowAllPhones}
              type="button"
            >
              <Info className="h-4 w-4 mr-1" />
              فحص كل الأرقام
            </Button>
            <Button onClick={fetchOrders} size="icon" variant="ghost" title="تحديث الطلبات">
              <RefreshCw className="h-5 w-5" />
            </Button>
            <Button onClick={onLogout} variant="ghost" size="sm">
              <LogOut className="h-4 w-4 mr-2" />
              خروج
            </Button>
          </div>
        </div>
      </header>

      {/* نافذة تعرض كل أرقام الزبائن */}
      <Dialog open={showAllPhones} onOpenChange={setShowAllPhones}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>كل أرقام الزبائن من قاعدة البيانات</DialogTitle>
            <DialogDescription>
              هذه قائمة بجميع الأرقام كما هي مخزنة في supabase (قد تحتاج لإغلاق النافذة وإعادة الضغط لجلب جديد).
            </DialogDescription>
          </DialogHeader>
          <ScrollArea className="h-56 w-full pr-2">
            {loadingPhones ? (
              <div className="text-blue-800 py-6 text-center">جاري التحميل...</div>
            ) : (
              <ul className="space-y-1 text-gray-900 text-base ltr:text-left">
                {allPhones.length === 0 ? (
                  <li>لا يوجد أرقام مسجلة.</li>
                ) : (
                  allPhones.map((phone, idx) => (
                    <li key={idx} className="border-b py-1">{phone || <span className="text-red-500">null</span>}</li>
                  ))
                )}
              </ul>
            )}
          </ScrollArea>
        </DialogContent>
      </Dialog>

      {/* Tabs */}
      <main className="max-w-4xl mx-auto px-4 pt-8 pb-16">
        <Tabs defaultValue={tab} value={tab} onValueChange={v => setTab(v as typeof tab)}>
          <TabsList className="mb-6">
            {TABS.map(t => (
              <TabsTrigger key={t.key} value={t.key}>
                {t.icon}
                {t.label}
              </TabsTrigger>
            ))}
          </TabsList>
          {TABS.map(t => (
            <TabsContent key={t.key} value={t.key}>
              <div className="space-y-4">
                {isLoading ? (
                  <div className="w-full flex justify-center py-8 text-blue-800">
                    <span className="animate-spin mr-2">⏳</span> جاري تحميل الطلبات...
                  </div>
                ) : filteredOrders.length === 0 ? (
                  <div className="p-6 text-center text-blue-700 bg-white/70 rounded-lg shadow">لا توجد طلبات حالياً.</div>
                ) : (
                  filteredOrders.map(order => {
                    const cust = customers[order.customer_id];
                    return (
                      <Card key={order.id} className="bg-white/90 backdrop-blur-sm">
                        <CardHeader>
                          <div className="flex justify-between items-start">
                            <div>
                              <CardTitle className="text-lg text-blue-800">طلب #{order.id}</CardTitle>
                              <p className="text-xs text-gray-600 flex items-center mt-0.5">
                                <Clock className="h-4 w-4 mr-1" />
                                {new Date(order.created_at).toLocaleString()}
                              </p>
                            </div>
                            <Badge className={`${STATUS_COLOR[order.status]} text-white`}>
                              {STATUS_LABELS[order.status]}
                            </Badge>
                          </div>
                        </CardHeader>
                        <CardContent>
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-3">
                            <div>
                              <h4 className="font-semibold text-blue-800 mb-2">معلومات العميل</h4>
                              <p className="text-sm text-gray-700">{cust?.name || "مجهول"}</p>
                              <p className="text-xs text-gray-600 flex items-center">
                                <Phone className="h-3 w-3 mr-1" />
                                {cust?.phone ?? order.customer_phone}
                              </p>
                            </div>
                            <div>
                              <h4 className="font-semibold text-blue-800 mb-2">عنوان التوصيل</h4>
                              <p className="text-sm text-gray-700 flex items-start">
                                <MapPin className="h-4 w-4 mr-1 mt-0.5 flex-shrink-0" />
                                {order.address}
                              </p>
                            </div>
                          </div>
                          <div className="mb-3">
                            <h4 className="font-semibold text-blue-800 mb-2">تفاصيل الطلب</h4>
                            <p className="text-xs text-gray-700">{order.type} × {order.quantity}</p>
                            {order.notes && <div className="text-xs text-gray-500 mt-1">ملاحظات: {order.notes}</div>}
                            <p className="text-base font-bold text-blue-700 mt-2">الإجمالي: {order.total_price} د.ع</p>
                          </div>
                          <div className="flex gap-2 flex-wrap">
                            {/* أزرار تغيير الحالة حسب الحالة الحالية */}
                            {order.status === 'pending' && (
                              <>
                                <Button size="sm" className="bg-green-600 hover:bg-green-700"
                                  onClick={() => updateOrderStatus(order.id, "accepted")}
                                >
                                  قبول الطلب
                                </Button>
                                <Button size="sm" variant="outline" className="text-red-600 border-red-600 hover:bg-red-50"
                                  onClick={() => updateOrderStatus(order.id, "rejected")}
                                >
                                  رفض الطلب
                                </Button>
                              </>
                            )}
                            {order.status === 'accepted' && (
                              <Button size="sm" className="bg-purple-600 hover:bg-purple-700"
                                onClick={() => updateOrderStatus(order.id, "in-transit")}
                              >
                                بدء التوصيل
                              </Button>
                            )}
                            {order.status === 'in-transit' && (
                              <Button size="sm" className="bg-blue-600 hover:bg-blue-700"
                                onClick={() => updateOrderStatus(order.id, "delivered")}
                              >
                                تم التسليم
                              </Button>
                            )}
                            {/* اتصال بالعميل */}
                            <Button size="sm" variant="outline" asChild>
                              <a href={`tel:${cust?.phone ?? order.customer_phone}`}>
                                <Phone className="h-4 w-4 mr-1" /> اتصل بالعميل
                              </a>
                            </Button>
                          </div>
                        </CardContent>
                      </Card>
                    );
                  })
                )}
              </div>
            </TabsContent>
          ))}
        </Tabs>
      </main>
    </div>
  );
};

export default DriverApp;
