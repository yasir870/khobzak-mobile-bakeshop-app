
import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Users, Truck } from 'lucide-react';
import LoginForm from '@/components/auth/LoginForm';
import CustomerApp from '@/components/customer/CustomerApp';
import DriverApp from '@/components/driver/DriverApp';

const Index = () => {
  const [selectedRole, setSelectedRole] = useState<'customer' | 'driver' | null>(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [userRole, setUserRole] = useState<'customer' | 'driver' | null>(null);

  const handleRoleSelect = (role: 'customer' | 'driver') => {
    setSelectedRole(role);
  };

  const handleAuthSuccess = (role: 'customer' | 'driver') => {
    setIsAuthenticated(true);
    setUserRole(role);
  };

  const handleLogout = () => {
    setIsAuthenticated(false);
    setSelectedRole(null);
    setUserRole(null);
  };

  // If authenticated, show the appropriate app
  if (isAuthenticated && userRole) {
    return userRole === 'customer' ? (
      <CustomerApp onLogout={handleLogout} />
    ) : (
      <DriverApp onLogout={handleLogout} />
    );
  }

  // If role selected but not authenticated, show login
  if (selectedRole) {
    return (
      <LoginForm 
        role={selectedRole} 
        onAuthSuccess={handleAuthSuccess}
        onBack={() => setSelectedRole(null)}
      />
    );
  }

  // Default: Show role selection
  return (
    <div className="min-h-screen bg-gradient-to-br from-amber-50 to-orange-100 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-amber-800 mb-2">خبزك</h1>
          <h2 className="text-2xl font-semibold text-amber-700 mb-1">Khobzak</h2>
          <p className="text-amber-600">Fresh Bread Delivery Service</p>
        </div>

        <Card className="shadow-lg border-0 bg-white/90 backdrop-blur-sm">
          <CardHeader className="text-center">
            <CardTitle className="text-xl text-amber-800">Choose Your Role</CardTitle>
            <CardDescription className="text-amber-600">
              Select how you'd like to use the app
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <Button
              onClick={() => handleRoleSelect('customer')}
              className="w-full h-16 bg-amber-600 hover:bg-amber-700 text-white font-medium text-lg"
              size="lg"
            >
              <Users className="mr-3 h-6 w-6" />
              <div className="text-left">
                <div>Customer</div>
                <div className="text-sm opacity-90">Order fresh bread</div>
              </div>
            </Button>

            <Button
              onClick={() => handleRoleSelect('driver')}
              variant="outline"
              className="w-full h-16 border-2 border-amber-600 text-amber-700 hover:bg-amber-50 font-medium text-lg"
              size="lg"
            >
              <Truck className="mr-3 h-6 w-6" />
              <div className="text-left">
                <div>Driver</div>
                <div className="text-sm opacity-75">Deliver orders</div>
              </div>
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default Index;
