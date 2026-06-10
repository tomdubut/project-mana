import { createClient } from '@/lib/supabase/client'
import type { Task, Priority, TaskStatus } from '@/types'

export async function getTasks(filters?: {
  projectId?: string
  goalId?: string
  status?: TaskStatus
  priority?: Priority
}) {
  const supabase = createClient()
  let query = supabase
    .from('tasks')
    .select('*, project:projects(id,name,color), goal:goals(id,title)')
    .order('created_at', { ascending: false })

  if (filters?.projectId) query = query.eq('project_id', filters.projectId)
  if (filters?.goalId) query = query.eq('goal_id', filters.goalId)
  if (filters?.status) query = query.eq('status', filters.status)
  if (filters?.priority) query = query.eq('priority', filters.priority)

  const { data, error } = await query
  if (error) throw error
  return data as Task[]
}

export async function createTask(task: Omit<Task, 'id' | 'user_id' | 'created_at' | 'updated_at' | 'completed_at'>) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Not authenticated')
  const { data, error } = await supabase
    .from('tasks')
    .insert({ ...task, user_id: user.id })
    .select()
    .single()
  if (error) throw error
  return data as Task
}

export async function updateTask(id: string, updates: Partial<Task>) {
  const supabase = createClient()
  if (updates.status === 'done' && !updates.completed_at) {
    updates.completed_at = new Date().toISOString()
  }
  if (updates.status && updates.status !== 'done') {
    updates.completed_at = null
  }
  const { data, error } = await supabase
    .from('tasks')
    .update({ ...updates, updated_at: new Date().toISOString() })
    .eq('id', id)
    .select()
    .single()
  if (error) throw error
  return data as Task
}

export async function deleteTask(id: string) {
  const supabase = createClient()
  const { error } = await supabase.from('tasks').delete().eq('id', id)
  if (error) throw error
}
