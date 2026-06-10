import { createClient } from '@/lib/supabase/client'
import type { Goal } from '@/types'

export async function getGoals(streamId?: string) {
  const supabase = createClient()
  let q = supabase
    .from('goals')
    .select('*, stream:work_streams(id,name,color), tasks(id,status)')
    .eq('archived', false)
    .order('created_at', { ascending: false })
  if (streamId) q = q.eq('stream_id', streamId)
  const { data, error } = await q
  if (error) throw error

  return (data ?? []).map((g: any) => {
    const tasks = g.tasks ?? []
    const done = tasks.filter((t: any) => t.status === 'done').length
    const total = tasks.length
    return {
      ...g,
      task_count: total,
      done_count: done,
      progress: total === 0 ? 0 : Math.round((done / total) * 100),
    } as Goal
  })
}

export async function createGoal(g: Omit<Goal, 'id' | 'user_id' | 'created_at' | 'updated_at' | 'progress' | 'stream' | 'task_count' | 'done_count'>) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Not authenticated')
  const { data, error } = await supabase
    .from('goals').insert({ ...g, user_id: user.id }).select().single()
  if (error) throw error
  return data as Goal
}

export async function updateGoal(id: string, updates: Partial<Goal>) {
  const supabase = createClient()
  const { data, error } = await supabase
    .from('goals').update(updates).eq('id', id).select().single()
  if (error) throw error
  return data as Goal
}

export async function deleteGoal(id: string) {
  const supabase = createClient()
  const { error } = await supabase.from('goals').delete().eq('id', id)
  if (error) throw error
}
