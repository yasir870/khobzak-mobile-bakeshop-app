import { useEffect, useState } from 'react';
import CustomerDashboard from './CustomerDashboard';
import { useAuth } from '@/context/AuthContext';
import { useToast } from '@/hooks/use-toast';
import LocationPermissionDialog from './LocationPermissionDialog';

interface CustomerAppProps {
  onLogout: () => void;
}

const CustomerApp = ({ onLogout }: CustomerAppProps) => {
  const [isLoading, setIsLoading] = useState(true);
  const [showLocationDialog, setShowLocationDialog] = useState(false);
  const { toast } = useToast();
  const { user, getUserType, isLoading: authLoading } = useAuth();

  useEffect(() => {
    const initializeCustomer = async () => {
      if (authLoading) return; // Wait for auth to load
      
      if (!user) {
        toast({
          title: 'جلسة منتهية',
          description: 'انتهت جلستك. يرجى تسجيل الدخول مرة أخرى.',
          variant: 'destructive',
        });
        setTimeout(() => onLogout(), 2000);
        return;
      }

      const userType = getUserType();
      if (userType !== 'customer') {
        toast({
          title: 'غير مخول',
          description: 'هذا التطبيق مخصص للعملاء فقط.',
          variant: 'destructive',
        });
        setTimeout(() => onLogout(), 2000);
        return;
      }

      // Check location permission
      if (navigator.geolocation) {
        navigator.permissions.query({ name: 'geolocation' }).then((result) => {
          if (result.state === 'prompt') {
            setShowLocationDialog(true);
          }
        }).catch(() => {
          setShowLocationDialog(true);
        });
      }

      setIsLoading(false);
    };

    initializeCustomer();
  }, [user, authLoading, getUserType, onLogout, toast]);

  const handleLocationPermissionGranted = () => {
    setShowLocationDialog(false);
  };

  if (authLoading || isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">جاري التحميل...</p>
        </div>
      </div>
    );
  }

  return (
    <>
      <CustomerDashboard onLogout={onLogout} />
      <LocationPermissionDialog 
        isOpen={showLocationDialog}
        onClose={() => setShowLocationDialog(false)}
        onAllowLocation={handleLocationPermissionGranted}
        onDenyLocation={() => setShowLocationDialog(false)}
      />
    </>
  );
};

export default CustomerApp;