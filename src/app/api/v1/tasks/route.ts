import { authenticateApiRequest, apiError, apiOk, supabaseAdmin } from '@/lib/api-auth'

export async function GET(request: Request) {
  const userId = await authenticateApiRequest(request)
  if (!userId) return apiError('Unauthorized', 401)

  const url = new URL(request.url)
  const streamId = url.searchParams.get('stream_id')
  const status = url.searchParams.get('status')
  const priority = url.searchParams.get('priority')
  const openOnly = url.searchParams.get('open_only') === 'true'

  let q = supabaseAdmin
    .from('tasks')
    .select('*, stream:work_streams(id,name), goal:goals(id,title)')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })

  if (streamId) q = q.eq('stream_id', streamId)
  if (status)   q = q.eq('status', status)
  if (priority) q = q.eq('priority', priority)
  if (openOnly) q = q.in('status', ['todo', 'in_progress', 'blocked'])

  const { data, error } = await q
  if (error) return apiError(error.message, 500)
  return apiOk(data)
}

export async function POST(request: Request) {
  const userId = await authenticateApiRequest(request)
  if (!userId) return apiError('Unauthorized', 401)

  const body = await request.json()
  const { title, description, status, priority, due_date, stream_id, goal_id } = body

  if (!title) return apiError('title is required')

  const { data, error } = await supabaseAdmin
    .from('tasks')
    .insert({ title, description, status: status ?? 'todo', priority: priority ?? 'normal', due_date, stream_id, goal_id, user_id: userId })
    .select()
    .single()

  if (error) return apiError(error.message, 500)
  return apiOk(data, 201)
}
