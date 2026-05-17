import { createClient } from 'npm:@supabase/supabase-js@2';

const cors = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': '*',
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors });
  const admin = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
  );
  const users = [
    { email: 'admin.khobzak@gmail.com', password: 'Admin@12345', user_type: 'admin', name: 'المدير العام', phone: '07700000001' },
    { email: 'bakery.alnoor@gmail.com', password: 'Bakery@12345', user_type: 'bakery', name: 'مخبز النور', phone: '07700000002' },
  ];
  const results: any[] = [];
  for (const u of users) {
    const { data, error } = await admin.auth.admin.createUser({
      email: u.email, password: u.password, email_confirm: true,
      user_metadata: { user_type: u.user_type, name: u.name, phone: u.phone },
    });
    let uid = data?.user?.id ?? null;
    if (error && /already/i.test(error.message)) {
      const { data: list } = await admin.auth.admin.listUsers();
      uid = list.users.find((x) => x.email === u.email)?.id ?? null;
    }
    if (uid) {
      await admin.from('user_roles').upsert({ user_id: uid, role: u.user_type }, { onConflict: 'user_id,role' });
      if (u.user_type === 'bakery') {
        await admin.from('bakeries').upsert({
          name: u.name, phone: u.phone, email: u.email,
          owner_user_id: uid, approved: true, address: 'بغداد',
        }, { onConflict: 'owner_user_id' });
      }
    }
    results.push({ email: u.email, id: uid, error: error?.message ?? null });
  }
  return new Response(JSON.stringify({ results }), {
    headers: { ...cors, 'Content-Type': 'application/json' },
  });
});
