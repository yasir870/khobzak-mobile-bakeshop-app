
import { useEffect, useState } from 'react';
import CustomerDashboard from './CustomerDashboard';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import LocationPermissionDialog from './LocationPermissionDialog';

interface CustomerAppProps {
  onLogout: () => void;
}

const CustomerApp = ({ onLogout }: CustomerAppProps) => {
  const [isLoading, setIsLoading] = useState(true);
  const [showLocationDialog, setShowLocationDialog] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    const verifyAndFetchCustomerId = async () => {
      const phone = localStorage.getItem('userPhone');

      if (!phone) {
        // No phone in storage, user must log in.
        toast({
          title: 'Authentication Error',
          description: 'Your session has expired. Please log in again.',
          variant: 'destructive',
        });
        setTimeout(() => onLogout(), 2000);
        return;
      }

      // We have a phone, let's verify it and get the ID from Supabase.
      const { data: customer, error } = await supabase
        .from('customers')
        .select('id')
        .eq('phone', phone)
        .single();

      if (error || !customer) {
        console.error('Error verifying customer profile:', error?.message || 'Customer not found');
        // Clear potentially stale customerId
        localStorage.removeItem('customerId');
        toast({
          title: 'Authentication Error',
          description: 'Could not verify your profile. Please log in again.',
          variant: 'destructive',
        });
        setTimeout(() => onLogout(), 2000);
      } else {
        // Success. Store the fresh customer ID and proceed.
        localStorage.setItem('customerId', customer.id.toString());
        
        // Check if user location was previously requested
        const locationAsked = localStorage.getItem('locationPermissionAsked');
        const userLocation = localStorage.getItem('userLocation');
        
        if (!locationAsked && !userLocation) {
          // First time user - show location permission dialog
          setShowLocationDialog(true);
        }
        
        setIsLoading(false);
      }
    };

    verifyAndFetchCustomerId();
  }, [onLogout, toast]);

  const handleAllowLocation = () => {
    return new Promise<void>((resolve) => {
      if (!navigator.geolocation) {
        toast({
          title: "خطأ في الموقع",
          description: "متصفحك لا يدعم خدمة تحديد الموقع",
          variant: "destructive"
        });
        resolve();
        return;
      }

      navigator.geolocation.getCurrentPosition(
        (position) => {
          const location = {
            lat: position.coords.latitude,
            lng: position.coords.longitude
          };
          localStorage.setItem('userLocation', JSON.stringify(location));
          localStorage.setItem('locationPermissionAsked', 'true');
          
          toast({
            title: "تم حفظ موقعك بنجاح",
            description: "تم تحديد موقعك بنجاح وسيتم استخدامه للتوصيل الدقيق",
          });
          resolve();
        },
        (error) => {
          localStorage.setItem('locationPermissionAsked', 'true');
          toast({
            title: "تعذر تحديد الموقع",
            description: "لم نتمكن من تحديد موقعك، يرجى إدخال العنوان يدويًا.",
            variant: "destructive"
          });
          resolve();
        },
        {
          enableHighAccuracy: true,
          timeout: 10000,
          maximumAge: 300000
        }
      );
    });
  };

  const handleDenyLocation = () => {
    localStorage.setItem('locationPermissionAsked', 'true');
    toast({
      title: "لم نتمكن من تحديد موقعك، يرجى إدخال العنوان يدويًا.",
      description: "يمكنك السماح بالوصول للموقع لاحقاً من الإعدادات",
      variant: "destructive"
    });
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-screen bg-amber-50">
        <div className="text-center space-y-4">
          <div className="w-12 h-12 border-4 border-amber-600 border-t-transparent rounded-full animate-spin mx-auto"></div>
          <p className="text-lg text-amber-800 font-semibold">Loading Your Profile</p>
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
        onAllowLocation={handleAllowLocation}
        onDenyLocation={handleDenyLocation}
      />
    </>
  );
};

export default CustomerApp;
