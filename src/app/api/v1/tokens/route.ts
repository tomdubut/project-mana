import { createClient } from '@/lib/supabase/server'
import { generateToken, hashToken, supabaseAdmin } from '@/lib/api-auth'

export async function GET() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 })

  const { data } = await supabaseAdmin
    .from('api_tokens')
    .select('id, name, last_used, created_at')
    .eq('user_id', user.id)
    .order('created_at', { ascending: false })

  return Response.json(data ?? [])
}

export async function POST(request: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await request.json()
  const name = body.name?.trim()
  if (!name) return Response.json({ error: 'name is required' }, { status: 400 })

  const token = generateToken()
  const hash = hashToken(token)

  const { data, error } = await supabaseAdmin
    .from('api_tokens')
    .insert({ name, token_hash: hash, user_id: user.id })
    .select('id, name, created_at')
    .single()

  if (error) return Response.json({ error: error.message }, { status: 500 })

  // Return token ONCE — never stored in plaintext
  return Response.json({ ...data, token }, { status: 201 })
}
