import { supabase } from '@/integrations/supabase/client';

interface TestDriver {
  email: string;
  password: string;
  phone: string;
  name: string;
}

const testDrivers: TestDriver[] = [
  {
    email: 'driver1@test.com',
    password: 'password123',
    phone: '07801234567',
    name: 'سائق تجريبي 1'
  },
  {
    email: 'driver2@test.com', 
    password: 'password123',
    phone: '07801234568',
    name: 'سائق تجريبي 2'
  },
  {
    email: 'driver3@test.com',
    password: 'password123', 
    phone: '07801234569',
    name: 'سائق تجريبي 3'
  }
];

export const createTestDriverAccounts = async () => {
  try {
    const { data, error } = await supabase.functions.invoke('create-test-drivers', {
      body: {}
    });

    if (error) {
      console.error('Edge function error:', error);
      return [{
        email: 'Edge Function Error',
        success: false,
        error: error.message
      }];
    }

    return data.results || [];
  } catch (error) {
    console.error('Unexpected error calling edge function:', error);
    return [{
      email: 'Function Call Error',
      success: false,
      error: (error as Error).message
    }];
  }
};

export const getTestDriverCredentials = async () => {
  try {
    const { data, error } = await supabase
      .from('test_credentials')
      .select('*')
      .eq('user_type', 'driver');
    
    if (error) {
      console.error('Error fetching test credentials:', error);
      return [];
    }
    
    return data || [];
  } catch (error) {
    console.error('Unexpected error fetching test credentials:', error);
    return [];
  }
};