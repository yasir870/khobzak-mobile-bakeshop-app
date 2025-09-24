import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

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

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  if (req.method !== 'POST') {
    return new Response(
      JSON.stringify({ error: 'Method not allowed' }),
      { status: 405, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    
    // Create admin client with service role key
    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);
    
    console.log('Starting test driver creation process...');
    
    const results = [];
    
    for (const driver of testDrivers) {
      try {
        console.log(`Processing driver: ${driver.email}`);
        
        // Check if user already exists by listing users and filtering
        const { data: usersData } = await supabaseAdmin.auth.admin.listUsers();
        const existingUser = usersData?.users?.find(u => u.email === driver.email);
        
        if (existingUser) {
          console.log(`User ${driver.email} already exists with ID: ${existingUser.id}`);
          
          // Delete existing user first to recreate with correct settings
          await supabaseAdmin.auth.admin.deleteUser(existingUser.id);
          console.log(`Deleted existing user: ${driver.email}`);
        }
        
        // Create auth user with admin client
        const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
          email: driver.email,
          password: driver.password,
          email_confirm: true, // Auto-confirm email
          user_metadata: {
            phone: driver.phone,
            name: driver.name,
            user_type: 'driver'
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

        if (authData.user) {
          console.log(`Auth user created for ${driver.email}, ID: ${authData.user.id}`);
          
          // Clear and re-insert test credentials
          await supabaseAdmin
            .from('test_credentials')
            .delete()
            .eq('email', driver.email);
          
          // Insert into test_credentials table
          const { error: credError } = await supabaseAdmin
            .from('test_credentials')
            .insert({
              email: driver.email,
              password: driver.password,
              phone: driver.phone,
              name: driver.name,
              user_type: 'driver'
            });

          if (credError) {
            console.error('Error inserting test credentials:', credError);
          } else {
            console.log(`Test credentials saved for ${driver.email}`);
          }
          
          // Clear and re-insert driver record
          await supabaseAdmin
            .from('drivers')
            .delete()
            .eq('email', driver.email);
          
          // Insert into drivers table
          const { data: driverData, error: driverError } = await supabaseAdmin
            .from('drivers')
            .insert({
              name: driver.name,
              phone: driver.phone,
              email: driver.email,
              approved: true
            })
            .select('id')
            .single();

          if (driverError) {
            console.error('Driver table insert error for', driver.email, ':', driverError);
          } else {
            console.log(`Driver record created for ${driver.email}, driver ID: ${driverData.id}`);
          }
        }

        results.push({ 
          email: driver.email, 
          success: true, 
          userId: authData.user?.id 
        });
        
        console.log(`Successfully created test driver account: ${driver.email}`);
        
      } catch (error) {
        console.error('Unexpected error creating driver', driver.email, ':', error);
        results.push({ 
          email: driver.email, 
          success: false, 
          error: (error as Error).message 
        });
      }
    }
    
    console.log('Test driver creation completed. Results:', results);
    
    return new Response(
      JSON.stringify({ 
        success: true, 
        results,
        message: `Created ${results.filter(r => r.success).length} drivers successfully`
      }),
      { 
        status: 200, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
    
  } catch (error) {
    console.error('Edge function error:', error);
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: 'Internal server error',
        details: (error as Error).message 
      }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }
});