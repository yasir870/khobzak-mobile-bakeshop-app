
import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Users, Truck } from 'lucide-react';
import AuthPage from '@/components/auth/AuthPage';
import CustomerApp from '@/components/customer/CustomerApp';
import DriverApp from '@/components/driver/DriverApp';
import { useTranslation } from '@/context/LanguageContext';
import LanguageSwitcher from '@/components/LanguageSwitcher';
import { useAuth } from '@/context/AuthContext';

const Index = () => {
  const [selectedRole, setSelectedRole] = useState<'customer' | 'driver' | null>(null);
  const { t } = useTranslation();
  const { user, getUserType, isLoading, signOut } = useAuth();

  // Auto-redirect authenticated users to their app
  useEffect(() => {
    if (!isLoading && user) {
      const userType = getUserType();
      if (userType === 'customer') {
        setSelectedRole('customer');
      } else if (userType === 'driver') {
        setSelectedRole('driver');
      }
    }
  }, [user, isLoading, getUserType]);

  const handleRoleSelect = (role: 'customer' | 'driver') => {
    setSelectedRole(role);
  };

  const handleLogout = async () => {
    await signOut();
    setSelectedRole(null);
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">جاري التحميل...</p>
        </div>
      </div>
    );
  }

  // If authenticated, show the appropriate app
  if (user) {
    const userType = getUserType();
    return userType === 'customer' ? (
      <CustomerApp onLogout={handleLogout} />
    ) : userType === 'driver' ? (
      <DriverApp onLogout={handleLogout} />
    ) : null;
  }

  // If role selected but not authenticated, show auth page
  if (selectedRole) {
    return (
      <AuthPage 
        role={selectedRole}
        onBack={() => setSelectedRole(null)}
      />
    );
  }

  // Default: Show role selection
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <div className="mb-4">
            <img
              src="https://lakvfrohnlinfcqfwkqq.supabase.co/storage/v1/object/public/photos//A_logo_on_a_grid-patterned_beige_background_featur.png"
              alt="خبزك Logo"
              className="mx-auto w-20 h-20 md:w-28 md:h-28 rounded-full border-4 border-white shadow-lg"
            />
          </div>
          <h1 className="text-4xl font-bold text-gray-800 mb-2">{t('appName')}</h1>
          <p className="text-gray-600 text-lg">{t('appSlogan')}</p>
        </div>

        <Card className="shadow-xl border-0">
          <CardHeader className="text-center pb-4">
            <CardTitle className="text-2xl text-gray-800">{t('chooseYourRole')}</CardTitle>
            <CardDescription className="text-gray-600 text-base">
              {t('selectHowToUse')}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <Button
              onClick={() => handleRoleSelect('customer')}
              className="w-full h-16 bg-blue-600 hover:bg-blue-700 text-white font-semibold text-lg shadow-lg transition-all duration-200 hover:shadow-xl hover:scale-[1.02]"
              size="lg"
            >
              <Users className="mr-3 h-6 w-6" />
              <div className="text-left rtl:text-right">
                <div>{t('customer')}</div>
                <div className="text-sm opacity-90 font-normal">{t('customerDescription')}</div>
              </div>
            </Button>

            <Button
              onClick={() => handleRoleSelect('driver')}
              variant="outline"
              className="w-full h-16 border-2 border-gray-300 text-gray-700 hover:bg-gray-50 hover:border-gray-400 font-semibold text-lg transition-all duration-200 hover:scale-[1.02]"
              size="lg"
            >
              <Truck className="mr-3 h-6 w-6" />
              <div className="text-left rtl:text-right">
                <div>{t('driver')}</div>
                <div className="text-sm opacity-75 font-normal">{t('driverDescription')}</div>
              </div>
            </Button>
            
            <div className="pt-4 flex justify-center">
              <LanguageSwitcher />
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default Index;
