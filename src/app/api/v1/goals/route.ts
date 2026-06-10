import { authenticateApiRequest, apiError, apiOk, supabaseAdmin } from '@/lib/api-auth'

export async function GET(request: Request) {
  const userId = await authenticateApiRequest(request)
  if (!userId) return apiError('Unauthorized', 401)

  const url = new URL(request.url)
  const streamId = url.searchParams.get('stream_id')

  let q = supabaseAdmin
    .from('goals')
    .select('*, tasks(id,status)')
    .eq('user_id', userId)
    .eq('archived', false)
    .order('created_at', { ascending: false })

  if (streamId) q = q.eq('stream_id', streamId)

  const { data, error } = await q
  if (error) return apiError(error.message, 500)

  const goals = (data ?? []).map((g: any) => {
    const tasks = g.tasks ?? []
    const done = tasks.filter((t: any) => t.status === 'done').length
    return { ...g, task_count: tasks.length, done_count: done, progress: tasks.length ? Math.round((done / tasks.length) * 100) : 0 }
  })

  return apiOk(goals)
}

export async function POST(request: Request) {
  const userId = await authenticateApiRequest(request)
  if (!userId) return apiError('Unauthorized', 401)

  const body = await request.json()
  const { title, description, stream_id, target_date } = body
  if (!title) return apiError('title is required')

  const { data, error } = await supabaseAdmin
    .from('goals')
    .insert({ title, description, stream_id, target_date, user_id: userId })
    .select().single()

  if (error) return apiError(error.message, 500)
  return apiOk(data, 201)
}
