import { authenticateApiRequest, apiError, apiOk, supabaseAdmin } from '@/lib/api-auth'

export async function GET(request: Request) {
  const userId = await authenticateApiRequest(request)
  if (!userId) return apiError('Unauthorized', 401)

  const { data, error } = await supabaseAdmin()
    .from('goals')
    .select('*, streams:work_streams(id,name,color,tasks(id,status)), tasks(id,status)')
    .eq('user_id', userId)
    .eq('archived', false)
    .order('created_at', { ascending: false })

  if (error) return apiError(error.message, 500)

  const goals = (data ?? []).map((g: any) => {
    // Tasks directly on the goal + tasks on any of its streams (deduplicated by id)
    const directTasks: any[] = g.tasks ?? []
    const streamTasks: any[] = (g.streams ?? []).flatMap((s: any) => s.tasks ?? [])
    const seen = new Set<string>()
    const tasks = [...directTasks, ...streamTasks].filter((t) => {
      if (seen.has(t.id)) return false
      seen.add(t.id)
      return true
    })
    const done = tasks.filter((t: any) => t.status === 'done').length
    return { ...g, task_count: tasks.length, done_count: done, progress: tasks.length ? Math.round((done / tasks.length) * 100) : 0 }
  })

  return apiOk(goals)
}

export async function POST(request: Request) {
  const userId = await authenticateApiRequest(request)
  if (!userId) return apiError('Unauthorized', 401)

  const body = await request.json()
  const { title, description, target_date } = body
  if (!title) return apiError('title is required')

  const { data, error } = await supabaseAdmin()
    .from('goals')
    .insert({ title, description, target_date, user_id: userId })
    .select().single()

  if (error) return apiError(error.message, 500)
  return apiOk(data, 201)
}
