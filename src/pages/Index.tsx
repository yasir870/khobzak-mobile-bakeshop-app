
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Users, Truck } from 'lucide-react';
import LoginForm from '@/components/auth/LoginForm';
import CustomerApp from '@/components/customer/CustomerApp';
import DriverApp from '@/components/driver/DriverApp';
import { useTranslation } from '@/context/LanguageContext';
import LanguageSwitcher from '@/components/LanguageSwitcher';

const Index = () => {
  const [selectedRole, setSelectedRole] = useState<'customer' | 'driver' | null>(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [userRole, setUserRole] = useState<'customer' | 'driver' | null>(null);
  const { t } = useTranslation();

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
    <div className="min-h-screen bg-warm-gradient flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <div className="mb-4">
            <img
              src="https://lakvfrohnlinfcqfwkqq.supabase.co/storage/v1/object/public/photos//A_logo_on_a_grid-patterned_beige_background_featur.png"
              alt="خبزك Logo"
              className="mx-auto w-20 h-20 md:w-28 md:h-28 rounded-full border-4 border-primary/20 shadow-warm-lg transition-all duration-300 hover:scale-110"
            />
          </div>
          <h1 className="text-4xl font-bold text-primary mb-2">{t('appName')}</h1>
          <p className="text-primary/80 text-lg">{t('appSlogan')}</p>
        </div>

        <Card className="shadow-warm-lg border-0 bg-card/95 backdrop-blur-sm">
          <CardHeader className="text-center pb-4">
            <CardTitle className="text-2xl text-primary">{t('chooseYourRole')}</CardTitle>
            <CardDescription className="text-primary/70 text-base">
              {t('selectHowToUse')}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <Button
              onClick={() => handleRoleSelect('customer')}
              className="w-full h-16 bg-primary hover:bg-primary/90 text-primary-foreground font-semibold text-lg shadow-warm transition-all duration-200 hover:shadow-warm-lg hover:scale-[1.02]"
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
              className="w-full h-16 border-2 border-primary/30 text-primary hover:bg-primary/5 hover:border-primary/50 font-semibold text-lg transition-all duration-200 hover:scale-[1.02]"
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
