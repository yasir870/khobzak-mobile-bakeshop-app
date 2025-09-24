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
        console.log(`Creating driver account for: ${driver.email}`);
        
        // Create auth user with admin client
        const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
          email: driver.email,
          password: driver.password,
          email_confirm: true,
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
            results.push({ 
              email: driver.email, 
              success: false, 
              error: `Failed to create driver record: ${driverError.message}` 
            });
            continue;
          }

          console.log(`Driver record created for ${driver.email}, driver ID: ${driverData.id}`);
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