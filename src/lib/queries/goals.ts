import { createClient } from '@/lib/supabase/client'
import type { Project } from '@/types'

export async function getProjects(workspaceId?: string, includeArchived = false) {
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
    } as Project
  })
}

export async function createProject(g: Pick<Project, 'title' | 'description' | 'target_date'> & { workspace_id?: string | null }) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Not authenticated')
  const { data, error } = await supabase
    .from('goals').insert({ ...g, user_id: user.id }).select().single()
  if (error) throw error
  return data as Project
}

export async function updateProject(id: string, updates: Partial<Project>) {
  const supabase = createClient()
  const { data, error } = await supabase
    .from('goals').update(updates).eq('id', id).select().single()
  if (error) throw error
  return data as Project
}

export async function deleteProject(id: string) {
  const supabase = createClient()
  const { error } = await supabase.from('goals').delete().eq('id', id)
  if (error) throw error
}

export async function archiveProject(id: string) {
  const supabase = createClient()
  // Archive all streams in the project
  const { data: streams } = await supabase
    .from('work_streams').select('id').eq('goal_id', id)
  const streamIds = (streams ?? []).map((s: any) => s.id)

  await Promise.all([
    supabase.from('goals').update({ archived: true }).eq('id', id),
    streamIds.length > 0
      ? supabase.from('work_streams').update({ archived: true }).in('id', streamIds)
      : Promise.resolve(),
    streamIds.length > 0
      ? supabase.from('tasks').update({ archived: true }).in('stream_id', streamIds)
      : Promise.resolve(),
    // Also archive tasks directly on the project (no stream)
    supabase.from('tasks').update({ archived: true }).eq('goal_id', id).is('stream_id', null),
  ])
}

export async function unarchiveProject(id: string) {
  const supabase = createClient()
  const { data: streams } = await supabase
    .from('work_streams').select('id').eq('goal_id', id)
  const streamIds = (streams ?? []).map((s: any) => s.id)

  await Promise.all([
    supabase.from('goals').update({ archived: false }).eq('id', id),
    streamIds.length > 0
      ? supabase.from('work_streams').update({ archived: false }).in('id', streamIds)
      : Promise.resolve(),
    streamIds.length > 0
      ? supabase.from('tasks').update({ archived: false }).in('stream_id', streamIds)
      : Promise.resolve(),
    supabase.from('tasks').update({ archived: false }).eq('goal_id', id).is('stream_id', null),
  ])
}
