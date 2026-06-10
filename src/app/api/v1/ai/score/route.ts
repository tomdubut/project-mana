import { authenticateApiRequest, apiError, apiOk, supabaseAdmin } from '@/lib/api-auth'
import { scoreTasks } from '@/lib/ai'
import type { Task, WorkStream } from '@/types'

export async function POST(request: Request) {
  const userId = await authenticateApiRequest(request)
  if (!userId) return apiError('Unauthorized', 401)

  const [tasksRes, streamsRes] = await Promise.all([
    supabaseAdmin.from('tasks').select('*').eq('user_id', userId).in('status', ['todo', 'in_progress', 'blocked']),
    supabaseAdmin.from('work_streams').select('*').eq('user_id', userId),
  ])

  if (tasksRes.error) return apiError(tasksRes.error.message, 500)

  const scores = await scoreTasks(tasksRes.data as Task[], (streamsRes.data ?? []) as WorkStream[])

  // Persist scores
  await Promise.all(
    scores.map((s) =>
      supabaseAdmin.from('tasks').update({ ai_score: s.score, ai_reason: s.reason }).eq('id', s.id)
    )
  )

  return apiOk({ scored: scores.length, scores })
}
