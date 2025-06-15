import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ShoppingCart, User, Clock, MessageSquare, LogOut } from 'lucide-react';
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
import { useTranslation } from '@/context/LanguageContext';

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

  // عدل صور المنتجات من Emoji إلى روابط الصور الحقيقية التي رفعتها على Supabase
  const breadTypes: BreadProduct[] = [{
    id: 1,
    name: t('bread_tanour_name'),
    nameAr: "",
    price: 1000,
    description: t('bread_tanour_description'),
    detailedDescription: t('bread_tanour_detailedDescription'),
    images: ["https://lakvfrohnlinfcqfwkqq.supabase.co/storage/v1/object/public/photos//148efc9e-20d5-427d-8b10-a02c6732cc66.png", "https://lakvfrohnlinfcqfwkqq.supabase.co/storage/v1/object/public/photos/maxresdefault.jpg"],
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
      setCartItems(JSON.parse(storedCart));
    }
  }, []);

  // حفظ cart في localStorage كلما تغيرت
  useEffect(() => {
    localStorage.setItem('cartItems', JSON.stringify(cartItems));
  }, [cartItems]);
  const handleProductClick = (product: BreadProduct) => {
    setSelectedProduct(product);
  };

  // تعديل دالة إضافة للسلة مع دمج المنتج إذا تكرر
  const handleAddToCart = (quantity: number) => {
    if (!selectedProduct) return;
    setCartItems(prev => {
      // هل المنتج موجود بالفعل؟
      const exists = prev.find(item => item.id === selectedProduct.id);
      if (exists) {
        // إذا موجود، فقط زيد الكمية
        return prev.map(item => item.id === selectedProduct.id ? {
          ...item,
          quantity: item.quantity + quantity
        } : item);
      } else {
        // إذا جديد، أضفه مع الكمية المطلوبة
        return [...prev, {
          ...selectedProduct,
          quantity
        }];
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
        <div className="max-w-4xl mx-auto px-4 py-4 flex justify-between items-center">
          <div className="flex items-center gap-4">
            {/* Logo Image - متحركة مع hover */}
            <span
              className="w-16 h-16 md:w-24 md:h-24 bg-[url('https://lakvfrohnlinfcqfwkqq.supabase.co/storage/v1/object/public/photos//A_logo_on_a_grid-patterned_beige_background_featur.png')] bg-cover bg-center rounded-full border-2 border-amber-300 shadow transition-all duration-300 hover:scale-125 hover:w-32 hover:h-32"
              aria-label="Logo"
            ></span>
            <div>
              <h1 className="text-2xl font-bold text-amber-800 flex items-center gap-2">{t('appName')}</h1>
              <p className="text-sm text-amber-600">{t('appSlogan')}</p>
            </div>
          </div>
          <div className="flex items-center space-x-4">
            <Button variant="outline" size="sm" className="relative" onClick={() => setShowCart(true)}>
              <ShoppingCart className="h-4 w-4" />
              {cartItems.length > 0 && <Badge className="absolute -top-2 -right-2 h-5 w-5 rounded-full bg-amber-600 text-white text-xs flex items-center justify-center">
                  {cartItems.reduce((total, item) => total + item.quantity, 0)}
                </Badge>}
            </Button>
            <Button onClick={onLogout} variant="ghost" size="sm">
              <LogOut className="h-4 w-4 mr-2" />
              {t('logout')}
            </Button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-4xl mx-auto px-4 pt-24 pb-8">
        {/* Welcome Section */}
        <Card className="mb-8 bg-white/90 backdrop-blur-sm">
          <CardContent className="p-6">
            <h2 className="text-xl font-semibold text-amber-800 mb-2">{t('welcomeBack')}</h2>
            <p className="text-amber-600">{t('discoverOurBread')}</p>
          </CardContent>
        </Card>

        {/* Bread Menu */}
        <BreadMenuList breadTypes={breadTypes} onProductClick={handleProductClick} />

        {/* Quick Actions */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Button variant="outline" className="h-16 flex items-center justify-center space-x-3" onClick={() => setShowOrders(true)}>
            <Clock className="h-5 w-5" />
            <span>{t('myOrders')}</span>
          </Button>
          <Button variant="outline" className="h-16 flex items-center justify-center space-x-3" onClick={() => setShowProfile(true)}>
            <User className="h-5 w-5" />
            <span>{t('profile')}</span>
          </Button>
          <Button variant="outline" className="h-16 flex items-center justify-center space-x-3" onClick={() => setContactOpen(true)}>
            <MessageSquare className="h-5 w-5" />
            <span>{t('contactUs')}</span>
          </Button>
        </div>
      </main>

      {/* Product Detail Modal */}
      {selectedProduct && <ProductDetailModal product={selectedProduct} onClose={() => setSelectedProduct(null)} onAddToCart={handleAddToCart} />}

      {/* Contact Dialog */}
      <ContactDialog open={contactOpen} onOpenChange={setContactOpen} />
    </div>;
};
export default CustomerDashboard;
