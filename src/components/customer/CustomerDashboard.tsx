import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ShoppingCart, User, Clock, MessageSquare, LogOut, MapPin, Truck } from 'lucide-react';
import ProductDetailModal from './ProductDetailModal';
import CartPage from './CartPage';
import ProfilePage from './ProfilePage';
import { supabase } from '@/integrations/supabase/client';
import { Dialog, DialogContent, DialogTitle, DialogHeader, DialogDescription } from '@/components/ui/dialog';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Info } from 'lucide-react';
import BreadMenuList from "./BreadMenuList";
import ContactDialog from "./ContactDialog";
import Footer from "./Footer";
import OrdersDialog from "./OrdersDialog";
import OrderTrackingModal from './OrderTrackingModal';
import ActiveOrdersModal from './ActiveOrdersModal';
import { useTranslation } from '@/context/LanguageContext';
import { useToast } from '@/hooks/use-toast';

interface CustomerDashboardProps {
  onLogout: () => void;
}
export interface BreadProduct {
  id: number;
  name: string;
  nameAr: string;
  price: number;
  description: string;
  detailedDescription: string;
  images: string[];
  category: string;
  pieces: number;
  notes: string;
}
export interface CartProduct extends BreadProduct {
  quantity: number;
}
const CustomerDashboard = ({
  onLogout
}: CustomerDashboardProps) => {
  const { t } = useTranslation();
  const { toast } = useToast();
  // سنستخدم array من المنتجات مع quantity
  const [cartItems, setCartItems] = useState<CartProduct[]>([]);
  const [selectedProduct, setSelectedProduct] = useState<BreadProduct | null>(null);
  const [showCart, setShowCart] = useState(false);
  const [showProfile, setShowProfile] = useState(false);
  const [showOrders, setShowOrders] = useState(false);
  const [showAllPhones, setShowAllPhones] = useState(false);
  const [allPhones, setAllPhones] = useState<string[]>([]);
  const [loadingPhones, setLoadingPhones] = useState(false);
  const [contactOpen, setContactOpen] = useState(false);
  const [userLocation, setUserLocation] = useState<{lat: number, lng: number} | null>(null);
  const [isGettingLocation, setIsGettingLocation] = useState(false);
  const [showTrackingModal, setShowTrackingModal] = useState(false);
  const [selectedOrderForTracking, setSelectedOrderForTracking] = useState<any>(null);
  const [showActiveOrdersModal, setShowActiveOrdersModal] = useState(false);

  // عدل صور المنتجات من Emoji إلى روابط الصور الحقيقية التي رفعتها على Supabase
  const breadTypes: BreadProduct[] = [{
    id: 1,
    name: t('bread_tanour_name'),
    nameAr: "",
    price: 1000,
    description: t('bread_tanour_description'),
    detailedDescription: t('bread_tanour_detailedDescription'),
    images: ["https://lakvfrohnlinfcqfwkqq.supabase.co/storage/v1/object/public/photos//148efc9e-20d5-427d-8b10-a02c6732cc66.png"],
    category: "شعبي جدًا",
    pieces: 8,
    notes: "شعبي جدًا"
  }, {
    id: 2,
    name: t('bread_samoon_name'),
    nameAr: "",
    price: 1000,
    description: t('bread_samoon_description'),
    detailedDescription: t('bread_samoon_detailedDescription'),
    images: ["https://lakvfrohnlinfcqfwkqq.supabase.co/storage/v1/object/public/photos/maxresdefault.jpg"],
    category: "يومي",
    pieces: 8,
    notes: "يومي"
  }, {
    id: 3,
    name: t('bread_ruqaq_name'),
    nameAr: "",
    price: 1000,
    description: t('bread_ruqaq_description'),
    detailedDescription: t('bread_ruqaq_detailedDescription'),
    images: ["https://img-global.cpcdn.com/recipes/138143f1b4cf972e/600x440cq90/%D8%A7%D9%84%D8%B5%D9%88%D8%B1%D8%A9-%D8%A7%D9%84%D8%B1%D8%A6%D9%8A%D8%B3%D9%8A%D8%A9-%D9%84%D9%88%D8%B5%D9%81%D8%A9%D8%AE%D8%A8%D8%B2-%D8%B4%D8%B1%D8%A7%D9%83.jpg"],
    category: "خفيف",
    pieces: 4,
    notes: "خفيف"
  }, {
    id: 4,
    name: t('bread_shawarma_name'),
    nameAr: "",
    price: 1000,
    description: t('bread_shawarma_description'),
    detailedDescription: t('bread_shawarma_detailedDescription'),
    images: ["https://lakvfrohnlinfcqfwkqq.supabase.co/storage/v1/object/public/photos//ff1d836db4413360366355d14e6ed8c8_w750_h500.jpg"],
    category: "ساندويش",
    pieces: 4,
    notes: "ساندويش"
  }, {
    id: 5,
    name: t('bread_sukari_name'),
    nameAr: "",
    price: 1000,
    description: t('bread_sukari_description'),
    detailedDescription: t('bread_sukari_detailedDescription'),
    images: ["https://lakvfrohnlinfcqfwkqq.supabase.co/storage/v1/object/public/photos//hq720.jpg"],
    category: "صحي",
    pieces: 4,
    notes: "صحي / لمرضى السكري"
  }];

  // تحميل cart من localStorage (مرة واحدة عند أول تحميل للكومبوننت)
  useEffect(() => {
    const storedCart = localStorage.getItem('cartItems');
    if (storedCart) {
      const parsedCart = JSON.parse(storedCart);
      console.log('Loaded cart from localStorage:', parsedCart);
      setCartItems(parsedCart);
    }
    
    // Load saved location
    const savedLocation = localStorage.getItem('userLocation');
    if (savedLocation) {
      setUserLocation(JSON.parse(savedLocation));
    }
  }, []);

  // حفظ cart في localStorage كلما تغيرت
  useEffect(() => {
    console.log('Saving cart to localStorage:', cartItems);
    localStorage.setItem('cartItems', JSON.stringify(cartItems));
  }, [cartItems]);

  const handleGetLocation = () => {
    if (!navigator.geolocation) {
      toast({
        title: "خطأ في الموقع",
        description: "متصفحك لا يدعم خدمة تحديد الموقع",
        variant: "destructive"
      });
      return;
    }

    // Show permission request message in Arabic as requested
    toast({
      title: t('locationPermissionTitle'),
      description: t('locationPermissionMessage'),
    });

    setIsGettingLocation(true);
    
    navigator.geolocation.getCurrentPosition(
      (position) => {
        const location = {
          lat: position.coords.latitude,
          lng: position.coords.longitude
        };
        setUserLocation(location);
        localStorage.setItem('userLocation', JSON.stringify(location));
        setIsGettingLocation(false);
        
        toast({
          title: t('locationDetectedSuccess'),
          description: t('locationDetectedDesc'),
        });
      },
      (error) => {
        setIsGettingLocation(false);
        let errorMessage = "حدث خطأ في تحديد الموقع";
        
        switch(error.code) {
          case error.PERMISSION_DENIED:
            errorMessage = t('locationPermissionDenied');
            break;
          case error.POSITION_UNAVAILABLE:
            errorMessage = t('locationUnavailable');
            break;
          case error.TIMEOUT:
            errorMessage = t('locationTimeout');
            break;
        }
        
        toast({
          title: t('locationError'),
          description: errorMessage,
          variant: "destructive"
        });
      },
      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 300000 // 5 minutes
      }
    );
  };

  const handleProductClick = (product: BreadProduct) => {
    console.log('Product clicked:', product.name);
    setSelectedProduct(product);
  };

  // تعديل دالة إضافة للسلة مع دمج المنتج إذا تكرر
  const handleAddToCart = (quantity: number) => {
    if (!selectedProduct) {
      console.log('No product selected');
      return;
    }
    
    console.log('Adding to cart:', { product: selectedProduct.name, quantity });
    
    setCartItems(prev => {
      // هل المنتج موجود بالفعل؟
      const exists = prev.find(item => item.id === selectedProduct.id);
      if (exists) {
        // إذا موجود، فقط زيد الكمية
        const updated = prev.map(item => item.id === selectedProduct.id ? {
          ...item,
          quantity: item.quantity + quantity
        } : item);
        console.log('Updated existing item in cart:', updated);
        return updated;
      } else {
        // إذا جديد، أضفه مع الكمية المطلوبة
        const newCart = [...prev, {
          ...selectedProduct,
          quantity
        }];
        console.log('Added new item to cart:', newCart);
        return newCart;
      }
    });
    setSelectedProduct(null);
  };

  // تمرير cartItems و setCartItems إلى CartPage ليستطيع التغيير (حذف، زيادة، ..)
  if (showCart) {
    return <CartPage onBack={() => setShowCart(false)} cartItems={cartItems} setCartItems={setCartItems} />;
  }
  if (showProfile) {
    return <ProfilePage onBack={() => setShowProfile(false)} />;
  }
  
  return <div className="min-h-screen bg-gradient-to-br from-amber-50 to-orange-100">
      {/* Fixed Header */}
      <header className="fixed top-0 left-0 right-0 z-50 bg-white/95 backdrop-blur-sm shadow-sm border-b border-amber-200">
        <div className="max-w-4xl mx-auto px-4 py-3 flex justify-between items-center">
          <div className="flex items-center gap-3">
            {/* Logo Image - متحركة مع hover */}
            <span
              className="w-12 h-12 md:w-16 md:h-16 bg-[url('https://lakvfrohnlinfcqfwkqq.supabase.co/storage/v1/object/public/photos//A_logo_on_a_grid-patterned_beige_background_featur.png')] bg-cover bg-center rounded-full border-2 border-amber-300 shadow transition-all duration-300 hover:scale-110 hover:w-20 hover:h-20"
              aria-label="Logo"
            ></span>
            <div>
              <h1 className="text-lg md:text-xl font-bold text-amber-800 flex items-center gap-2">{t('appName')}</h1>
              <p className="text-xs text-amber-600">{t('appSlogan')}</p>
            </div>
          </div>
          <div className="flex items-center space-x-3">
            {/* Enhanced Location Button like Talabat */}
            <Button 
              variant="outline" 
              size="sm" 
              className={`relative transition-all duration-300 ${
                userLocation 
                  ? 'bg-green-600 hover:bg-green-700 text-white border-green-600 shadow-lg transform hover:scale-105' 
                  : 'bg-red-500 hover:bg-red-600 text-white border-red-500 shadow-lg animate-pulse'
              } px-4 py-2 rounded-full`} 
              onClick={handleGetLocation}
              disabled={isGettingLocation}
            >
              <MapPin className={`h-4 w-4 ml-2 ${isGettingLocation ? 'animate-spin' : userLocation ? '' : 'animate-bounce'}`} />
              <span className="font-medium text-sm">
                {isGettingLocation 
                  ? t('gettingLocation')
                  : userLocation 
                    ? t('locationDetected')
                    : t('setLocation')
                }
              </span>
              {!userLocation && !isGettingLocation && (
                <div className="absolute -top-1 -right-1 w-3 h-3 bg-red-400 rounded-full animate-ping"></div>
              )}
            </Button>
            
            {/* Cart Button */}
            <Button 
              variant="outline" 
              size="sm" 
              className="relative bg-blue-600 hover:bg-blue-700 text-white border-blue-600 hover:border-blue-700 shadow-lg px-3 py-2 rounded-full transition-all duration-300 hover:scale-105" 
              onClick={() => setShowCart(true)}
            >
              <ShoppingCart className="h-4 w-4 ml-2" />
              <span className="font-medium text-sm">السلة</span>
              {cartItems.length > 0 && (
                <Badge className="absolute -top-1 -right-1 h-5 w-5 rounded-full bg-red-500 text-white text-xs flex items-center justify-center font-bold shadow-lg animate-pulse">
                  {cartItems.reduce((total, item) => total + item.quantity, 0)}
                </Badge>
              )}
            </Button>
            <Button onClick={onLogout} variant="ghost" size="sm" className="text-sm px-3">
              <LogOut className="h-3 w-3 ml-2" />
              {t('logout')}
            </Button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-4xl mx-auto px-4 pt-20 pb-6">
        {/* Welcome Section */}
        <Card className="mb-6 bg-white/90 backdrop-blur-sm">
          <CardContent className="p-4">
            <h2 className="text-lg font-semibold text-amber-800 mb-2">{t('welcomeBack')}</h2>
            <p className="text-sm text-amber-600">{t('discoverOurBread')}</p>
            {userLocation ? (
              <div className="flex items-center gap-2 mt-2 p-2 bg-green-50 rounded-lg border border-green-200">
                <MapPin className="h-4 w-4 text-green-600" />
                <span className="text-sm text-green-700 font-medium">{t('locationSetForDelivery')}</span>
              </div>
            ) : (
              <div className="flex items-center gap-2 mt-2 p-2 bg-orange-50 rounded-lg border border-orange-200">
                <MapPin className="h-4 w-4 text-orange-600" />
                <span className="text-sm text-orange-700">{t('clickToSetLocation')}</span>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Bread Menu */}
        <BreadMenuList breadTypes={breadTypes} onProductClick={handleProductClick} />

        {/* Quick Actions */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-3 mt-6">
          <Button variant="outline" className="h-12 flex items-center justify-center space-x-2 text-sm" onClick={() => setShowActiveOrdersModal(true)}>
            <Clock className="h-4 w-4" />
            <span>{t('myOrders')}</span>
          </Button>
          <Button variant="outline" className="h-12 flex items-center justify-center space-x-2 text-sm" onClick={() => setShowProfile(true)}>
            <User className="h-4 w-4" />
            <span>{t('profile')}</span>
          </Button>
          <Button variant="outline" className="h-12 flex items-center justify-center space-x-2 text-sm" onClick={() => setContactOpen(true)}>
            <MessageSquare className="h-4 w-4" />
            <span>{t('contactUs')}</span>
          </Button>
        </div>
      </main>

      {/* Product Detail Modal */}
      {selectedProduct && <ProductDetailModal product={selectedProduct} onClose={() => setSelectedProduct(null)} onAddToCart={handleAddToCart} />}

      {/* Orders Dialog */}
      <OrdersDialog open={showOrders} onOpenChange={setShowOrders} />

      {/* Contact Dialog */}
      <ContactDialog open={contactOpen} onOpenChange={setContactOpen} />

      {/* Active Orders Modal */}
      <ActiveOrdersModal
        isOpen={showActiveOrdersModal}
        onClose={() => setShowActiveOrdersModal(false)}
        onTrackOrder={(order) => {
          setSelectedOrderForTracking(order);
          setShowTrackingModal(true);
        }}
      />

      {/* Order Tracking Modal */}
      {selectedOrderForTracking && (
        <OrderTrackingModal
          isOpen={showTrackingModal}
          onClose={() => {
            setShowTrackingModal(false);
            setSelectedOrderForTracking(null);
          }}
          order={selectedOrderForTracking}
          customerLocation={userLocation}
        />
      )}
    </div>;
};
export default CustomerDashboard;
