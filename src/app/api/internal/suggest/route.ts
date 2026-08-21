import { createClient } from '@/lib/supabase/server'
import { suggestTaskFields } from '@/lib/ai'

export async function POST(request: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 })

  const { title, streamName, streamDeadline, projectName } = await request.json()
  if (!title?.trim()) return Response.json({ error: 'title is required' }, { status: 400 })

  try {
    const suggestion = await suggestTaskFields(title.trim(), { streamName, streamDeadline, projectName })
    return Response.json(suggestion)
  } catch (err: any) {
    return Response.json({ error: err.message ?? 'AI suggestion failed' }, { status: 500 })
  }
}
