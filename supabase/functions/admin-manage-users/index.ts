import { createClient } from 'npm:@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

interface Payload {
  action: 'list' | 'create' | 'update' | 'delete'
  role: 'driver' | 'bakery'
  // create / update fields
  user_id?: string
  email?: string
  password?: string
  phone?: string
  name?: string
  approved?: boolean
  address?: string
  logo_url?: string
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })

  try {
    const authHeader = req.headers.get('Authorization')
    if (!authHeader?.startsWith('Bearer ')) {
      return json({ error: 'Unauthorized' }, 401)
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const anonKey = Deno.env.get('SUPABASE_ANON_KEY')!
    const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!

    const userClient = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authHeader } },
    })
    const token = authHeader.replace('Bearer ', '')
    const { data: claimsData, error: claimsErr } = await userClient.auth.getClaims(token)
    if (claimsErr || !claimsData?.claims) return json({ error: 'Unauthorized' }, 401)

    const callerId = claimsData.claims.sub as string

    const admin = createClient(supabaseUrl, serviceKey)

    // Verify caller is admin
    const { data: roleRow, error: roleErr } = await admin
      .from('user_roles')
      .select('role')
      .eq('user_id', callerId)
      .eq('role', 'admin')
      .maybeSingle()
    if (roleErr || !roleRow) return json({ error: 'Forbidden: admin role required' }, 403)

    const body = (await req.json()) as Payload
    const { action, role } = body
    if (!action || !role) return json({ error: 'Missing action or role' }, 400)
    if (!['driver', 'bakery'].includes(role)) return json({ error: 'Invalid role' }, 400)

    if (action === 'list') {
      const table = role === 'driver' ? 'drivers' : 'bakeries'
      const { data, error } = await admin.from(table).select('*').order('created_at', { ascending: false })
      if (error) return json({ error: error.message }, 500)
      return json({ data })
    }

    if (action === 'create') {
      const { email, password, phone, name, approved, address } = body
      if (!email || !password || !name) return json({ error: 'email, password, name required' }, 400)
      const { data: created, error: createErr } = await admin.auth.admin.createUser({
        email,
        password,
        email_confirm: true,
        user_metadata: { phone, name, user_type: role },
      })
      if (createErr) return json({ error: createErr.message }, 500)
      const newUserId = created.user!.id

      // ensure role
      await admin.from('user_roles').upsert({ user_id: newUserId, role }, { onConflict: 'user_id,role' })

      if (role === 'driver') {
        await admin.from('drivers').insert({ name, phone, email, approved: approved ?? true })
      } else {
        await admin.from('bakeries').insert({
          name, phone, email, address, owner_user_id: newUserId, approved: approved ?? true,
        })
      }

      return json({ success: true, user_id: newUserId })
    }

    if (action === 'update') {
      const { user_id, email, password, phone, name, approved, address, logo_url } = body
      const table = role === 'driver' ? 'drivers' : 'bakeries'

      // For drivers we receive the drivers.id (bigint) inside user_id field? Use email to find auth user.
      // Strategy: caller passes email + optional new password/email.
      if (email || password) {
        // Find auth user by email
        const oldEmail = body.email
        const { data: list } = await admin.auth.admin.listUsers()
        const authUser = list.users.find(u =>
          u.email === oldEmail ||
          u.user_metadata?.phone === phone ||
          u.id === user_id
        )
        if (authUser && password) {
          await admin.auth.admin.updateUserById(authUser.id, {
            password,
            email: email || undefined,
            user_metadata: { ...authUser.user_metadata, phone, name },
          })
        }
      }

      const updateFields: any = {}
      if (name !== undefined) updateFields.name = name
      if (phone !== undefined) updateFields.phone = phone
      if (email !== undefined) updateFields.email = email
      if (approved !== undefined) updateFields.approved = approved
      if (role === 'bakery') {
        if (address !== undefined) updateFields.address = address
        if (logo_url !== undefined) updateFields.logo_url = logo_url
      }

      const { error } = await admin.from(table).update(updateFields).eq('id', user_id)
      if (error) return json({ error: error.message }, 500)
      return json({ success: true })
    }

    if (action === 'delete') {
      const { user_id, email } = body
      const table = role === 'driver' ? 'drivers' : 'bakeries'

      // Get owner_user_id for bakeries / try to delete auth user via email
      let authUserId: string | null = null
      if (role === 'bakery' && user_id) {
        const { data: row } = await admin.from('bakeries').select('owner_user_id,email').eq('id', user_id).maybeSingle()
        authUserId = row?.owner_user_id ?? null
        if (!authUserId && row?.email) {
          const { data: list } = await admin.auth.admin.listUsers()
          authUserId = list.users.find(u => u.email === row.email)?.id ?? null
        }
      } else if (role === 'driver' && (email || user_id)) {
        const { data: row } = await admin.from('drivers').select('email').eq('id', user_id).maybeSingle()
        const target = email || row?.email
        if (target) {
          const { data: list } = await admin.auth.admin.listUsers()
          authUserId = list.users.find(u => u.email === target)?.id ?? null
        }
      }

      if (user_id) {
        const { error: delErr } = await admin.from(table).delete().eq('id', user_id)
        if (delErr) return json({ error: delErr.message }, 500)
      }

      if (authUserId) {
        await admin.auth.admin.deleteUser(authUserId)
      }
      return json({ success: true })
    }

    return json({ error: 'Unknown action' }, 400)
  } catch (e) {
    console.error(e)
    return json({ error: (e as Error).message }, 500)
  }
})

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  })
}
