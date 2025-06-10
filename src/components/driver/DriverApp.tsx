
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { LogOut, MapPin, Phone, Clock } from 'lucide-react';

interface DriverAppProps {
  onLogout: () => void;
}

const DriverApp = ({ onLogout }: DriverAppProps) => {
  const [orders] = useState([
    {
      id: '001',
      customer: 'Ahmed Al-Rashid',
      phone: '+966501234567',
      address: '123 King Fahd Road, Riyadh',
      items: 'Arabic Bread x2, Cheese Bread x1',
      total: 18,
      status: 'pending',
      orderTime: '10:30 AM'
    },
    {
      id: '002',
      customer: 'Fatima Al-Zahra',
      phone: '+966509876543',
      address: '456 Prince Mohammed Street, Riyadh',
      items: 'Whole Wheat x3, Za\'atar Bread x2',
      total: 33,
      status: 'accepted',
      orderTime: '11:15 AM'
    }
  ]);

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending': return 'bg-yellow-500';
      case 'accepted': return 'bg-blue-500';
      case 'in-transit': return 'bg-purple-500';
      case 'delivered': return 'bg-green-500';
      default: return 'bg-gray-500';
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'pending': return 'Pending';
      case 'accepted': return 'Accepted';
      case 'in-transit': return 'In Transit';
      case 'delivered': return 'Delivered';
      default: return status;
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
      {/* Header */}
      <header className="bg-white/90 backdrop-blur-sm shadow-sm border-b border-blue-200">
        <div className="max-w-4xl mx-auto px-4 py-4 flex justify-between items-center">
          <div>
            <h1 className="text-2xl font-bold text-blue-800">Driver Dashboard</h1>
            <p className="text-sm text-blue-600">خبزك Delivery Service</p>
          </div>
          <Button onClick={onLogout} variant="ghost" size="sm">
            <LogOut className="h-4 w-4 mr-2" />
            Logout
          </Button>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-4xl mx-auto px-4 py-8">
        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
          <Card className="bg-white/90 backdrop-blur-sm">
            <CardContent className="p-6 text-center">
              <h3 className="text-2xl font-bold text-blue-800">5</h3>
              <p className="text-blue-600">Today's Deliveries</p>
            </CardContent>
          </Card>
          <Card className="bg-white/90 backdrop-blur-sm">
            <CardContent className="p-6 text-center">
              <h3 className="text-2xl font-bold text-green-600">245 SAR</h3>
              <p className="text-blue-600">Today's Earnings</p>
            </CardContent>
          </Card>
          <Card className="bg-white/90 backdrop-blur-sm">
            <CardContent className="p-6 text-center">
              <h3 className="text-2xl font-bold text-orange-600">2</h3>
              <p className="text-blue-600">Pending Orders</p>
            </CardContent>
          </Card>
        </div>

        {/* Orders List */}
        <div>
          <h3 className="text-2xl font-bold text-blue-800 mb-6">Delivery Orders</h3>
          <div className="space-y-4">
            {orders.map((order) => (
              <Card key={order.id} className="bg-white/90 backdrop-blur-sm">
                <CardHeader>
                  <div className="flex justify-between items-start">
                    <div>
                      <CardTitle className="text-lg text-blue-800">Order #{order.id}</CardTitle>
                      <p className="text-sm text-gray-600 flex items-center mt-1">
                        <Clock className="h-4 w-4 mr-1" />
                        {order.orderTime}
                      </p>
                    </div>
                    <Badge className={`${getStatusColor(order.status)} text-white`}>
                      {getStatusText(order.status)}
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                    <div>
                      <h4 className="font-semibold text-blue-800 mb-2">Customer Info</h4>
                      <p className="text-sm text-gray-700">{order.customer}</p>
                      <p className="text-sm text-gray-600 flex items-center">
                        <Phone className="h-4 w-4 mr-1" />
                        {order.phone}
                      </p>
                    </div>
                    <div>
                      <h4 className="font-semibold text-blue-800 mb-2">Delivery Address</h4>
                      <p className="text-sm text-gray-700 flex items-start">
                        <MapPin className="h-4 w-4 mr-1 mt-0.5 flex-shrink-0" />
                        {order.address}
                      </p>
                    </div>
                  </div>
                  
                  <div className="mb-4">
                    <h4 className="font-semibold text-blue-800 mb-2">Order Items</h4>
                    <p className="text-sm text-gray-700">{order.items}</p>
                    <p className="text-lg font-bold text-blue-700 mt-2">Total: {order.total} SAR</p>
                  </div>

                  <div className="flex space-x-2">
                    {order.status === 'pending' && (
                      <>
                        <Button size="sm" className="bg-green-600 hover:bg-green-700">
                          Accept Order
                        </Button>
                        <Button size="sm" variant="outline" className="text-red-600 border-red-600 hover:bg-red-50">
                          Decline
                        </Button>
                      </>
                    )}
                    {order.status === 'accepted' && (
                      <Button size="sm" className="bg-purple-600 hover:bg-purple-700">
                        Start Delivery
                      </Button>
                    )}
                    {order.status === 'in-transit' && (
                      <Button size="sm" className="bg-blue-600 hover:bg-blue-700">
                        Mark as Delivered
                      </Button>
                    )}
                    <Button size="sm" variant="outline">
                      <Phone className="h-4 w-4 mr-1" />
                      Call Customer
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </main>
    </div>
  );
};

export default DriverApp;
