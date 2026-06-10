import { createClient } from '@supabase/supabase-js'
import { createHash } from 'crypto'

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export function hashToken(token: string) {
  return createHash('sha256').update(token).digest('hex')
}

export function generateToken() {
  const bytes = new Uint8Array(32)
  crypto.getRandomValues(bytes)
  return Array.from(bytes).map((b) => b.toString(16).padStart(2, '0')).join('')
}

export async function authenticateApiRequest(request: Request): Promise<string | null> {
  const auth = request.headers.get('authorization')
  if (!auth?.startsWith('Bearer ')) return null

  const token = auth.slice(7).trim()
  const hash = hashToken(token)

  const { data } = await supabaseAdmin
    .from('api_tokens')
    .select('user_id')
    .eq('token_hash', hash)
    .single()

  if (!data) return null

  // Update last_used without blocking response
  supabaseAdmin
    .from('api_tokens')
    .update({ last_used: new Date().toISOString() })
    .eq('token_hash', hash)
    .then(() => {})

  return data.user_id as string
}

export function apiError(message: string, status = 400) {
  return Response.json({ error: message }, { status })
}

export function apiOk(data: unknown, status = 200) {
  return Response.json(data, { status })
}

export { supabaseAdmin }
