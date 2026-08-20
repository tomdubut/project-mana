import { createClient } from '@/lib/supabase/client'
import type { KnowledgePage } from '@/types'

export async function getPages(streamId?: string, workspaceId?: string, goalId?: string) {
  const supabase = createClient()
  let q = supabase
    .from('knowledge_pages')
    .select('*, stream:work_streams(id,name,color), goal:goals(id,title)')
    .order('updated_at', { ascending: false })
  if (streamId) q = q.eq('stream_id', streamId)
  if (goalId) q = q.eq('goal_id', goalId)
  if (workspaceId) q = q.eq('workspace_id', workspaceId)
  const { data, error } = await q
  if (error) throw error
  return data as KnowledgePage[]
}

export async function getPage(id: string) {
  const supabase = createClient()
  const { data, error } = await supabase
    .from('knowledge_pages')
    .select('*, stream:work_streams(id,name,color), goal:goals(id,title)')
    .eq('id', id).single()
  if (error) throw error
  return data as KnowledgePage
}

export async function createPage(p: Pick<KnowledgePage, 'title' | 'content' | 'stream_id'> & { goal_id?: string | null; workspace_id?: string | null }) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Not authenticated')
  const { data, error } = await supabase
    .from('knowledge_pages').insert({ ...p, user_id: user.id }).select().single()
  if (error) throw error
  return data as KnowledgePage
}

export async function updatePage(id: string, updates: Partial<KnowledgePage>) {
  const supabase = createClient()
  const { data, error } = await supabase
    .from('knowledge_pages').update(updates).eq('id', id).select().single()
  if (error) throw error
  return data as KnowledgePage
}

export async function deletePage(id: string) {
  const supabase = createClient()
  const { error } = await supabase.from('knowledge_pages').delete().eq('id', id)
  if (error) throw error
}
