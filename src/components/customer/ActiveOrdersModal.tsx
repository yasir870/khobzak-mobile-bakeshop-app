import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { X, MapPin, Clock, Phone, User, Truck, AlertCircle, Loader2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface Order {
  id: number;
  status: string;
  address: string;
  customer_phone: string;
  type: string;
  quantity: number;
  total_price: number;
  driver_id?: number;
  created_at: string;
  notes?: string;
}

interface ActiveOrdersModalProps {
  isOpen: boolean;
  onClose: () => void;
  onTrackOrder: (order: Order) => void;
}

const ActiveOrdersModal = ({ isOpen, onClose, onTrackOrder }: ActiveOrdersModalProps) => {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { toast } = useToast();

  const fetchActiveOrders = async () => {
    setLoading(true);
    setError(null);
    
    try {
      const userPhone = localStorage.getItem('userPhone');
      if (!userPhone) {
        setError('لم يتم العثور على رقم الهاتف. يرجى تسجيل الدخول مرة أخرى');
        return;
      }

      const { data, error: fetchError } = await supabase
        .from('orders')
        .select('*')
        .eq('customer_phone', userPhone)
        .in('status', ['pending', 'accepted', 'in-transit', 'confirmed', 'in_progress'])
        .order('created_at', { ascending: false });

      if (fetchError) {
        console.error('خطأ في جلب الطلبات:', fetchError);
        setError('حدث خطأ في جلب الطلبات. يرجى المحاولة مرة أخرى');
        return;
      }

      setOrders(data || []);
      
      if (!data || data.length === 0) {
        setError('لا توجد طلبات نشطة حالياً');
      }
    } catch (err) {
      console.error('خطأ عام:', err);
      setError('حدث خطأ غير متوقع');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      fetchActiveOrders();
    }
  }, [isOpen]);

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending': return 'bg-yellow-500 hover:bg-yellow-600';
      case 'accepted': return 'bg-blue-500 hover:bg-blue-600';
      case 'confirmed': return 'bg-blue-500 hover:bg-blue-600';
      case 'in-transit': return 'bg-green-500 hover:bg-green-600';
      case 'in_progress': return 'bg-green-500 hover:bg-green-600';
      default: return 'bg-gray-500 hover:bg-gray-600';
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'pending': return 'في الانتظار';
      case 'accepted': return 'مقبول من السائق';
      case 'confirmed': return 'مؤكد';
      case 'in-transit': return 'قيد التوصيل';
      case 'in_progress': return 'قيد التوصيل';
      default: return status;
    }
  };

  const getTrackingAvailability = (order: Order) => {
    if (!order.driver_id) {
      return {
        canTrack: false,
        reason: 'لم يتم تعيين سائق بعد',
        icon: Clock,
        color: 'text-yellow-600'
      };
    }
    
    if (order.status === 'pending') {
      return {
        canTrack: false,
        reason: 'في انتظار قبول السائق',
        icon: Clock,
        color: 'text-yellow-600'
      };
    }
    
    if (order.status === 'accepted' || order.status === 'confirmed' || order.status === 'in-transit' || order.status === 'in_progress') {
      return {
        canTrack: true,
        reason: 'متاح للتتبع',
        icon: MapPin,
        color: 'text-green-600'
      };
    }
    
    return {
      canTrack: false,
      reason: 'غير متاح للتتبع',
      icon: AlertCircle,
      color: 'text-red-600'
    };
  };

  const handleTrackOrder = async (order: Order) => {
    const trackingInfo = getTrackingAvailability(order);
    
    if (!trackingInfo.canTrack) {
      toast({
        title: "لا يمكن تتبع هذا الطلب",
        description: trackingInfo.reason,
        variant: "destructive"
      });
      return;
    }

    // تحقق من وجود موقع السائق فعلياً
    try {
      const { data: driverLocation, error } = await supabase
        .from('driver_locations')
        .select('*')
        .eq('driver_id', order.driver_id)
        .single();

      if (error || !driverLocation) {
        toast({
          title: "موقع السائق غير متاح",
          description: "السائق لم يقم بتشغيل تتبع الموقع بعد. يرجى المحاولة لاحقاً",
          variant: "destructive"
        });
        return;
      }

      // إذا كان كل شيء صحيح، افتح نافذة التتبع
      onTrackOrder(order);
      onClose();
      
      toast({
        title: "تم فتح نافذة التتبع",
        description: "يمكنك الآن متابعة موقع السائق في الوقت الفعلي"
      });
      
    } catch (err) {
      console.error('خطأ في فحص موقع السائق:', err);
      toast({
        title: "خطأ في النظام",
        description: "حدث خطأ أثناء فحص موقع السائق. يرجى المحاولة مرة أخرى",
        variant: "destructive"
      });
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[80vh]">
        <DialogHeader>
          <div className="flex items-center justify-between">
            <DialogTitle className="text-right text-xl font-bold">الطلبات النشطة</DialogTitle>
            <Button variant="ghost" size="sm" onClick={onClose}>
              <X className="h-4 w-4" />
            </Button>
          </div>
        </DialogHeader>

        <div className="mt-4">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <div className="text-center">
                <Loader2 className="h-8 w-8 animate-spin mx-auto mb-2 text-blue-500" />
                <p className="text-sm text-gray-600">جاري جلب الطلبات...</p>
              </div>
            </div>
          ) : error ? (
            <div className="flex items-center justify-center py-12">
              <div className="text-center">
                <AlertCircle className="h-12 w-12 mx-auto mb-4 text-red-500" />
                <h3 className="text-lg font-semibold mb-2 text-red-700">خطأ</h3>
                <p className="text-sm text-gray-600 mb-4">{error}</p>
                <Button 
                  variant="outline" 
                  onClick={fetchActiveOrders}
                  className="border-blue-500 text-blue-700 hover:bg-blue-50"
                >
                  إعادة المحاولة
                </Button>
              </div>
            </div>
          ) : (
            <ScrollArea className="max-h-[500px]">
              <div className="space-y-4">
                {orders.map((order, index) => {
                  const trackingInfo = getTrackingAvailability(order);
                  const IconComponent = trackingInfo.icon;
                  
                  return (
                    <Card key={order.id} className="hover:shadow-md transition-shadow">
                      <CardContent className="p-4">
                        <div className="flex items-start justify-between mb-3">
                          <div className="flex items-center gap-3">
                            <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center font-bold text-blue-700">
                              {index + 1}
                            </div>
                            <div>
                              <h3 className="font-semibold text-lg">طلب #{order.id}</h3>
                              <p className="text-sm text-gray-500">
                                {new Date(order.created_at).toLocaleDateString('ar-IQ', {
                                  year: 'numeric',
                                  month: 'long',
                                  day: 'numeric',
                                  hour: '2-digit',
                                  minute: '2-digit'
                                })}
                              </p>
                            </div>
                          </div>
                          <Badge className={`${getStatusColor(order.status)} text-white`}>
                            {getStatusText(order.status)}
                          </Badge>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-4">
                          <div className="flex items-center gap-2">
                            <MapPin className="h-4 w-4 text-gray-500" />
                            <span className="text-sm">{order.address}</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <Phone className="h-4 w-4 text-gray-500" />
                            <span className="text-sm">{order.customer_phone}</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <span className="text-sm font-medium">النوع:</span>
                            <span className="text-sm">{order.type}</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <span className="text-sm font-medium">الكمية:</span>
                            <span className="text-sm">{order.quantity} قطعة</span>
                          </div>
                        </div>

                        {order.notes && (
                          <div className="mb-4 p-2 bg-gray-50 rounded">
                            <span className="text-sm font-medium">ملاحظات: </span>
                            <span className="text-sm">{order.notes}</span>
                          </div>
                        )}

                        <Separator className="my-3" />

                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <IconComponent className={`h-4 w-4 ${trackingInfo.color}`} />
                            <span className={`text-sm ${trackingInfo.color} font-medium`}>
                              {trackingInfo.reason}
                            </span>
                          </div>
                          
                          <div className="flex gap-2">
                            <span className="text-lg font-bold text-green-600">
                              {order.total_price.toLocaleString()} د.ع
                            </span>
                            <Button
                              onClick={() => handleTrackOrder(order)}
                              disabled={!trackingInfo.canTrack}
                              size="sm"
                              className={`${
                                trackingInfo.canTrack 
                                  ? 'bg-blue-600 hover:bg-blue-700 text-white' 
                                  : 'bg-gray-200 text-gray-500 cursor-not-allowed'
                              }`}
                            >
                              <Truck className="h-4 w-4 ml-2" />
                              {trackingInfo.canTrack ? 'تتبع الآن' : 'غير متاح'}
                            </Button>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            </ScrollArea>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default ActiveOrdersModal;