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
}

const CustomerDashboard = ({ onLogout }: CustomerDashboardProps) => {
  const [cartItems, setCartItems] = useState(0);
  const [selectedProduct, setSelectedProduct] = useState<BreadProduct | null>(null);
  const [showCart, setShowCart] = useState(false);
  const [showProfile, setShowProfile] = useState(false);
  const [showOrders, setShowOrders] = useState(false);
  const breadTypes: BreadProduct[] = [
    {
      id: 1,
      name: 'Traditional Arabic Bread',
      nameAr: 'خبز عربي تقليدي',
      price: 5000,
      description: 'Fresh, soft traditional Arabic flatbread',
      detailedDescription: 'Our traditional Arabic bread is made fresh daily using time-honored recipes passed down through generations. Made with high-quality flour and baked in traditional ovens, this bread has a perfect soft texture and authentic taste that pairs perfectly with any meal.',
      images: ['🥖', '🍞', '🥯'],
      category: 'Traditional'
    },
    {
      id: 2,
      name: 'Whole Wheat Bread',
      nameAr: 'خبز القمح الكامل',
      price: 7000,
      description: 'Healthy whole wheat bread, rich in fiber',
      detailedDescription: 'Packed with nutrients and fiber, our whole wheat bread is perfect for health-conscious customers. Made with 100% whole wheat flour, this bread provides sustained energy and has a rich, nutty flavor that makes every bite satisfying.',
      images: ['🍞', '🌾', '🥖'],
      category: 'Healthy'
    },
    {
      id: 3,
      name: 'Sesame Bread',
      nameAr: 'خبز السمسم',
      price: 6000,
      description: 'Delicious bread topped with sesame seeds',
      detailedDescription: 'Our sesame bread features a golden crust generously topped with premium sesame seeds. The seeds add a delightful crunch and nutty flavor, making this bread perfect for sandwiches or enjoyed on its own.',
      images: ['🥯', '🌰', '🍞'],
      category: 'Specialty'
    },
    {
      id: 4,
      name: 'Cheese Bread',
      nameAr: 'خبز الجبن',
      price: 8000,
      description: 'Soft bread filled with melted cheese',
      detailedDescription: 'Indulge in our cheese bread featuring a soft, fluffy texture with pockets of melted cheese throughout. Made with high-quality cheese and fresh ingredients, this bread is perfect for cheese lovers and makes an excellent snack or side dish.',
      images: ['🧀', '🍞', '🥖'],
      category: 'Specialty'
    },
    {
      id: 5,
      name: 'Za\'atar Bread',
      nameAr: 'خبز الزعتر',
      price: 6000,
      description: 'Traditional bread with za\'atar herbs',
      detailedDescription: 'Experience the authentic taste of the Middle East with our za\'atar bread. Topped with a aromatic blend of za\'atar herbs, olive oil, and sesame seeds, this bread offers a perfect balance of flavors and is ideal for breakfast or as a healthy snack.',
      images: ['🌿', '🍞', '🥖'],
      category: 'Traditional'
    },
    {
      id: 6,
      name: 'Sweet Date Bread',
      nameAr: 'خبز التمر الحلو',
      price: 9000,
      description: 'Sweet bread with dates and honey',
      detailedDescription: 'Our sweet date bread combines the natural sweetness of dates with a touch of honey, creating a delightful treat. Perfect for breakfast or dessert, this bread offers a unique flavor profile that celebrates traditional Middle Eastern ingredients.',
      images: ['🍯', '🥖', '🍞'],
      category: 'Sweet'
    }
  ];

  const handleProductClick = (product: BreadProduct) => {
    setSelectedProduct(product);
  };

  const handleAddToCart = (quantity: number) => {
    setCartItems(prev => prev + quantity);
    setSelectedProduct(null);
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
          </div>
        </div>
      </header>

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
          <h3 className="text-2xl font-bold text-amber-800 mb-6">Our Fresh Bread</h3>
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
                  <p className="text-sm text-amber-600 font-medium">{bread.nameAr}</p>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-gray-600 mb-4">{bread.description}</p>
                  <div className="text-center">
                    <span className="text-lg font-bold text-amber-700">{bread.price} IQD</span>
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
