import { authenticateApiRequest, apiError, apiOk, supabaseAdmin } from '@/lib/api-auth'

async function getStream(userId: string, id: string) {
  const { data } = await supabaseAdmin.from('work_streams').select('*').eq('id', id).eq('user_id', userId).single()
  return data
}

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const userId = await authenticateApiRequest(request)
  if (!userId) return apiError('Unauthorized', 401)
  const { id } = await params
  if (!await getStream(userId, id)) return apiError('Not found', 404)
  const body = await request.json()
  const allowed = ['name', 'description', 'color', 'is_ongoing', 'deadline', 'archived']
  const updates: Record<string, unknown> = {}
  for (const key of allowed) { if (key in body) updates[key] = body[key] }
  const { data, error } = await supabaseAdmin.from('work_streams').update(updates).eq('id', id).select().single()
  if (error) return apiError(error.message, 500)
  return apiOk(data)
}

export async function DELETE(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const userId = await authenticateApiRequest(request)
  if (!userId) return apiError('Unauthorized', 401)
  const { id } = await params
  if (!await getStream(userId, id)) return apiError('Not found', 404)
  const { error } = await supabaseAdmin.from('work_streams').delete().eq('id', id)
  if (error) return apiError(error.message, 500)
  return apiOk({ deleted: true })
}
