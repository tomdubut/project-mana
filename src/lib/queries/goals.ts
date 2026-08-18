import { createClient } from '@/lib/supabase/client'
import type { Goal } from '@/types'

export async function getGoals(workspaceId?: string, includeArchived = false) {
  const supabase = createClient()
  let q = supabase
    .from('goals')
    .select('*, streams:work_streams(id,name,color,is_ongoing,deadline,tasks(id,status)), tasks(id,status)')
    .order('created_at', { ascending: false })
  if (!includeArchived) q = q.eq('archived', false)
  if (workspaceId) q = q.eq('workspace_id', workspaceId)
  const { data, error } = await q
  if (error) throw error

  return (data ?? []).map((g: any) => {
    const directTasks: any[] = g.tasks ?? []
    const streamTasks: any[] = (g.streams ?? []).flatMap((s: any) => s.tasks ?? [])
    const seen = new Set<string>()
    const tasks = [...directTasks, ...streamTasks].filter((t) => {
      if (seen.has(t.id)) return false
      seen.add(t.id)
      return true
    })
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

export async function createGoal(g: Pick<Goal, 'title' | 'description' | 'target_date'> & { workspace_id?: string | null }) {
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
