
import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Clock, Package, CheckCircle, ShoppingBag, Truck, MapPin } from 'lucide-react';
import { useTranslation } from '@/context/LanguageContext';
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

interface OrdersDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onTrackOrder?: (order: Order) => void;
}

const OrdersDialog = ({ open, onOpenChange, onTrackOrder }: OrdersDialogProps) => {
  const { t } = useTranslation();
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  const fetchOrders = async () => {
    setLoading(true);
    try {
      const { data: userData } = await supabase.auth.getUser();
      const authUser = userData?.user;
      
      if (!authUser) return;

      const { data: profile } = await supabase
        .from('profiles')
        .select('phone')
        .eq('id', authUser.id)
        .maybeSingle();

      const userPhone = profile?.phone || authUser.user_metadata?.phone;
      if (!userPhone) return;

      const { data, error } = await supabase
        .from('orders')
        .select('*')
        .eq('customer_phone', userPhone)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setOrders(data || []);
    } catch (error) {
      console.error('Error fetching orders:', error);
      toast({
        title: "خطأ",
        description: "فشل تحميل الطلبات",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (open) {
      fetchOrders();
    }
  }, [open]);

  // Real-time subscription for order status updates
  useEffect(() => {
    if (!open) return;

    const channel = supabase
      .channel('customer-orders-changes')
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'orders'
        },
        (payload) => {
          console.log('Order status updated:', payload);
          
          // Show notification based on status change
          if (payload.new.status === 'accepted') {
            toast({
              title: "تم قبول الطلب ✅",
              description: `الطلب #${payload.new.id} تم قبوله من قبل السائق`,
            });
          } else if (payload.new.status === 'on_the_way') {
            toast({
              title: "السائق في الطريق 🚚",
              description: `الطلب #${payload.new.id} في طريقه إليك`,
            });
          } else if (payload.new.status === 'received') {
            toast({
              title: "تم الاستلام ✨",
              description: `تم تأكيد استلام الطلب #${payload.new.id}`,
            });
          }
          
          // Refresh orders
          fetchOrders();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [open, toast]);

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'delivered':
        return <CheckCircle className="h-3 w-3 text-green-600" />;
      case 'in-transit':
      case 'in_progress':
        return <Package className="h-3 w-3 text-blue-600" />;
      case 'accepted':
      case 'confirmed':
        return <Clock className="h-3 w-3 text-blue-600" />;
      case 'pending':
        return <Clock className="h-3 w-3 text-yellow-600" />;
      default:
        return <Clock className="h-3 w-3 text-amber-600" />;
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'delivered':
        return 'تم التسليم';
      case 'received':
        return 'تم الاستلام';
      case 'on_the_way':
        return 'في الطريق';
      case 'in-transit':
      case 'in_progress':
        return 'قيد التوصيل';
      case 'accepted':
        return 'تم القبول';
      case 'confirmed':
        return 'مؤكد';
      case 'pending':
        return 'في الانتظار';
      case 'rejected':
        return 'مرفوض';
      default:
        return status;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'delivered':
      case 'received':
        return 'bg-green-100 text-green-800';
      case 'on_the_way':
      case 'in-transit':
      case 'in_progress':
        return 'bg-blue-100 text-blue-800';
      case 'accepted':
      case 'confirmed':
        return 'bg-cyan-100 text-cyan-800';
      case 'pending':
        return 'bg-yellow-100 text-yellow-800';
      case 'rejected':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-amber-100 text-amber-800';
    }
  };

  const canTrackOrder = (order: Order) => {
    return order.driver_id && ['accepted', 'confirmed', 'on_the_way', 'in-transit', 'in_progress'].includes(order.status);
  };

  const canConfirmReceipt = (order: Order) => {
    return ['on_the_way', 'in-transit'].includes(order.status);
  };

  const handleConfirmReceipt = async (orderId: number) => {
    try {
      const { error } = await supabase
        .from('orders')
        .update({ status: 'received', delivered_at: new Date().toISOString() })
        .eq('id', orderId);

      if (error) throw error;

      toast({
        title: "تم تأكيد الاستلام ✅",
        description: "شكراً لك! تم تأكيد استلام الطلب بنجاح",
      });

      await fetchOrders();
    } catch (error) {
      console.error('Error confirming receipt:', error);
      toast({
        title: "خطأ",
        description: "فشل تأكيد استلام الطلب",
        variant: "destructive"
      });
    }
  };

  const handleTrackOrder = async (order: Order) => {
    if (!canTrackOrder(order)) {
      toast({
        title: "لا يمكن التتبع",
        description: "الطلب غير متاح للتتبع حالياً",
        variant: "destructive"
      });
      return;
    }

    if (onTrackOrder) {
      onTrackOrder(order);
      onOpenChange(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-hidden">
        <DialogHeader className="pb-2">
          <DialogTitle className="text-lg font-bold text-amber-800 flex items-center gap-3">
            <ShoppingBag className="h-4 w-4" />
            <span>{t('myOrders') || 'My Orders'}</span>
          </DialogTitle>
        </DialogHeader>
        
        <div className="overflow-y-auto max-h-[60vh] space-y-3 pr-2">
          {loading ? (
            <div className="text-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-amber-600 mx-auto"></div>
              <p className="text-sm text-amber-600 mt-2">جاري التحميل...</p>
            </div>
          ) : orders.length > 0 ? (
            orders.map((order) => (
              <Card key={order.id} className="bg-white/90 backdrop-blur-sm border border-amber-200">
                <CardHeader className="pb-2">
                  <div className="flex justify-between items-start">
                    <div>
                      <CardTitle className="text-base text-amber-800">
                        طلب #{order.id}
                      </CardTitle>
                      <p className="text-xs text-amber-600 mt-1">
                        {new Date(order.created_at).toLocaleDateString('ar-IQ', {
                          year: 'numeric',
                          month: 'long',
                          day: 'numeric'
                        })}
                      </p>
                    </div>
                    <Badge className={`${getStatusColor(order.status)} border-0`}>
                      <div className="flex items-center gap-2">
                        {getStatusIcon(order.status)}
                        <span className="text-xs font-medium">{getStatusText(order.status)}</span>
                      </div>
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent className="pt-0">
                  <div className="space-y-2">
                    {/* Order Items */}
                    <div>
                      <h4 className="font-medium text-amber-800 mb-1 text-sm">العناصر:</h4>
                      <p className="text-xs text-gray-600 flex items-center gap-2">
                        <span className="w-1 h-1 bg-amber-400 rounded-full"></span>
                        {order.type} x{order.quantity}
                      </p>
                    </div>

                    {/* Order Details */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-xs">
                      <div>
                        <span className="font-medium text-amber-800">المجموع:</span>
                        <p className="text-amber-700 font-bold">{order.total_price.toLocaleString()} د.ع</p>
                      </div>
                      <div>
                        <span className="font-medium text-amber-800">الدفع:</span>
                        <p className="text-gray-600">الدفع عند الاستلام</p>
                      </div>
                    </div>

                    {/* Address */}
                    <div>
                      <span className="font-medium text-amber-800 text-xs flex items-center gap-1">
                        <MapPin className="h-3 w-3" />
                        العنوان:
                      </span>
                      <p className="text-xs text-gray-600 mt-1">{order.address}</p>
                    </div>

                    {/* Notes */}
                    {order.notes && (
                      <div>
                        <span className="font-medium text-amber-800 text-xs">ملاحظات:</span>
                        <p className="text-xs text-gray-600 mt-1">{order.notes}</p>
                      </div>
                    )}

                    {/* Action Buttons */}
                    {(canTrackOrder(order) || canConfirmReceipt(order)) && (
                      <div className="pt-2 border-t border-amber-100 space-y-2">
                        {canTrackOrder(order) && (
                          <Button
                            onClick={() => handleTrackOrder(order)}
                            size="sm"
                            className="w-full bg-blue-600 hover:bg-blue-700 text-white"
                          >
                            <Truck className="h-4 w-4 ml-2" />
                            تتبع الطلب
                          </Button>
                        )}
                        {canConfirmReceipt(order) && (
                          <Button
                            onClick={() => handleConfirmReceipt(order.id)}
                            size="sm"
                            variant="outline"
                            className="w-full border-green-600 text-green-700 hover:bg-green-50"
                          >
                            <CheckCircle className="h-4 w-4 ml-2" />
                            تم استلام الطلب
                          </Button>
                        )}
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            ))
          ) : (
            <Card className="bg-white/90 backdrop-blur-sm border border-amber-200">
              <CardContent className="p-6 text-center">
                <ShoppingBag className="h-10 w-10 text-amber-300 mx-auto mb-3" />
                <h3 className="text-base font-medium text-amber-800 mb-2">
                  {t('noOrdersYet') || 'No orders yet'}
                </h3>
                <p className="text-sm text-amber-600">
                  {t('noOrdersDescription') || 'Your order history will appear here once you make your first purchase.'}
                </p>
              </CardContent>
            </Card>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default OrdersDialog;
