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
  const results = [];
  
  for (const driver of testDrivers) {
    try {
      // Create Supabase Auth account
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email: driver.email,
        password: driver.password,
        options: {
          emailRedirectTo: `${window.location.origin}/`,
          data: {
            phone: driver.phone,
            name: driver.name,
            user_type: 'driver'
          }
        }
      });

      if (authError) {
        console.error('Auth error for', driver.email, ':', authError);
        results.push({ 
          email: driver.email, 
          success: false, 
          error: authError.message 
        });
        continue;
      }

      // The trigger should automatically create the profile
      // But let's make sure the driver record exists with correct ID
      if (authData.user) {
        // Update the drivers table to link the auth user
        const { error: updateError } = await supabase
          .from('drivers')
          .update({ 
            email: driver.email,
            approved: true 
          })
          .eq('phone', driver.phone);

        if (updateError) {
          console.error('Driver update error for', driver.email, ':', updateError);
        }
      }

      results.push({ 
        email: driver.email, 
        success: true, 
        userId: authData.user?.id 
      });
      
      console.log('Created test driver account:', driver.email);
      
    } catch (error) {
      console.error('Unexpected error creating driver', driver.email, ':', error);
      results.push({ 
        email: driver.email, 
        success: false, 
        error: (error as Error).message 
      });
    }
  }
  
  return results;
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