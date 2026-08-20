import { authenticateApiRequest, apiError, apiOk, supabaseAdmin } from '@/lib/api-auth'

export async function GET(request: Request) {
  const userId = await authenticateApiRequest(request)
  if (!userId) return apiError('Unauthorized', 401)
  const url = new URL(request.url)
  const streamId = url.searchParams.get('stream_id')
  const goalId = url.searchParams.get('goal_id')
  let q = supabaseAdmin()
    .from('knowledge_pages')
    .select('*, stream:work_streams(id,name,color), goal:goals(id,title)')
    .eq('user_id', userId)
    .order('updated_at', { ascending: false })
  if (streamId) q = q.eq('stream_id', streamId)
  if (goalId) q = q.eq('goal_id', goalId)
  const { data, error } = await q
  if (error) return apiError(error.message, 500)
  return apiOk(data)
}

export async function POST(request: Request) {
  const userId = await authenticateApiRequest(request)
  if (!userId) return apiError('Unauthorized', 401)
  const body = await request.json()
  const { title, content, stream_id, goal_id } = body
  if (!title) return apiError('title is required')
  const { data, error } = await supabaseAdmin()
    .from('knowledge_pages')
    .insert({ title, content: content ?? '', stream_id: stream_id ?? null, goal_id: goal_id ?? null, user_id: userId })
    .select().single()
  if (error) return apiError(error.message, 500)
  return apiOk(data, 201)
}
