
import { useEffect, useState } from 'react';
import CustomerDashboard from './CustomerDashboard';
import { supabase } from '@/integrations/supabase/client';

interface CustomerAppProps {
  onLogout: () => void;
}

const CustomerApp = ({ onLogout }: CustomerAppProps) => {
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchAndStoreCustomerId = async () => {
      const phone = localStorage.getItem('userPhone');
      if (phone && !localStorage.getItem('customerId')) {
        const { data: customer, error } = await supabase
          .from('customers')
          .select('id')
          .eq('phone', phone)
          .single();

        if (error) {
          console.error('Error fetching customer id:', error);
        } else if (customer) {
          localStorage.setItem('customerId', customer.id.toString());
        }
      }
      setIsLoading(false);
    };

    fetchAndStoreCustomerId();
  }, []);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-screen bg-amber-50">
        <div className="text-center space-y-4">
          <div className="w-12 h-12 border-4 border-amber-600 border-t-transparent rounded-full animate-spin mx-auto"></div>
          <p className="text-lg text-amber-800 font-semibold">Loading Your Profile</p>
          <p className="text-sm text-amber-600">Please wait a moment.</p>
        </div>
      </div>
    );
  }

  return <CustomerDashboard onLogout={onLogout} />;
};

export default CustomerApp;
