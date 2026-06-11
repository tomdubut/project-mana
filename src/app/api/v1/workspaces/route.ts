import { authenticateApiRequest, apiError, apiOk, supabaseAdmin } from '@/lib/api-auth'

export async function GET(request: Request) {
  const userId = await authenticateApiRequest(request)
  if (!userId) return apiError('Unauthorized', 401)
  const { data, error } = await supabaseAdmin()
    .from('workspaces').select('*').eq('user_id', userId).order('created_at')
  if (error) return apiError(error.message, 500)
  return apiOk(data)
}
