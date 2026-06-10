import { authenticateApiRequest, apiError, apiOk, supabaseAdmin } from '@/lib/api-auth'

export async function GET(request: Request) {
  const userId = await authenticateApiRequest(request)
  if (!userId) return apiError('Unauthorized', 401)
  const { data, error } = await supabaseAdmin()
    .from('work_streams').select('*, goal:goals(id,title)').eq('user_id', userId).eq('archived', false).order('name')
  if (error) return apiError(error.message, 500)
  return apiOk(data)
}

export async function POST(request: Request) {
  const userId = await authenticateApiRequest(request)
  if (!userId) return apiError('Unauthorized', 401)
  const body = await request.json()
  const { name, description, color, is_ongoing, deadline, goal_id } = body
  if (!name) return apiError('name is required')
  const { data, error } = await supabaseAdmin()
    .from('work_streams')
    .insert({ name, description, color: color ?? '#6366f1', is_ongoing: is_ongoing ?? true, deadline, goal_id: goal_id ?? null, user_id: userId })
    .select().single()
  if (error) return apiError(error.message, 500)
  return apiOk(data, 201)
}
