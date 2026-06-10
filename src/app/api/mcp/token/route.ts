import { supabaseAdmin } from '@/lib/api-auth'
import { createHash } from 'crypto'

export async function POST(request: Request) {
  let body: Record<string, string>
  const ct = request.headers.get('content-type') ?? ''
  if (ct.includes('application/json')) {
    body = await request.json()
  } else {
    const form = await request.formData()
    body = Object.fromEntries([...form.entries()].map(([k, v]) => [k, v as string]))
  }

  const { code, grant_type } = body
  if (grant_type !== 'authorization_code') {
    return Response.json({ error: 'unsupported_grant_type' }, { status: 400 })
  }
  if (!code) {
    return Response.json({ error: 'invalid_request' }, { status: 400 })
  }

  // Validate the token (code) against stored hashes
  const hashed = createHash('sha256').update(code).digest('hex')
  const { data: tokenRow } = await supabaseAdmin()
    .from('api_tokens')
    .select('id, user_id')
    .eq('token_hash', hashed)
    .single()

  if (!tokenRow) {
    return Response.json({ error: 'invalid_grant', error_description: 'Invalid API token' }, { status: 400 })
  }

  // Update last_used
  await supabaseAdmin().from('api_tokens').update({ last_used: new Date().toISOString() }).eq('id', tokenRow.id)

  return Response.json({
    access_token: code,
    token_type: 'bearer',
    scope: 'mcp',
  }, { headers: { 'Access-Control-Allow-Origin': '*' } })
}

export async function OPTIONS() {
  return new Response(null, {
    status: 204,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Authorization, Content-Type',
    },
  })
}
