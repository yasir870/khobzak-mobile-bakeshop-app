
import { useEffect } from 'react';
import CustomerDashboard from './CustomerDashboard';
import { supabase } from '@/integrations/supabase/client';

interface CustomerAppProps {
  onLogout: () => void;
}

const CustomerApp = ({ onLogout }: CustomerAppProps) => {
  useEffect(() => {
    const fetchAndStoreCustomerId = async () => {
      const phone = localStorage.getItem('userPhone');
      if (phone) {
        // Avoid re-fetching if ID is already in storage
        if (localStorage.getItem('customerId')) return;

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
    };

    fetchAndStoreCustomerId();
  }, []);

  return <CustomerDashboard onLogout={onLogout} />;
};

export default CustomerApp;
