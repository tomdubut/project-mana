import { createClient } from '@/lib/supabase/server'
import { supabaseAdmin } from '@/lib/api-auth'
import { scoreTasks } from '@/lib/ai'
import type { Task, WorkStream } from '@/types'

export async function POST() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 })

  const [tasksRes, streamsRes] = await Promise.all([
    supabaseAdmin.from('tasks').select('*').eq('user_id', user.id).in('status', ['todo', 'in_progress', 'blocked']),
    supabaseAdmin.from('work_streams').select('*').eq('user_id', user.id),
  ])

  if (tasksRes.error) return Response.json({ error: tasksRes.error.message }, { status: 500 })

  const scores = await scoreTasks(tasksRes.data as Task[], (streamsRes.data ?? []) as WorkStream[])

  await Promise.all(
    scores.map((s) =>
      supabaseAdmin.from('tasks').update({ ai_score: s.score, ai_reason: s.reason }).eq('id', s.id)
    )
  )

  return Response.json({ scored: scores.length })
}
