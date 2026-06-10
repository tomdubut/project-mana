import { createClient } from '@/lib/supabase/client'
import type { Goal } from '@/types'

export async function getGoals(projectId?: string) {
  const supabase = createClient()
  let query = supabase
    .from('goals')
    .select('*, project:projects(id,name,color)')
    .order('created_at', { ascending: false })

  if (projectId) query = query.eq('project_id', projectId)

  const { data, error } = await query
  if (error) throw error
  return data as Goal[]
}

export async function createGoal(goal: Omit<Goal, 'id' | 'user_id' | 'created_at' | 'updated_at'>) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Not authenticated')
  const { data, error } = await supabase
    .from('goals')
    .insert({ ...goal, user_id: user.id })
    .select()
    .single()
  if (error) throw error
  return data as Goal
}

export async function updateGoal(id: string, updates: Partial<Goal>) {
  const supabase = createClient()
  const { data, error } = await supabase
    .from('goals')
    .update({ ...updates, updated_at: new Date().toISOString() })
    .eq('id', id)
    .select()
    .single()
  if (error) throw error
  return data as Goal
}

export async function deleteGoal(id: string) {
  const supabase = createClient()
  const { error } = await supabase.from('goals').delete().eq('id', id)
  if (error) throw error
}
