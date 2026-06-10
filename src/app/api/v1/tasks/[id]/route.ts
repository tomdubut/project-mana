import { authenticateApiRequest, apiError, apiOk, supabaseAdmin } from '@/lib/api-auth'

async function getTask(userId: string, id: string) {
  const { data } = await supabaseAdmin()
    .from('tasks').select('*').eq('id', id).eq('user_id', userId).single()
  return data
}

export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const userId = await authenticateApiRequest(request)
  if (!userId) return apiError('Unauthorized', 401)
  const { id } = await params
  const task = await getTask(userId, id)
  if (!task) return apiError('Not found', 404)
  return apiOk(task)
}

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const userId = await authenticateApiRequest(request)
  if (!userId) return apiError('Unauthorized', 401)
  const { id } = await params

  const task = await getTask(userId, id)
  if (!task) return apiError('Not found', 404)

  const body = await request.json()
  const allowed = ['title', 'description', 'status', 'priority', 'due_date', 'stream_id', 'goal_id', 'ai_score', 'ai_reason']
  const updates: Record<string, unknown> = {}
  for (const key of allowed) {
    if (key in body) updates[key] = body[key]
  }
  if (updates.status === 'done') updates.completed_at = new Date().toISOString()
  else if (updates.status) updates.completed_at = null

  const { data, error } = await supabaseAdmin()
    .from('tasks').update(updates).eq('id', id).select().single()
  if (error) return apiError(error.message, 500)
  return apiOk(data)
}

export async function DELETE(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const userId = await authenticateApiRequest(request)
  if (!userId) return apiError('Unauthorized', 401)
  const { id } = await params

  const task = await getTask(userId, id)
  if (!task) return apiError('Not found', 404)

  const { error } = await supabaseAdmin().from('tasks').delete().eq('id', id)
  if (error) return apiError(error.message, 500)
  return apiOk({ deleted: true })
}
