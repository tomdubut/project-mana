import { createClient } from '@/lib/supabase/client'
import type { Workspace } from '@/types'

export async function getWorkspaces() {
  const supabase = createClient()
  const { data, error } = await supabase.from('workspaces').select('*').order('created_at')
  if (error) throw error
  return data as Workspace[]
}

export async function createWorkspace(name: string, color: string) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Not authenticated')
  const { data, error } = await supabase.from('workspaces').insert({ name, color, user_id: user.id }).select().single()
  if (error) throw error
  return data as Workspace
}

export async function updateWorkspace(id: string, updates: Partial<Workspace>) {
  const supabase = createClient()
  const { data, error } = await supabase.from('workspaces').update(updates).eq('id', id).select().single()
  if (error) throw error
  return data as Workspace
}

export async function deleteWorkspace(id: string) {
  const supabase = createClient()
  const { error } = await supabase.from('workspaces').delete().eq('id', id)
  if (error) throw error
}
