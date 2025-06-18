
import { useEffect, useState } from 'react';
import CustomerDashboard from './CustomerDashboard';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface CustomerAppProps {
  onLogout: () => void;
}

const CustomerApp = ({ onLogout }: CustomerAppProps) => {
  const [isLoading, setIsLoading] = useState(true);
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
        setIsLoading(false);
      }
    };

    verifyAndFetchCustomerId();
  }, [onLogout, toast]);

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

  return <CustomerDashboard onLogout={onLogout} />;
};

export default CustomerApp;
