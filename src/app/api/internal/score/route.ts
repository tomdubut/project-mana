import { createClient } from '@/lib/supabase/server'
import { scoreTasks } from '@/lib/ai'
import type { Task, WorkStream } from '@/types'

export async function POST() {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 })

    const [tasksRes, streamsRes] = await Promise.all([
      supabase.from('tasks').select('*').in('status', ['todo', 'in_progress', 'blocked']),
      supabase.from('work_streams').select('*'),
    ])

    if (tasksRes.error) return Response.json({ error: tasksRes.error.message }, { status: 500 })
    if (!tasksRes.data?.length) return Response.json({ scored: 0, debug: { user_id: user.id, task_count: tasksRes.data?.length ?? 0 } })

    const scores = await scoreTasks(tasksRes.data as Task[], (streamsRes.data ?? []) as WorkStream[])

    await Promise.all(
      scores.map((s) =>
        supabase.from('tasks').update({ ai_score: s.score, ai_reason: s.reason }).eq('id', s.id)
      )
    )

    return Response.json({ scored: scores.length })
  } catch (e: any) {
    console.error('AI score error:', e)
    return Response.json({ error: e?.message ?? String(e) }, { status: 500 })
  }
}
