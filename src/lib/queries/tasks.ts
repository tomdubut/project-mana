import { createClient } from '@/lib/supabase/client'
import type { Task, TaskStatus, TaskPriority, TaskRecurrence } from '@/types'

const SELECT = '*, stream:work_streams(id,name,color), goal:goals(id,title)'

export async function getTasks(filters?: {
  streamId?: string | null
  goalId?: string
  status?: TaskStatus
  priority?: TaskPriority
  openOnly?: boolean
  workspaceId?: string
}) {
  const supabase = createClient()
  let q = supabase.from('tasks').select(SELECT).order('created_at', { ascending: false })
  if (filters?.streamId !== undefined) q = q.eq('stream_id', filters.streamId)
  if (filters?.goalId)     q = q.eq('goal_id', filters.goalId)
  if (filters?.status)     q = q.eq('status', filters.status)
  if (filters?.priority)   q = q.eq('priority', filters.priority)
  if (filters?.openOnly)   q = q.in('status', ['todo', 'in_progress', 'blocked'])
  if (filters?.workspaceId) q = q.eq('workspace_id', filters.workspaceId)
  const { data, error } = await q
  if (error) throw error
  return data as Task[]
}

export async function createTask(t: Omit<Task, 'id' | 'user_id' | 'created_at' | 'updated_at' | 'completed_at' | 'stream' | 'goal'> & { workspace_id?: string | null }) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Not authenticated')
  let taskData = { ...t, user_id: user.id }
  if (t.stream_id && !t.goal_id) {
    const { data: stream } = await supabase.from('work_streams').select('goal_id').eq('id', t.stream_id).single()
    if (stream?.goal_id) taskData = { ...taskData, goal_id: stream.goal_id }
  }
  const { data, error } = await supabase
    .from('tasks').insert(taskData).select(SELECT).single()
  if (error) throw error
  return data as Task
}

function nextDueDate(due: string | null, recurrence: TaskRecurrence): string | null {
  if (!due || recurrence === 'none') return null
  const d = new Date(due)
  if (recurrence === 'daily')   d.setDate(d.getDate() + 1)
  if (recurrence === 'weekly')  d.setDate(d.getDate() + 7)
  if (recurrence === 'monthly') d.setMonth(d.getMonth() + 1)
  return d.toISOString().slice(0, 10)
}

export async function updateTask(id: string, updates: Partial<Task>) {
  const supabase = createClient()
  if (updates.status === 'done' && !updates.completed_at) updates.completed_at = new Date().toISOString()
  if (updates.status && updates.status !== 'done') updates.completed_at = null

  const { data, error } = await supabase
    .from('tasks').update(updates).eq('id', id).select(SELECT).single()
  if (error) throw error
  const task = data as Task

  // Spawn next occurrence when a recurring task is completed
  if (updates.status === 'done' && task.recurrence && task.recurrence !== 'none') {
    const next = nextDueDate(task.due_date, task.recurrence)
    await supabase.from('tasks').insert({
      user_id: task.user_id,
      title: task.title,
      description: task.description,
      status: 'todo',
      priority: task.priority,
      stream_id: task.stream_id,
      goal_id: task.goal_id,
      due_date: next,
      recurrence: task.recurrence,
      ai_score: null,
      ai_reason: null,
      workspace_id: (task as any).workspace_id ?? null,
    })
  }

  return task
}

export async function deleteTask(id: string) {
  const supabase = createClient()
  const { error } = await supabase.from('tasks').delete().eq('id', id)
  if (error) throw error
}
