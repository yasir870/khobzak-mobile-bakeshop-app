
import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ArrowLeft, ShoppingCart, Clock, Package, CheckCircle } from 'lucide-react';
import CheckoutPage from './CheckoutPage';

interface CartPageProps {
  onBack: () => void;
  cartItemCount: number;
}

const CartPage = ({ onBack, cartItemCount }: CartPageProps) => {
  const [activeTab, setActiveTab] = useState('cart');
  const [showCheckout, setShowCheckout] = useState(false);
  const [orderHistory, setOrderHistory] = useState<any[]>([]);

  // Mock cart items - in real app, this would come from context/state
  const cartItems = [
    { id: 1, name: 'Traditional Arabic Bread', nameAr: 'خبز عربي تقليدي', price: 5000, quantity: 2 },
    { id: 2, name: 'Cheese Bread', nameAr: 'خبز الجبن', price: 8000, quantity: 1 },
  ];

  useEffect(() => {
    // Load order history from localStorage
    const orders = JSON.parse(localStorage.getItem('userOrders') || '[]');
    setOrderHistory(orders);
  }, []);

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'delivered':
        return <CheckCircle className="h-4 w-4 text-green-600" />;
      case 'in-transit':
        return <Package className="h-4 w-4 text-blue-600" />;
      default:
        return <Clock className="h-4 w-4 text-amber-600" />;
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'delivered':
        return 'Delivered';
      case 'in-transit':
        return 'In Transit';
      case 'processing':
        return 'Processing';
      default:
        return 'Pending';
    }
  };

  const cartTotal = cartItems.reduce((sum, item) => sum + (item.price * item.quantity), 0);

  const handleOrderComplete = (orderData: any) => {
    // Update order history
    setOrderHistory(prev => [orderData, ...prev]);
    setShowCheckout(false);
    setActiveTab('orders');
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
              <span>Cart ({cartItemCount})</span>
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
                          <div className="text-right">
                            <p className="font-bold text-amber-700">
                              {item.price * item.quantity} IQD
                            </p>
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
            {orderHistory.length > 0 ? (
              orderHistory.map((order) => (
                <Card key={order.id} className="bg-white/90 backdrop-blur-sm">
                  <CardHeader>
                    <div className="flex justify-between items-start">
                      <div>
                        <CardTitle className="text-lg text-amber-800">Order #{order.id}</CardTitle>
                        <p className="text-sm text-amber-600">{order.date}</p>
                      </div>
                      <div className="flex items-center space-x-2">
                        {getStatusIcon(order.status)}
                        <span className="text-sm font-medium">{getStatusText(order.status)}</span>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2">
                      {order.items.map((item: string, index: number) => (
                        <p key={index} className="text-sm text-gray-600">• {item}</p>
                      ))}
                    </div>
                    <div className="mt-4 pt-4 border-t border-gray-200">
                      <div className="flex justify-between items-center">
                        <span className="font-medium text-amber-800">Total:</span>
                        <span className="font-bold text-amber-700">{order.total} IQD</span>
                      </div>
                      <div className="flex justify-between items-center mt-2">
                        <span className="text-sm text-gray-600">Payment:</span>
                        <span className="text-sm font-medium">{order.paymentMethod === 'cash' ? 'Cash on Delivery' : 'Online Payment'}</span>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))
            ) : (
              <Card className="bg-white/90 backdrop-blur-sm">
                <CardContent className="p-8 text-center">
                  <Clock className="h-12 w-12 text-amber-300 mx-auto mb-4" />
                  <h3 className="text-lg font-medium text-amber-800 mb-2">No orders yet</h3>
                  <p className="text-amber-600">Your order history will appear here once you make your first purchase.</p>
                </CardContent>
              </Card>
            )}
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
};

export default CartPage;
