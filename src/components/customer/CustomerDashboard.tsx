
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ShoppingCart, User, Clock, MessageSquare, LogOut } from 'lucide-react';

interface CustomerDashboardProps {
  onLogout: () => void;
}

const CustomerDashboard = ({ onLogout }: CustomerDashboardProps) => {
  const [cartItems, setCartItems] = useState(0);

  const breadTypes = [
    {
      id: 1,
      name: 'Traditional Arabic Bread',
      nameAr: 'خبز عربي تقليدي',
      price: 5,
      description: 'Fresh, soft traditional Arabic flatbread',
      image: '🥖'
    },
    {
      id: 2,
      name: 'Whole Wheat Bread',
      nameAr: 'خبز القمح الكامل',
      price: 7,
      description: 'Healthy whole wheat bread, rich in fiber',
      image: '🍞'
    },
    {
      id: 3,
      name: 'Sesame Bread',
      nameAr: 'خبز السمسم',
      price: 6,
      description: 'Delicious bread topped with sesame seeds',
      image: '🥯'
    },
    {
      id: 4,
      name: 'Cheese Bread',
      nameAr: 'خبز الجبن',
      price: 8,
      description: 'Soft bread filled with melted cheese',
      image: '🧀'
    },
    {
      id: 5,
      name: 'Za\'atar Bread',
      nameAr: 'خبز الزعتر',
      price: 6,
      description: 'Traditional bread with za\'atar herbs',
      image: '🌿'
    },
    {
      id: 6,
      name: 'Sweet Date Bread',
      nameAr: 'خبز التمر الحلو',
      price: 9,
      description: 'Sweet bread with dates and honey',
      image: '🍯'
    }
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-amber-50 to-orange-100">
      {/* Header */}
      <header className="bg-white/90 backdrop-blur-sm shadow-sm border-b border-amber-200">
        <div className="max-w-4xl mx-auto px-4 py-4 flex justify-between items-center">
          <div>
            <h1 className="text-2xl font-bold text-amber-800">خبزك</h1>
            <p className="text-sm text-amber-600">Fresh Bread Delivery</p>
          </div>
          <div className="flex items-center space-x-4">
            <Button variant="outline" size="sm" className="relative">
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

      {/* Main Content */}
      <main className="max-w-4xl mx-auto px-4 py-8">
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
              <Card key={bread.id} className="bg-white/90 backdrop-blur-sm hover:shadow-lg transition-shadow">
                <CardHeader className="text-center">
                  <div className="text-4xl mb-2">{bread.image}</div>
                  <CardTitle className="text-lg text-amber-800">{bread.name}</CardTitle>
                  <p className="text-sm text-amber-600 font-medium">{bread.nameAr}</p>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-gray-600 mb-4">{bread.description}</p>
                  <div className="flex justify-between items-center">
                    <span className="text-lg font-bold text-amber-700">{bread.price} SAR</span>
                    <Button 
                      size="sm" 
                      className="bg-amber-600 hover:bg-amber-700"
                      onClick={() => setCartItems(prev => prev + 1)}
                    >
                      Add to Cart
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>

        {/* Quick Actions */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Button variant="outline" className="h-16 flex items-center justify-center space-x-3">
            <Clock className="h-5 w-5" />
            <span>My Orders</span>
          </Button>
          <Button variant="outline" className="h-16 flex items-center justify-center space-x-3">
            <User className="h-5 w-5" />
            <span>Profile</span>
          </Button>
          <Button variant="outline" className="h-16 flex items-center justify-center space-x-3">
            <MessageSquare className="h-5 w-5" />
            <span>Contact Us</span>
          </Button>
        </div>
      </main>
    </div>
  );
};

export default CustomerDashboard;
