import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { LogOut, MapPin, Phone, Clock, Archive, Truck, RefreshCw, Map } from 'lucide-react';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Info } from 'lucide-react';
import { useDriverLocation } from '@/hooks/useDriverLocation';
import { useAuth } from '@/context/AuthContext';

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

const DriverApp = ({ onLogout }: DriverAppProps) => {
  const [orders, setOrders] = useState<Order[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showCompletionModal, setShowCompletionModal] = useState(false);
  const [completingOrderId, setCompletingOrderId] = useState<number | null>(null);
  const [showMapModal, setShowMapModal] = useState(false);
  const { toast } = useToast();
  const { user, getUserType, isLoading: authLoading } = useAuth();
  
  const {
    isTracking,
    error: locationError,
    startTracking,
    stopTracking,
  } = useDriverLocation({ 
    driverId: user?.id || '', 
    isActive: true 
  });

  useEffect(() => {
    const initializeDriver = async () => {
      if (authLoading) return; // Wait for auth to load
      
      if (!user) {
        toast({
          title: 'جلسة منتهية',
          description: 'انتهت جلستك. يرجى تسجيل الدخول مرة أخرى.',
          variant: 'destructive',
        });
        setTimeout(() => onLogout(), 2000);
        return;
      }

      const userType = getUserType();
      if (userType !== 'driver') {
        toast({
          title: 'غير مخول',
          description: 'هذا التطبيق مخصص للسائقين فقط.',
          variant: 'destructive',
        });
        setTimeout(() => onLogout(), 2000);
        return;
      }

      await fetchOrders();
      await fetchCustomers();
      setIsLoading(false);
    };

    initializeDriver();
  }, [user, authLoading, getUserType, onLogout, toast]);

  // Real-time subscription for new orders
  useEffect(() => {
    if (!user) return;

    // Subscribe to orders table changes
    const channel = supabase
      .channel('orders-changes')
      .on(
        'postgres_changes',
        {
          event: '*', // Listen to all events (INSERT, UPDATE, DELETE)
          schema: 'public',
          table: 'orders'
        },
        (payload) => {
          console.log('Order change received:', payload);
          
          if (payload.eventType === 'INSERT') {
            // New order added
            toast({
              title: "طلب جديد!",
              description: `تم إضافة طلب جديد #${payload.new.id}`,
            });
          }
          
          // Refresh orders list
          fetchOrders();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user, toast]);

  const fetchOrders = async () => {
    try {
      const { data, error } = await supabase
        .from('orders')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setOrders(data || []);
    } catch (error) {
      console.error('Error fetching orders:', error);
      toast({
        title: "خطأ في جلب الطلبات",
        description: "حدث خطأ أثناء جلب الطلبات",
        variant: "destructive",
      });
    }
  };

  const fetchCustomers = async () => {
    try {
      const { data, error } = await supabase
        .from('customers')
        .select('*');

      if (error) throw error;
      setCustomers(data || []);
    } catch (error) {
      console.error('Error fetching customers:', error);
      toast({
        title: "خطأ في جلب بيانات العملاء",
        description: "حدث خطأ أثناء جلب بيانات العملاء",
        variant: "destructive",
      });
    }
  };

  const handleOrderAction = async (orderId: number, action: 'accept' | 'reject' | 'deliver') => {
    try {
      let updateData: Partial<Order> = {};
      
      if (action === 'accept') {
        // Get the driver's ID from the drivers table
        const { data: driverData, error: driverError } = await supabase.rpc('get_driver_id_from_auth');
        
        if (driverError || !driverData) {
          throw new Error('فشل في الحصول على معرف السائق');
        }
        
        updateData = { 
          status: 'accepted' as OrderStatus,
          driver_id: driverData 
        };
      } else if (action === 'reject') {
        // Log detailed information for debugging
        console.log('🔍 Attempting to reject order:', {
          orderId,
          currentUserId: (await supabase.auth.getUser()).data.user?.id,
          timestamp: new Date().toISOString()
        });
        
        updateData = { status: 'rejected' as OrderStatus, driver_id: null };
        
        console.log('📝 Update data for reject:', updateData);
      } else if (action === 'deliver') {
        setCompletingOrderId(orderId);
        setShowCompletionModal(true);
        return;
      }

      console.log('🚀 Sending update to database:', {
        table: 'orders',
        orderId,
        updateData,
        action
      });

      const { data: updateResult, error } = await supabase
        .from('orders')
        .update(updateData)
        .eq('id', orderId)
        .select();

      console.log('📊 Database response:', {
        success: !error,
        error: error,
        data: updateResult,
        errorDetails: error ? {
          message: error.message,
          details: error.details,
          hint: error.hint,
          code: error.code
        } : null
      });

      if (error) {
        console.error('❌ Full error object:', JSON.stringify(error, null, 2));
        throw new Error(`فشل التحديث: ${error.message}\nالتفاصيل: ${error.details || 'لا توجد تفاصيل'}\nالرمز: ${error.code || 'غير معروف'}`);
      }

      console.log('✅ Update successful, refreshing orders...');
      await fetchOrders();
      
      toast({
        title: action === 'accept' ? "تم قبول الطلب" : action === 'reject' ? "تم رفض الطلب" : "تم تسليم الطلب",
        description: action === 'accept' ? "تم تعيين الطلب لك بنجاح" : action === 'reject' ? "تم رفض الطلب" : "تم تحديث حالة الطلب بنجاح"
      });
    } catch (error) {
      console.error('❌ خطأ في تحديث حالة الطلب:', error);
      
      // Show detailed error message
      const errorMessage = error instanceof Error ? error.message : "حدث خطأ أثناء التحديث";
      const errorDetails = error instanceof Error ? error.stack : JSON.stringify(error);
      
      console.error('💥 Stack trace:', errorDetails);
      
      toast({
        title: "فشل تحديث حالة الطلب",
        description: errorMessage,
        variant: "destructive"
      });
    }
  };

  const handleDeliveryCompletion = async () => {
    if (!completingOrderId) return;

    try {
      const { error } = await supabase
        .from('orders')
        .update({
          status: 'delivered' as OrderStatus,
          delivered_at: new Date().toISOString()
        })
        .eq('id', completingOrderId);

      if (error) throw error;

      await fetchOrders();
      setShowCompletionModal(false);
      setCompletingOrderId(null);
      
      toast({
        title: "تم إكمال التوصيل",
        description: "تم تسليم الطلب بنجاح",
      });
    } catch (error) {
      console.error('Error completing delivery:', error);
      toast({
        title: "خطأ في إكمال التوصيل",
        description: "حدث خطأ أثناء إكمال التوصيل",
        variant: "destructive",
      });
    }
  };

  const getCustomerName = (phone: string): string => {
    const customer = customers.find(c => c.phone === phone);
    return customer?.name || phone;
  };

  if (authLoading || isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">جاري التحميل...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto p-4 max-w-4xl">
        {/* Header */}
        <div className="flex justify-between items-center mb-6">
          <div className="flex items-center space-x-2 rtl:space-x-reverse">
            <Truck className="h-6 w-6 text-primary" />
            <h1 className="text-2xl font-bold text-foreground">تطبيق السائق</h1>
          </div>
          <div className="flex items-center space-x-2 rtl:space-x-reverse">
            <Button
              variant="ghost"
              size="sm"
              onClick={fetchOrders}
              className="flex items-center space-x-2 rtl:space-x-reverse"
              disabled={isLoading}
            >
              <RefreshCw className={`h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowMapModal(true)}
              className="flex items-center space-x-2 rtl:space-x-reverse"
            >
              <Map className="h-4 w-4" />
              <span>الخريطة</span>
            </Button>
            <Button
              variant="outline"
              onClick={onLogout}
              className="flex items-center space-x-2 rtl:space-x-reverse"
            >
              <LogOut className="h-4 w-4" />
              <span>تسجيل الخروج</span>
            </Button>
          </div>
        </div>

        {/* Location Status */}
        <Card className="mb-6">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-3 rtl:space-x-reverse">
                <MapPin className="h-5 w-5 text-primary" />
                <div>
                  <p className="text-sm font-medium">حالة الموقع</p>
                  {isTracking ? (
                    <p className="text-sm text-muted-foreground">
                      الموقع محدث - {new Date().toLocaleTimeString('ar-IQ')}
                    </p>
                  ) : (
                    <p className="text-sm text-destructive">الموقع غير متاح</p>
                  )}
                </div>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={isTracking ? stopTracking : startTracking}
                disabled={false}
                className="flex items-center space-x-2 rtl:space-x-reverse"
              >
                <RefreshCw className={`h-4 w-4`} />
                <span>{isTracking ? 'إيقاف التتبع' : 'بدء التتبع'}</span>
              </Button>
            </div>
            {locationError && (
              <p className="text-sm text-destructive mt-2">{locationError}</p>
            )}
          </CardContent>
        </Card>

        {/* Orders Tabs */}
        <Tabs defaultValue="available" className="w-full">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="available">الطلبات المتاحة</TabsTrigger>
            <TabsTrigger value="active">طلباتي الحالية</TabsTrigger>
            <TabsTrigger value="completed">الطلبات المكتملة</TabsTrigger>
          </TabsList>

          {/* Available Orders */}
          <TabsContent value="available" className="space-y-4">
            {orders
              .filter(order => order.status === 'pending')
              .map(order => (
                <Card key={order.id} className="border-l-4 border-l-primary">
                  <CardHeader className="pb-3">
                    <div className="flex justify-between items-start">
                      <CardTitle className="text-lg">طلب رقم #{order.id}</CardTitle>
                      <Badge variant="secondary">{STATUS_LABELS[order.status]}</Badge>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div className="grid grid-cols-2 gap-4 text-sm">
                      <div className="flex items-center space-x-2 rtl:space-x-reverse">
                        <Clock className="h-4 w-4 text-muted-foreground" />
                        <span>{new Date(order.created_at).toLocaleDateString('ar-IQ')}</span>
                      </div>
                      <div className="flex items-center space-x-2 rtl:space-x-reverse">
                        <Phone className="h-4 w-4 text-muted-foreground" />
                        <span>{getCustomerName(order.customer_phone)}</span>
                      </div>
                    </div>
                    
                    <div className="space-y-2">
                      <p><strong>النوع:</strong> {order.type}</p>
                      <p><strong>الكمية:</strong> {order.quantity}</p>
                      <p><strong>السعر:</strong> {order.total_price} د.ع</p>
                      <p><strong>العنوان:</strong> {order.address}</p>
                      {order.notes && <p><strong>ملاحظات:</strong> {order.notes}</p>}
                    </div>

                    <div className="flex space-x-2 rtl:space-x-reverse pt-2">
                      <Button
                        onClick={() => handleOrderAction(order.id, 'accept')}
                        className="flex-1"
                        size="sm"
                      >
                        قبول الطلب
                      </Button>
                      <Button
                        variant="outline"
                        onClick={() => handleOrderAction(order.id, 'reject')}
                        className="flex-1"
                        size="sm"
                      >
                        رفض الطلب
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))
            }
            {orders.filter(order => order.status === 'pending').length === 0 && (
              <Card>
                <CardContent className="text-center py-8">
                  <Archive className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                  <p className="text-muted-foreground">لا توجد طلبات متاحة حالياً</p>
                </CardContent>
              </Card>
            )}
          </TabsContent>

          {/* Active Orders */}
          <TabsContent value="active" className="space-y-4">
            {orders
              .filter(order => ['accepted', 'in-transit'].includes(order.status))
              .map(order => (
                <Card key={order.id} className="border-l-4 border-l-primary">
                  <CardHeader className="pb-3">
                    <div className="flex justify-between items-start">
                      <CardTitle className="text-lg">طلب رقم #{order.id}</CardTitle>
                      <Badge>{STATUS_LABELS[order.status]}</Badge>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div className="grid grid-cols-2 gap-4 text-sm">
                      <div className="flex items-center space-x-2 rtl:space-x-reverse">
                        <Clock className="h-4 w-4 text-muted-foreground" />
                        <span>{new Date(order.created_at).toLocaleDateString('ar-IQ')}</span>
                      </div>
                      <div className="flex items-center space-x-2 rtl:space-x-reverse">
                        <Phone className="h-4 w-4 text-muted-foreground" />
                        <span>{getCustomerName(order.customer_phone)}</span>
                      </div>
                    </div>
                    
                    <div className="space-y-2">
                      <p><strong>النوع:</strong> {order.type}</p>
                      <p><strong>الكمية:</strong> {order.quantity}</p>
                      <p><strong>السعر:</strong> {order.total_price} د.ع</p>
                      <p><strong>العنوان:</strong> {order.address}</p>
                      {order.notes && <p><strong>ملاحظات:</strong> {order.notes}</p>}
                    </div>

                    <div className="flex space-x-2 rtl:space-x-reverse pt-2">
                      {order.status === 'accepted' && (
                        <Button
                          onClick={() => handleOrderAction(order.id, 'deliver')}
                          className="w-full"
                          size="sm"
                        >
                          تأكيد التسليم
                        </Button>
                      )}
                    </div>
                  </CardContent>
                </Card>
              ))
            }
            {orders.filter(order => ['accepted', 'in-transit'].includes(order.status)).length === 0 && (
              <Card>
                <CardContent className="text-center py-8">
                  <Archive className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                  <p className="text-muted-foreground">لا توجد طلبات نشطة حالياً</p>
                </CardContent>
              </Card>
            )}
          </TabsContent>

          {/* Completed Orders */}
          <TabsContent value="completed" className="space-y-4">
            {orders
              .filter(order => ['delivered', 'rejected'].includes(order.status))
              .map(order => (
                <Card key={order.id} className="opacity-75">
                  <CardHeader className="pb-3">
                    <div className="flex justify-between items-start">
                      <CardTitle className="text-lg">طلب رقم #{order.id}</CardTitle>
                      <Badge variant={order.status === 'delivered' ? 'default' : 'destructive'}>
                        {STATUS_LABELS[order.status]}
                      </Badge>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div className="grid grid-cols-2 gap-4 text-sm">
                      <div className="flex items-center space-x-2 rtl:space-x-reverse">
                        <Clock className="h-4 w-4 text-muted-foreground" />
                        <span>{new Date(order.created_at).toLocaleDateString('ar-IQ')}</span>
                      </div>
                      <div className="flex items-center space-x-2 rtl:space-x-reverse">
                        <Phone className="h-4 w-4 text-muted-foreground" />
                        <span>{getCustomerName(order.customer_phone)}</span>
                      </div>
                    </div>
                    
                    <div className="space-y-2">
                      <p><strong>النوع:</strong> {order.type}</p>
                      <p><strong>الكمية:</strong> {order.quantity}</p>
                      <p><strong>السعر:</strong> {order.total_price} د.ع</p>
                      <p><strong>العنوان:</strong> {order.address}</p>
                      {order.notes && <p><strong>ملاحظات:</strong> {order.notes}</p>}
                      {order.delivered_at && (
                        <p><strong>تاريخ التسليم:</strong> {new Date(order.delivered_at).toLocaleString('ar-IQ')}</p>
                      )}
                    </div>
                  </CardContent>
                </Card>
              ))
            }
            {orders.filter(order => ['delivered', 'rejected'].includes(order.status)).length === 0 && (
              <Card>
                <CardContent className="text-center py-8">
                  <Archive className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                  <p className="text-muted-foreground">لا توجد طلبات مكتملة</p>
                </CardContent>
              </Card>
            )}
          </TabsContent>
        </Tabs>

        {/* Completion Confirmation Modal */}
        <Dialog open={showCompletionModal} onOpenChange={setShowCompletionModal}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>تأكيد التسليم</DialogTitle>
              <DialogDescription>
                هل تؤكد تسليم الطلب رقم #{completingOrderId}؟
              </DialogDescription>
            </DialogHeader>
            <div className="flex justify-end space-x-2 rtl:space-x-reverse mt-4">
              <Button
                variant="outline"
                onClick={() => setShowCompletionModal(false)}
              >
                إلغاء
              </Button>
              <Button onClick={handleDeliveryCompletion}>
                تأكيد التسليم
              </Button>
            </div>
          </DialogContent>
        </Dialog>

        {/* Map Modal - تم تعطيل الخريطة مؤقتاً */}
        <Dialog open={showMapModal} onOpenChange={setShowMapModal}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>خريطة الطلبات</DialogTitle>
              <DialogDescription>
                ميزة الخريطة قيد التطوير حالياً
              </DialogDescription>
            </DialogHeader>
            <div className="text-center py-4">
              <Map className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <p className="text-muted-foreground">سيتم إضافة خريطة تفاعلية قريباً</p>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
};

export default DriverApp;
