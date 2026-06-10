import { createClient } from '@/lib/supabase/client'
import type { WorkStream } from '@/types'

export async function getStreams(includeArchived = false) {
  const supabase = createClient()
  let q = supabase.from('work_streams').select('*, goal:goals(id,title)').order('name')
  if (!includeArchived) q = q.eq('archived', false)
  const { data, error } = await q
  if (error) throw error
  return data as WorkStream[]
}

export async function createStream(s: Pick<WorkStream, 'name' | 'description' | 'color' | 'is_ongoing' | 'deadline' | 'goal_id'>) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Not authenticated')
  const { data, error } = await supabase
    .from('work_streams').insert({ ...s, user_id: user.id }).select().single()
  if (error) throw error
  return data as WorkStream
}

export async function updateStream(id: string, updates: Partial<WorkStream>) {
  const supabase = createClient()
  const { data, error } = await supabase
    .from('work_streams').update(updates).eq('id', id).select().single()
  if (error) throw error
  return data as WorkStream
}

export async function deleteStream(id: string) {
  const supabase = createClient()
  const { error } = await supabase.from('work_streams').delete().eq('id', id)
  if (error) throw error
}
