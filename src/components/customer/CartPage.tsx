import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { ArrowLeft, ShoppingCart, Clock, Package, CheckCircle, Minus, Plus, Trash2, Truck, MapPin } from 'lucide-react';
import CheckoutPage from './CheckoutPage';
import { CartProduct } from './CustomerDashboard';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import OrderTrackingModal from './OrderTrackingModal';

interface CartPageProps {
  onBack: () => void;
  cartItems: CartProduct[];
  setCartItems: React.Dispatch<React.SetStateAction<CartProduct[]>>;
}

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
  delivered_at?: string;
}

const CartPage = ({ onBack, cartItems, setCartItems }: CartPageProps) => {
  const [activeTab, setActiveTab] = useState('cart');
  const [showCheckout, setShowCheckout] = useState(false);
  const [orders, setOrders] = useState<Order[]>([]);
  const [loadingOrders, setLoadingOrders] = useState(false);
  const [selectedOrderForTracking, setSelectedOrderForTracking] = useState<Order | null>(null);
  const [showTrackingModal, setShowTrackingModal] = useState(false);
  const { toast } = useToast();

  // Fetch orders from Supabase
  const fetchOrders = async () => {
    setLoadingOrders(true);
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
      setLoadingOrders(false);
    }
  };

  useEffect(() => {
    if (activeTab === 'orders') {
      fetchOrders();
    }
  }, [activeTab]);

  // Real-time subscription for order updates
  useEffect(() => {
    if (activeTab !== 'orders') return;

    const channel = supabase
      .channel('cart-orders-changes')
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
  }, [activeTab, toast]);

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'delivered':
      case 'received':
        return <CheckCircle className="h-4 w-4 text-green-600" />;
      case 'on_the_way':
      case 'in-transit':
        return <Truck className="h-4 w-4 text-blue-600" />;
      case 'accepted':
        return <Package className="h-4 w-4 text-cyan-600" />;
      case 'pending':
        return <Clock className="h-4 w-4 text-amber-600" />;
      default:
        return <Clock className="h-4 w-4 text-gray-600" />;
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
        return 'قيد التوصيل';
      case 'accepted':
        return 'تم القبول';
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
        return 'bg-blue-100 text-blue-800';
      case 'accepted':
        return 'bg-cyan-100 text-cyan-800';
      case 'pending':
        return 'bg-yellow-100 text-yellow-800';
      case 'rejected':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const canTrackOrder = (order: Order) => {
    return order.driver_id && ['accepted', 'on_the_way', 'in-transit'].includes(order.status);
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

    // Check if driver location exists - use limit(1) to get latest location
    try {
      const { data: locationData, error } = await supabase
        .from('driver_locations')
        .select('*')
        .eq('driver_id', order.driver_id)
        .order('updated_at', { ascending: false })
        .limit(1);

      if (error) throw error;

      if (!locationData || locationData.length === 0) {
        toast({
          title: "الموقع غير متاح",
          description: "السائق لم يبدأ التتبع بعد، يرجى الانتظار",
          variant: "destructive"
        });
        return;
      }

      setSelectedOrderForTracking(order);
      setShowTrackingModal(true);
    } catch (error) {
      console.error('Error checking driver location:', error);
      toast({
        title: "خطأ",
        description: "فشل الحصول على موقع السائق",
        variant: "destructive"
      });
    }
  };

  // العمليات على السلة الحقيقية:
  const handleQuantityChange = (id: number, change: number) => {
    setCartItems(prev =>
      prev.map(item =>
        item.id === id
          ? { ...item, quantity: Math.max(1, item.quantity + change) }
          : item
      )
    );
  };

  const handleRemoveItem = (id: number) => {
    setCartItems(prev => prev.filter(item => item.id !== id));
  };

  const cartTotal = cartItems.reduce((sum, item) => sum + (item.price * item.quantity), 0);

  const handleOrderComplete = (orderData: any) => {
    setShowCheckout(false);
    setActiveTab('orders');
    // Clear the cart after order complete
    setCartItems([]);
    localStorage.removeItem('cartItems');
    
    // Refresh orders to show the new order
    fetchOrders();
    
    toast({
      title: "تم إنشاء الطلب بنجاح",
      description: "يمكنك متابعة طلبك من قائمة الطلبات"
    });
  };

  if (showCheckout) {
    return (
      <CheckoutPage
        onBack={() => setShowCheckout(false)}
        onOrderComplete={handleOrderComplete}
        cartItems={cartItems}
        cartTotal={cartTotal}
      />
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-amber-50 to-orange-100">
      {/* Fixed Header */}
      <header className="fixed top-0 left-0 right-0 z-50 bg-white/95 backdrop-blur-sm shadow-sm border-b border-amber-200">
        <div className="max-w-4xl mx-auto px-4 py-4 flex items-center">
          <Button variant="ghost" size="sm" onClick={onBack} className="mr-4">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back
          </Button>
          <div>
            <h1 className="text-2xl font-bold text-amber-800">خبزك</h1>
            <p className="text-sm text-amber-600">Fresh Bread Delivery</p>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-4xl mx-auto px-4 pt-24 pb-8">
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full grid-cols-2 mb-6">
            <TabsTrigger value="cart" className="flex items-center space-x-2">
              <ShoppingCart className="h-4 w-4" />
              <span>Cart ({cartItems.reduce((sum, i) => sum + i.quantity, 0)})</span>
            </TabsTrigger>
            <TabsTrigger value="orders" className="flex items-center space-x-2">
              <Clock className="h-4 w-4" />
              <span>My Orders</span>
            </TabsTrigger>
          </TabsList>

          <TabsContent value="cart" className="space-y-6">
            {cartItems.length > 0 ? (
              <>
                <div className="space-y-4">
                  {cartItems.map((item) => (
                    <Card key={item.id} className="bg-white/90 backdrop-blur-sm">
                      <CardContent className="p-4">
                        <div className="flex justify-between items-center">
                          <div>
                            <h3 className="font-medium text-amber-800">{item.name}</h3>
                            <p className="text-sm text-amber-600">{item.nameAr}</p>
                            <p className="text-sm text-gray-600">
                              {item.price} IQD × {item.quantity}
                            </p>
                          </div>
                          <div className="flex flex-col items-end space-y-2">
                            <div className="flex items-center space-x-1 mb-2">
                              <Button variant="outline" size="icon" className="h-7 w-7 p-0" onClick={() => handleQuantityChange(item.id, -1)} disabled={item.quantity === 1}><Minus className="h-4 w-4" /></Button>
                              <span className="w-6 text-center font-medium">{item.quantity}</span>
                              <Button variant="outline" size="icon" className="h-7 w-7 p-0" onClick={() => handleQuantityChange(item.id, 1)}><Plus className="h-4 w-4" /></Button>
                            </div>
                            <p className="font-bold text-amber-700">
                              {item.price * item.quantity} IQD
                            </p>
                            <Button variant="ghost" size="icon" className="text-red-500 hover:bg-red-50" onClick={() => handleRemoveItem(item.id)}>
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>

                <Card className="bg-white/90 backdrop-blur-sm">
                  <CardContent className="p-6">
                    <div className="flex justify-between items-center mb-4">
                      <span className="text-lg font-medium text-amber-800">Total:</span>
                      <span className="text-2xl font-bold text-amber-700">{cartTotal} IQD</span>
                    </div>
                    <Button 
                      className="w-full bg-amber-600 hover:bg-amber-700" 
                      size="lg"
                      onClick={() => setShowCheckout(true)}
                    >
                      Proceed to Checkout
                    </Button>
                  </CardContent>
                </Card>
              </>
            ) : (
              <Card className="bg-white/90 backdrop-blur-sm">
                <CardContent className="p-8 text-center">
                  <ShoppingCart className="h-12 w-12 text-amber-300 mx-auto mb-4" />
                  <h3 className="text-lg font-medium text-amber-800 mb-2">Your cart is empty</h3>
                  <p className="text-amber-600 mb-4">Start adding some delicious bread to your cart!</p>
                  <Button onClick={onBack} className="bg-amber-600 hover:bg-amber-700">
                    Continue Shopping
                  </Button>
                </CardContent>
              </Card>
            )}
          </TabsContent>

          <TabsContent value="orders" className="space-y-4">
            {loadingOrders ? (
              <div className="text-center py-8">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-amber-600 mx-auto"></div>
                <p className="text-sm text-amber-600 mt-2">جاري التحميل...</p>
              </div>
            ) : orders.length > 0 ? (
              orders.map((order) => (
                <Card key={order.id} className="bg-white/90 backdrop-blur-sm border border-amber-200">
                  <CardHeader>
                    <div className="flex justify-between items-start">
                      <div>
                        <CardTitle className="text-lg text-amber-800">طلب #{order.id}</CardTitle>
                        <p className="text-sm text-amber-600">
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
                  <CardContent>
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

                      {/* Delivery Time */}
                      {order.delivered_at && (
                        <div className="pt-2 border-t border-amber-100">
                          <span className="font-medium text-amber-800 text-xs">تاريخ التسليم:</span>
                          <p className="text-xs text-gray-600">
                            {new Date(order.delivered_at).toLocaleString('ar-IQ')}
                          </p>
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>
              ))
            ) : (
              <Card className="bg-white/90 backdrop-blur-sm">
                <CardContent className="p-8 text-center">
                  <Clock className="h-12 w-12 text-amber-300 mx-auto mb-4" />
                  <h3 className="text-lg font-medium text-amber-800 mb-2">لا توجد طلبات بعد</h3>
                  <p className="text-amber-600">سيظهر سجل طلباتك هنا بعد إنشاء أول طلب</p>
                </CardContent>
              </Card>
            )}
          </TabsContent>
        </Tabs>
      </main>

      {/* Order Tracking Modal */}
      {selectedOrderForTracking && (
        <OrderTrackingModal
          isOpen={showTrackingModal}
          onClose={() => {
            setShowTrackingModal(false);
            setSelectedOrderForTracking(null);
          }}
          order={selectedOrderForTracking}
        />
      )}
    </div>
  );
};

export default CartPage;
