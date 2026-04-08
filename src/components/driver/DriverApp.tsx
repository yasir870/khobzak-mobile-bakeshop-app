import { useEffect, useRef, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { LogOut, MapPin, Phone, Clock, Archive, Truck, RefreshCw, Map, CheckCircle, Navigation, Key } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Info } from 'lucide-react';
import { useDriverLocation } from '@/hooks/useDriverLocation';
import { useAuth } from '@/context/AuthContext';
import DriverMapModal from './DriverMapModal';

type OrderStatus = 'pending' | 'accepted' | 'on_the_way' | 'in-transit' | 'delivered' | 'received' | 'rejected';

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
  pending: 'بانتظار القبول',
  accepted: 'مقبول',
  on_the_way: 'في الطريق',
  'in-transit': 'قيد التوصيل',
  delivered: 'تم التسليم',
  received: 'تم الاستلام',
  rejected: 'مرفوض',
};

const DriverApp = ({ onLogout }: DriverAppProps) => {
  const [orders, setOrders] = useState<Order[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showCompletionModal, setShowCompletionModal] = useState(false);
  const [completingOrderId, setCompletingOrderId] = useState<number | null>(null);
  const [showCodeModal, setShowCodeModal] = useState(false);
  const [confirmationCode, setConfirmationCode] = useState('');
  const [codeInput, setCodeInput] = useState('');
  const [codeError, setCodeError] = useState('');
  const [isSendingCode, setIsSendingCode] = useState(false);
  const [isVerifyingCode, setIsVerifyingCode] = useState(false);
  const [showMapModal, setShowMapModal] = useState(false);
  const [selectedOrderForMap, setSelectedOrderForMap] = useState<Order | null>(null);
  const { toast } = useToast();
  const { user, session, getUserType, isLoading: authLoading } = useAuth();
  const activeUser = user ?? session?.user ?? null;
  const logoutTriggered = useRef(false);
  
  const {
    isTracking,
    error: locationError,
    startTracking,
    stopTracking,
  } = useDriverLocation({
    driverId: activeUser?.id || '',
    isActive: true,
  });

  useEffect(() => {
    const initializeDriver = async () => {
      if (authLoading) return;

      if (!activeUser) {
        if (logoutTriggered.current) return;
        logoutTriggered.current = true;
        toast({
          title: 'جلسة منتهية',
          description: 'انتهت جلستك. يرجى تسجيل الدخول مرة أخرى.',
          variant: 'destructive',
        });
        setTimeout(() => onLogout(), 2000);
        return;
      }

      logoutTriggered.current = false;

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
  }, [activeUser, authLoading, getUserType, onLogout, toast]);

  useEffect(() => {
    if (!activeUser) return;

    const channel = supabase
      .channel('orders-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'orders',
        },
        (payload) => {
          console.log('Order change received:', payload);

          if (payload.eventType === 'INSERT') {
            toast({
              title: 'طلب جديد!',
              description: `تم إضافة طلب جديد #${payload.new.id}`,
            });
          } else if (payload.eventType === 'UPDATE' && payload.new.status === 'received') {
            toast({
              title: 'تم استلام الطلب ✅',
              description: `تم تأكيد استلام الطلب #${payload.new.id} من قبل العميل`,
            });
          }

          fetchOrders();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [activeUser, toast]);
      supabase.removeChannel(channel);
    };
  }, [activeUser, toast]);

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

  const handleOrderAction = async (orderId: number, action: 'accept' | 'reject' | 'deliver' | 'start_delivery') => {
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
      } else if (action === 'start_delivery') {
        updateData = { status: 'on_the_way' as OrderStatus };
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
        // Generate confirmation code and send to customer
        setCompletingOrderId(orderId);
        setIsSendingCode(true);
        setCodeInput('');
        setCodeError('');
        
        try {
          const order = orders.find(o => o.id === orderId);
          if (!order) throw new Error('الطلب غير موجود');

          // Generate 4-digit code
          const code = Math.floor(1000 + Math.random() * 9000).toString();
          setConfirmationCode(code);

          // Get driver ID
          const { data: driverId } = await supabase.rpc('get_driver_id_from_auth');
          if (!driverId) throw new Error('فشل في الحصول على معرف السائق');

          // Save code to delivery_codes table
          const { error: codeError } = await supabase
            .from('delivery_codes')
            .insert({
              order_id: orderId,
              code,
              driver_id: driverId,
              customer_phone: order.customer_phone,
            });

          if (codeError) throw codeError;

          // Send notification to customer
          const { error: notifError } = await supabase
            .from('notifications')
            .insert({
              customer_phone: order.customer_phone,
              order_id: orderId,
              title: '🔑 رمز تأكيد التسليم',
              message: `رمز التأكيد لطلبك #${orderId} هو: ${code} - أعطِ هذا الرمز للسائق عند الاستلام`,
              type: 'delivery_code',
            });

          if (notifError) throw notifError;

          setShowCodeModal(true);
          toast({
            title: 'تم إرسال رمز التأكيد',
            description: `تم إرسال رمز التأكيد إلى الزبون`,
          });
        } catch (err) {
          console.error('Error generating delivery code:', err);
          toast({
            title: 'خطأ',
            description: 'فشل في إنشاء رمز التأكيد',
            variant: 'destructive',
          });
        } finally {
          setIsSendingCode(false);
        }
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

  const handleVerifyCode = async () => {
    if (!completingOrderId || !codeInput) return;
    
    setIsVerifyingCode(true);
    setCodeError('');

    try {
      // Verify the code matches
      const { data: codeData, error: fetchErr } = await supabase
        .from('delivery_codes')
        .select('*')
        .eq('order_id', completingOrderId)
        .eq('is_used', false)
        .single();

      if (fetchErr || !codeData) {
        setCodeError('لم يتم العثور على رمز التأكيد');
        return;
      }

      if (codeData.code !== codeInput) {
        setCodeError('رمز التأكيد غير صحيح');
        return;
      }

      // Mark code as used
      await supabase
        .from('delivery_codes')
        .update({ is_used: true })
        .eq('id', codeData.id);

      // Mark order as delivered
      const { error } = await supabase
        .from('orders')
        .update({
          status: 'delivered' as OrderStatus,
          delivered_at: new Date().toISOString()
        })
        .eq('id', completingOrderId);

      if (error) throw error;

      // Send delivery confirmed notification
      const order = orders.find(o => o.id === completingOrderId);
      if (order) {
        await supabase
          .from('notifications')
          .insert({
            customer_phone: order.customer_phone,
            order_id: completingOrderId,
            title: '✅ تم تسليم طلبك',
            message: `تم تسليم طلبك #${completingOrderId} بنجاح. شكراً لاستخدامك خبزك!`,
            type: 'delivered',
          });
      }

      await fetchOrders();
      setShowCodeModal(false);
      setCompletingOrderId(null);
      setCodeInput('');
      setConfirmationCode('');
      
      toast({
        title: "تم إكمال التوصيل",
        description: "تم تأكيد التسليم بنجاح",
      });
    } catch (error) {
      console.error('Error verifying code:', error);
      toast({
        title: "خطأ في التحقق",
        description: "حدث خطأ أثناء التحقق من الرمز",
        variant: "destructive",
      });
    } finally {
      setIsVerifyingCode(false);
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
              .filter(order => ['accepted', 'on_the_way', 'in-transit'].includes(order.status))
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

                    <div className="flex flex-col space-y-2 pt-2">
                      {/* زر الخريطة */}
                      <Button
                        onClick={() => {
                          setSelectedOrderForMap(order);
                          setShowMapModal(true);
                        }}
                        variant="outline"
                        className="w-full border-blue-600 text-blue-700 hover:bg-blue-50"
                        size="sm"
                      >
                        <Navigation className="h-4 w-4 ml-2" />
                        عرض الخريطة والتوجه للعميل
                      </Button>
                      
                      <div className="flex space-x-2 rtl:space-x-reverse">
                        {order.status === 'accepted' && (
                          <Button
                            onClick={() => handleOrderAction(order.id, 'start_delivery')}
                            className="flex-1 bg-blue-600 hover:bg-blue-700"
                            size="sm"
                          >
                            <Truck className="h-4 w-4 ml-2" />
                            بدء التوصيل
                          </Button>
                        )}
                        {order.status === 'on_the_way' && (
                          <Button
                            onClick={() => handleOrderAction(order.id, 'deliver')}
                            className="flex-1 bg-green-600 hover:bg-green-700"
                            size="sm"
                          >
                            <CheckCircle className="h-4 w-4 ml-2" />
                            تأكيد التسليم
                          </Button>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))
            }
            {orders.filter(order => ['accepted', 'on_the_way', 'in-transit'].includes(order.status)).length === 0 && (
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
              .filter(order => ['delivered', 'received', 'rejected'].includes(order.status))
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

        {/* Code Verification Modal */}
        <Dialog open={showCodeModal} onOpenChange={(open) => {
          if (!open) {
            setShowCodeModal(false);
            setCodeInput('');
            setCodeError('');
          }
        }}>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Key className="h-5 w-5 text-primary" />
                تأكيد التسليم - طلب #{completingOrderId}
              </DialogTitle>
              <DialogDescription>
                تم إرسال رمز تأكيد مكون من 4 أرقام إلى الزبون عبر الإشعارات. اطلب الرمز من الزبون وأدخله هنا.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 mt-2">
              <div className="p-3 bg-amber-50 rounded-lg border border-amber-200 text-center">
                <p className="text-sm text-amber-700 font-medium">اطلب من الزبون فتح الإشعارات في التطبيق</p>
                <p className="text-xs text-amber-600 mt-1">الرمز موجود في إشعارات الزبون</p>
              </div>
              <div>
                <label className="text-sm font-medium text-foreground mb-2 block">أدخل رمز التأكيد:</label>
                <Input
                  type="text"
                  inputMode="numeric"
                  maxLength={4}
                  placeholder="_ _ _ _"
                  value={codeInput}
                  onChange={(e) => {
                    setCodeInput(e.target.value.replace(/\D/g, '').slice(0, 4));
                    setCodeError('');
                  }}
                  className="text-center text-2xl font-bold tracking-[0.5em] h-14"
                  dir="ltr"
                />
                {codeError && (
                  <p className="text-sm text-destructive mt-2 text-center">{codeError}</p>
                )}
              </div>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  onClick={() => {
                    setShowCodeModal(false);
                    setCodeInput('');
                    setCodeError('');
                  }}
                  className="flex-1"
                >
                  إلغاء
                </Button>
                <Button
                  onClick={handleVerifyCode}
                  disabled={codeInput.length !== 4 || isVerifyingCode}
                  className="flex-1 bg-green-600 hover:bg-green-700"
                >
                  {isVerifyingCode ? (
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white" />
                  ) : (
                    <>
                      <CheckCircle className="h-4 w-4 ml-2" />
                      تأكيد
                    </>
                  )}
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>

        {/* Map Modal للسائق */}
        {selectedOrderForMap && (() => {
          // Extract GPS coordinates from address - multiple formats support
          // Format 1: "GPS: lat, lng" or "GPS lat, lng"
          // Format 2: "إحداثيات للسائق: GPS ... lat, lng" at end of address
          // Format 3: Just coordinates "lat, lng" at end
          let lat: number | null = null;
          let lng: number | null = null;
          
          const address = selectedOrderForMap.address || '';
          
          // Try format: coordinates at end like "36.855541, 42.842285"
          const endCoordsMatch = address.match(/([-]?\d+\.?\d*),\s*([-]?\d+\.?\d*)\s*$/);
          if (endCoordsMatch) {
            const coord1 = parseFloat(endCoordsMatch[1]);
            const coord2 = parseFloat(endCoordsMatch[2]);
            // Determine which is lat and which is lng based on typical Iraq coordinates
            // Iraq: lat ~29-37, lng ~38-48
            if (coord1 >= 29 && coord1 <= 42 && coord2 >= 38 && coord2 <= 50) {
              lat = coord1;
              lng = coord2;
            } else if (coord2 >= 29 && coord2 <= 42 && coord1 >= 38 && coord1 <= 50) {
              lat = coord2;
              lng = coord1;
            }
          }
          
          // Try format: "GPS: lat, lng" or "GPS lat, lng"
          if (!lat || !lng) {
            const gpsMatch = address.match(/GPS[:\s]+([-]?\d+\.?\d*)[,\s]+([-]?\d+\.?\d*)/i);
            if (gpsMatch) {
              lat = parseFloat(gpsMatch[1]);
              lng = parseFloat(gpsMatch[2]);
            }
          }
          
          // Default to Baghdad if no coordinates found
          const customerLocation = (lat && lng) 
            ? { lat, lng, address }
            : { lat: 33.3152, lng: 44.3661, address };
          
          console.log('Extracted coordinates:', { lat, lng, originalAddress: address });
          
          return (
            <DriverMapModal
              isOpen={showMapModal}
              onClose={() => {
                setShowMapModal(false);
                setSelectedOrderForMap(null);
              }}
              customerLocation={customerLocation}
              customerName={getCustomerName(selectedOrderForMap.customer_phone)}
              customerPhone={selectedOrderForMap.customer_phone}
              orderInfo={{
                id: selectedOrderForMap.id,
                type: selectedOrderForMap.type,
                quantity: selectedOrderForMap.quantity,
                address: selectedOrderForMap.address,
                totalPrice: selectedOrderForMap.total_price
              }}
            />
          );
        })()}
      </div>
    </div>
  );
};

export default DriverApp;
