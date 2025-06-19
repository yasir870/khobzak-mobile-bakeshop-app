
import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { ArrowLeft, MapPin, Clock, CreditCard, Banknote } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { useTranslation } from '@/context/LanguageContext';

interface CheckoutPageProps {
  onBack: () => void;
  onOrderComplete: (orderData: any) => void;
  cartItems: any[];
  cartTotal: number;
}

const CheckoutPage = ({ onBack, onOrderComplete, cartItems, cartTotal }: CheckoutPageProps) => {
  const [address, setAddress] = useState('');
  const [paymentMethod, setPaymentMethod] = useState('cash');
  const [notes, setNotes] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [gpsAddress, setGpsAddress] = useState('');
  const [isLoadingAddress, setIsLoadingAddress] = useState(false);
  const { toast } = useToast();
  const { t } = useTranslation();

  // Load GPS location and convert to address on component mount
  useEffect(() => {
    const loadGpsAddress = async () => {
      const savedLocation = localStorage.getItem('userLocation');
      if (savedLocation) {
        setIsLoadingAddress(true);
        try {
          const location = JSON.parse(savedLocation);
          // Convert coordinates to readable address
          const addressText = `موقع GPS: خط العرض ${location.lat.toFixed(6)}, خط الطول ${location.lng.toFixed(6)}`;
          setGpsAddress(addressText);
          setAddress(addressText);
        } catch (error) {
          console.error('Error loading GPS address:', error);
        }
        setIsLoadingAddress(false);
      }
    };

    loadGpsAddress();
  }, []);

  // helper: get customer_phone from localStorage OR ask user for it later if needed
  const getCustomerPhone = () => {
    // We store phone with "userPhone" key during login
    return localStorage.getItem("userPhone") || "";
  };

  // helper: get customer_id from localStorage OR let Supabase assign
  const getCustomerId = () => {
    // Suppose you store customer ID with "customerId" key
    // Else fallback to null
    const val = localStorage.getItem("customerId");
    return val ? parseInt(val) : null;
  };

  const handlePlaceOrder = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    const customerId = getCustomerId();

    if (!address || !customerId) {
      toast({
        title: t('toastMissingInfoTitle'),
        description: !address
          ? t('toastAddressMissing')
          : t('toastUserError'),
        variant: "destructive"
      });
      setIsLoading(false);
      return;
    }

    try {
      // Prepare order for Supabase
      // Note: "type" will be a string من أنواع الخبز المطلوبة، آسهل شيء نفصلها بفارزة (CSV)
      const typeString = cartItems.map(item => `${item.name} x${item.quantity}`).join(", ");

      const { data, error } = await supabase.from("orders").insert([
        {
          customer_id: customerId,
          driver_id: null,
          type: typeString,
          quantity: cartItems.reduce((sum, item) => sum + item.quantity, 0),
          total_price: cartTotal,
          notes,
          status: 'pending',
          address,
          customer_phone: getCustomerPhone() || t('unknown'),
        }
      ]).select().single();

      if (error) {
        throw error;
      }

      // orderData structure (for local usage)
      const orderData = {
        id: data?.id,
        date: new Date().toISOString().split('T')[0],
        status: data?.status || 'pending',
        items: cartItems.map(item => `${item.name} x${item.quantity}`),
        total: cartTotal,
        address,
        paymentMethod,
        notes,
        createdAt: data?.created_at || new Date().toISOString()
      };

      // (اختياري): الاحتفاظ بالطلب الجديد في localStorage/ذاكرة العميل
      const existingOrders = JSON.parse(localStorage.getItem('userOrders') || '[]');
      existingOrders.push(orderData);
      localStorage.setItem('userOrders', JSON.stringify(existingOrders));

      toast({
        title: t('toastOrderSuccessTitle'),
        description: t('toastOrderSuccessDesc', { orderId: orderData.id })
      });
      onOrderComplete(orderData);
      setIsLoading(false);
    } catch (error: any) {
      toast({
        title: t('toastOrderErrorTitle'),
        description: error.message || t('toastOrderErrorDesc'),
        variant: "destructive"
      });
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-amber-50 to-orange-100">
      {/* Fixed Header */}
      <header className="fixed top-0 left-0 right-0 z-50 bg-white/95 backdrop-blur-sm shadow-sm border-b border-amber-200">
        <div className="max-w-4xl mx-auto px-4 py-4 flex items-center">
          <Button variant="ghost" size="sm" onClick={onBack} className="mr-4">
            <ArrowLeft className="h-4 w-4 mr-2" />
            {t('back')}
          </Button>
          <div>
            <h1 className="text-2xl font-bold text-amber-800">{t('checkout')}</h1>
            <p className="text-sm text-amber-600">{t('completeYourOrder')}</p>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-4xl mx-auto px-4 pt-24 pb-8">
        <form onSubmit={handlePlaceOrder} className="space-y-6">
          {/* Order Summary */}
          <Card className="bg-white/90 backdrop-blur-sm">
            <CardHeader>
              <CardTitle className="text-lg text-amber-800">{t('orderSummary')}</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {cartItems.map((item, index) => (
                  <div key={index} className="flex justify-between text-sm">
                    <span>{item.name} x{item.quantity}</span>
                    <span>{item.price * item.quantity} IQD</span>
                  </div>
                ))}
                <div className="border-t pt-2 flex justify-between font-bold">
                  <span>{t('total')}:</span>
                  <span>{cartTotal} IQD</span>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Delivery Address */}
          <Card className="bg-white/90 backdrop-blur-sm">
            <CardHeader>
              <CardTitle className="text-lg text-amber-800 flex items-center">
                <MapPin className="mr-2 h-5 w-5" />
                {t('deliveryAddress')}
              </CardTitle>
            </CardHeader>
            <CardContent>
              {isLoadingAddress ? (
                <div className="flex items-center justify-center py-4">
                  <div className="text-amber-600">جاري تحميل العنوان من GPS...</div>
                </div>
              ) : gpsAddress ? (
                <div className="space-y-3">
                  <div className="p-3 bg-green-50 border border-green-200 rounded-lg">
                    <div className="flex items-center gap-2 text-green-700 mb-2">
                      <MapPin className="h-4 w-4" />
                      <span className="text-sm font-medium">عنوان GPS المحدد:</span>
                    </div>
                    <p className="text-sm text-green-600">{gpsAddress}</p>
                  </div>
                  <Textarea
                    value={address}
                    onChange={(e) => setAddress(e.target.value)}
                    placeholder="يمكنك تعديل العنوان أو إضافة تفاصيل إضافية"
                    className="border-amber-200 focus:border-amber-500"
                    required
                  />
                </div>
              ) : (
                <div className="space-y-3">
                  <div className="p-3 bg-orange-50 border border-orange-200 rounded-lg">
                    <div className="flex items-center gap-2 text-orange-700 mb-2">
                      <MapPin className="h-4 w-4" />
                      <span className="text-sm font-medium">لم يتم تحديد الموقع بواسطة GPS</span>
                    </div>
                    <p className="text-xs text-orange-600">يرجى العودة للصفحة الرئيسية وتحديد موقعك أولاً</p>
                  </div>
                  <Textarea
                    value={address}
                    onChange={(e) => setAddress(e.target.value)}
                    placeholder={t('enterAddressPlaceholder')}
                    className="border-amber-200 focus:border-amber-500"
                    required
                  />
                </div>
              )}
            </CardContent>
          </Card>

          {/* Payment Method */}
          <Card className="bg-white/90 backdrop-blur-sm">
            <CardHeader>
              <CardTitle className="text-lg text-amber-800">{t('paymentMethod')}</CardTitle>
            </CardHeader>
            <CardContent>
              <RadioGroup value={paymentMethod} onValueChange={setPaymentMethod}>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="cash" id="cash" />
                  <Label htmlFor="cash" className="flex items-center cursor-pointer">
                    <Banknote className="mr-2 h-4 w-4" />
                    {t('cashOnDelivery')}
                  </Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="online" id="online" />
                  <Label htmlFor="online" className="flex items-center cursor-pointer">
                    <CreditCard className="mr-2 h-4 w-4" />
                    {t('onlinePayment')}
                  </Label>
                </div>
              </RadioGroup>
            </CardContent>
          </Card>

          {/* Additional Notes */}
          <Card className="bg-white/90 backdrop-blur-sm">
            <CardHeader>
              <CardTitle className="text-lg text-amber-800">{t('additionalNotes')}</CardTitle>
            </CardHeader>
            <CardContent>
              <Textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder={t('specialInstructionsPlaceholder')}
                className="border-amber-200 focus:border-amber-500"
              />
            </CardContent>
          </Card>

          {/* Place Order Button */}
          <Button
            type="submit"
            className="w-full bg-amber-600 hover:bg-amber-700 text-white"
            size="lg"
            disabled={isLoading}
          >
            {isLoading ? t('placingOrder') : `${t('placeOrder')} - ${cartTotal} IQD`}
          </Button>
        </form>
      </main>
    </div>
  );
};

export default CheckoutPage;
