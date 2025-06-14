import { useState } from 'react';
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

const CustomerDashboard = ({ onLogout }: CustomerDashboardProps) => {
  const [cartItems, setCartItems] = useState(0);
  const [selectedProduct, setSelectedProduct] = useState<BreadProduct | null>(null);
  const [showCart, setShowCart] = useState(false);
  const [showProfile, setShowProfile] = useState(false);
  const [showOrders, setShowOrders] = useState(false);
  const [showAllPhones, setShowAllPhones] = useState(false);
  const [allPhones, setAllPhones] = useState<string[]>([]);
  const [loadingPhones, setLoadingPhones] = useState(false);

  // عدل صور المنتجات من Emoji إلى روابط الصور الحقيقية التي رفعتها على Supabase
  const breadTypes: BreadProduct[] = [
    {
      id: 1,
      name: "خبز التنور",
      nameAr: "",
      price: 1000,
      description: "خبز دائري يُخبز داخل تنور طيني. طري من الداخل ومقرمش من الخارج، مثالي للفطور والغداء.",
      detailedDescription: "خبز دائري يُخبز داخل تنور طيني. طري بالشَدّة من الداخل ومقرمش من الخارج لوجبة فطور أو غداء شعبية جدًا. عدد القطع: 8. ملاحظات: شعبي جدًا.",
      images: [
        "https://lakvfrohnlinfcqfwkqq.supabase.co/storage/v1/object/public/products/tanour.jpg"
      ],
      category: "شعبي جدًا",
      pieces: 8,
      notes: "شعبي جدًا"
    },
    {
      id: 2,
      name: "خبز الصمون الحجري",
      nameAr: "",
      price: 1000,
      description: "رغيف طويل، هش من الداخل ويُخبز في أفران حجرية. مناسب للسندويشات أو مع الشوربة.",
      detailedDescription: "رغيف طويل هوائي هش من الداخل. يُخبز في أفران حجرية مخصصة ليمنحك خبز يومي للسندويشات أو مع الشوربة. عدد القطع: 8. ملاحظات: يومي.",
      images: [
        "https://lakvfrohnlinfcqfwkqq.supabase.co/storage/v1/object/public/products/samoon.jpg"
      ],
      category: "يومي",
      pieces: 8,
      notes: "يومي"
    },
    {
      id: 3,
      name: "خبز الرقاق (صاج)",
      nameAr: "",
      price: 1000,
      description: "رقيق جدًا يُطهى على صاج معدني، مثالي للفطور مع العسل أو يستخدم للف الدولمة.",
      detailedDescription: "خبز رقاق رقيق جدًا يُطهى سريعًا على صاج معدني ساخن. خفيف ومناسب للفطور مع العسل أو للف الدولمة. عدد القطع: 4. ملاحظات: خفيف.",
      images: [
        "https://lakvfrohnlinfcqfwkqq.supabase.co/storage/v1/object/public/products/ragag.jpg"
      ],
      category: "خفيف",
      pieces: 4,
      notes: "خفيف"
    },
    {
      id: 4,
      name: "خبز الشاورما",
      nameAr: "",
      price: 1000,
      description: "خبز رقيق لكنه قوي ومتين، مثالي للفّ الشاورما والفلافل، لا يتمزق بسهولة.",
      detailedDescription: "خبز خاص رقيق لكن متين ومتماسك. مناسب جدًا للفّ الشاورما والفلافل والساندويشات المتنوعة دون أن يتمزق أو يتشقق. عدد القطع: 4. ملاحظات: ساندويش.",
      images: [
        "https://lakvfrohnlinfcqfwkqq.supabase.co/storage/v1/object/public/products/shawerma.jpg"
      ],
      category: "ساندويش",
      pieces: 4,
      notes: "ساندويش"
    },
    {
      id: 5,
      name: "خبز السكري",
      nameAr: "",
      price: 1000,
      description: "خبز خاص لمرضى السكري، مصنوع بدون سكر وبدقيق صحي منخفض الكربوهيدرات.",
      detailedDescription: "خبز صحي مخصص لمرضى السكري ولأنماط الغذاء الصحية. مصنوع بدون سكر وبدقيق خاص منخفض الكربوهيدرات. عدد القطع: 4. ملاحظات: صحي / لمرضى السكري.",
      images: [
        "https://lakvfrohnlinfcqfwkqq.supabase.co/storage/v1/object/public/products/sokari.jpg"
      ],
      category: "صحي",
      pieces: 4,
      notes: "صحي / لمرضى السكري"
    }
  ];

  const handleProductClick = (product: BreadProduct) => {
    setSelectedProduct(product);
  };

  const handleAddToCart = (quantity: number) => {
    setCartItems(prev => prev + quantity);
    setSelectedProduct(null);
  };

  const handleShowAllPhones = async () => {
    setLoadingPhones(true);
    setShowAllPhones(true);
    const { data, error } = await supabase.from('customers').select('phone');
    setLoadingPhones(false);
    if (data && Array.isArray(data)) {
      setAllPhones(data.map((e: any) => e.phone));
    } else {
      setAllPhones(['حدث خطأ في جلب الأرقام!']);
    }
  };

  if (showCart) {
    return (
      <CartPage 
        onBack={() => setShowCart(false)}
        cartItemCount={cartItems}
      />
    );
  }

  if (showProfile) {
    return (
      <ProfilePage onBack={() => setShowProfile(false)} />
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-amber-50 to-orange-100">
      {/* Fixed Header */}
      <header className="fixed top-0 left-0 right-0 z-50 bg-white/95 backdrop-blur-sm shadow-sm border-b border-amber-200">
        <div className="max-w-4xl mx-auto px-4 py-4 flex justify-between items-center">
          <div>
            <h1 className="text-2xl font-bold text-amber-800">خبزك</h1>
            <p className="text-sm text-amber-600">Fresh Bread Delivery</p>
          </div>
          <div className="flex items-center space-x-4">
            <Button 
              variant="outline" 
              size="sm" 
              className="relative"
              onClick={() => setShowCart(true)}
            >
              <ShoppingCart className="h-4 w-4" />
              {cartItems > 0 && (
                <Badge className="absolute -top-2 -right-2 h-5 w-5 rounded-full bg-amber-600 text-white text-xs">
                  {cartItems}
                </Badge>
              )}
            </Button>
            <Button onClick={onLogout} variant="ghost" size="sm">
              <LogOut className="h-4 w-4 mr-2" />
              Logout
            </Button>
            {/* تمت إزالة زر فحص كل الأرقام نهائيًا */}
          </div>
        </div>
      </header>

      {/* نافذة عرض الأرقام أيضاً ستختفي لأنه لا يوجد زر يفتحها */}

      {/* Main Content with top padding to account for fixed header */}
      <main className="max-w-4xl mx-auto px-4 pt-24 pb-8">
        {/* Welcome Section */}
        <Card className="mb-8 bg-white/90 backdrop-blur-sm">
          <CardContent className="p-6">
            <h2 className="text-xl font-semibold text-amber-800 mb-2">Welcome back!</h2>
            <p className="text-amber-600">Discover our fresh bread selection, baked daily with love.</p>
          </CardContent>
        </Card>

        {/* Bread Menu */}
        <div className="mb-8">
          <h3 className="text-2xl font-bold text-amber-800 mb-6">أنواع الخبز المتوفرة</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {breadTypes.map((bread) => (
              <Card 
                key={bread.id} 
                className="bg-white/90 backdrop-blur-sm hover:shadow-lg transition-shadow cursor-pointer"
                onClick={() => handleProductClick(bread)}
              >
                <CardHeader className="text-center">
                  <div className="text-4xl mb-2">{bread.images[0]}</div>
                  <CardTitle className="text-lg text-amber-800">{bread.name}</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-gray-600 mb-3">{bread.description}</p>
                  <div className="flex justify-between items-center mb-1">
                    <span className="text-base text-amber-700 font-semibold">السعر: {bread.price} د.ع</span>
                    <span className="text-base text-amber-700 font-semibold">الكمية: {bread.pieces} {bread.pieces === 1 ? "قطعة" : "قطع"}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-base text-gray-600">ملاحظات: {bread.notes}</span>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>

        {/* Quick Actions */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Button 
            variant="outline" 
            className="h-16 flex items-center justify-center space-x-3"
            onClick={() => setShowCart(true)}
          >
            <Clock className="h-5 w-5" />
            <span>My Orders</span>
          </Button>
          <Button 
            variant="outline" 
            className="h-16 flex items-center justify-center space-x-3"
            onClick={() => setShowProfile(true)}
          >
            <User className="h-5 w-5" />
            <span>Profile</span>
          </Button>
          <Button variant="outline" className="h-16 flex items-center justify-center space-x-3">
            <MessageSquare className="h-5 w-5" />
            <span>Contact Us</span>
          </Button>
        </div>
      </main>

      {/* Product Detail Modal */}
      {selectedProduct && (
        <ProductDetailModal
          product={selectedProduct}
          onClose={() => setSelectedProduct(null)}
          onAddToCart={handleAddToCart}
        />
      )}
    </div>
  );
};

export default CustomerDashboard;
