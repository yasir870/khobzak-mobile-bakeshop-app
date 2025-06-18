
import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Clock, Package, CheckCircle, ShoppingBag } from 'lucide-react';
import { useTranslation } from '@/context/LanguageContext';

interface Order {
  id: string;
  date: string;
  status: string;
  items: string[];
  total: number;
  address: string;
  paymentMethod: string;
  notes?: string;
  createdAt: string;
}

interface OrdersDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const OrdersDialog = ({ open, onOpenChange }: OrdersDialogProps) => {
  const { t } = useTranslation();
  const [orders, setOrders] = useState<Order[]>([]);

  useEffect(() => {
    if (open) {
      // Load orders from localStorage
      const storedOrders = localStorage.getItem('userOrders');
      if (storedOrders) {
        try {
          const parsedOrders = JSON.parse(storedOrders);
          setOrders(parsedOrders);
        } catch (error) {
          console.error('Error parsing orders:', error);
          setOrders([]);
        }
      } else {
        setOrders([]);
      }
    }
  }, [open]);

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'delivered':
        return <CheckCircle className="h-3 w-3 text-green-600" />;
      case 'in-transit':
        return <Package className="h-3 w-3 text-blue-600" />;
      case 'processing':
        return <Clock className="h-3 w-3 text-yellow-600" />;
      default:
        return <Clock className="h-3 w-3 text-amber-600" />;
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'delivered':
        return t('delivered') || 'Delivered';
      case 'in-transit':
        return t('inTransit') || 'In Transit';
      case 'processing':
        return t('processing') || 'Processing';
      default:
        return t('pending') || 'Pending';
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'delivered':
        return 'bg-green-100 text-green-800';
      case 'in-transit':
        return 'bg-blue-100 text-blue-800';
      case 'processing':
        return 'bg-yellow-100 text-yellow-800';
      default:
        return 'bg-amber-100 text-amber-800';
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
          {orders.length > 0 ? (
            orders.map((order) => (
              <Card key={order.id} className="bg-white/90 backdrop-blur-sm border border-amber-200">
                <CardHeader className="pb-2">
                  <div className="flex justify-between items-start">
                    <div>
                      <CardTitle className="text-base text-amber-800">
                        {t('orderNumber') || 'Order'} #{order.id}
                      </CardTitle>
                      <p className="text-xs text-amber-600 mt-1">{order.date}</p>
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
                      <h4 className="font-medium text-amber-800 mb-1 text-sm">{t('items') || 'Items'}:</h4>
                      <div className="space-y-1">
                        {order.items.map((item, index) => (
                          <p key={index} className="text-xs text-gray-600 flex items-center gap-2">
                            <span className="w-1 h-1 bg-amber-400 rounded-full"></span>
                            {item}
                          </p>
                        ))}
                      </div>
                    </div>

                    {/* Order Details */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-xs">
                      <div>
                        <span className="font-medium text-amber-800">{t('total') || 'Total'}:</span>
                        <p className="text-amber-700 font-bold">{order.total} IQD</p>
                      </div>
                      <div>
                        <span className="font-medium text-amber-800">{t('payment') || 'Payment'}:</span>
                        <p className="text-gray-600">
                          {order.paymentMethod === 'cash' ? 
                            (t('cashOnDelivery') || 'Cash on Delivery') : 
                            (t('onlinePayment') || 'Online Payment')
                          }
                        </p>
                      </div>
                    </div>

                    {/* Address */}
                    <div>
                      <span className="font-medium text-amber-800 text-xs">{t('address') || 'Address'}:</span>
                      <p className="text-xs text-gray-600 mt-1">{order.address}</p>
                    </div>

                    {/* Notes */}
                    {order.notes && (
                      <div>
                        <span className="font-medium text-amber-800 text-xs">{t('notes') || 'Notes'}:</span>
                        <p className="text-xs text-gray-600 mt-1">{order.notes}</p>
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
