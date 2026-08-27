import Anthropic from '@anthropic-ai/sdk'
import type { Task, WorkStream } from '@/types'

function getClient() {
  return new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })
}

interface ScoredTask {
  id: string
  score: number
  reason: string
}

export async function scoreTasks(tasks: Task[], streams: WorkStream[]): Promise<ScoredTask[]> {
  if (tasks.length === 0) return []

  const today = new Date().toISOString().slice(0, 10)
  const streamMap = Object.fromEntries(streams.map((s) => [s.id, s]))

  const taskSummaries = tasks.map((t) => ({
    id: t.id,
    title: t.title,
    priority: t.priority,
    status: t.status,
    due_date: t.due_date,
    recurrence: t.recurrence ?? 'none',
    stream: t.stream_id ? streamMap[t.stream_id]?.name : null,
    stream_deadline: t.stream_id ? streamMap[t.stream_id]?.deadline : null,
  }))

  const message = await getClient().messages.create({
    model: 'claude-haiku-4-5',
    max_tokens: 4096,
    messages: [
      {
        role: 'user',
        content: `Today is ${today}. Score each task 1-10 (10 = most urgent to do today) and give a one-sentence reason. Consider: due date proximity, priority, stream deadline, status, and recurrence (recurring tasks should be scored based on their next due date — daily/weekly/monthly tasks that are overdue or due today are especially important). Respond ONLY with valid JSON array, no markdown: [{"id":"...","score":N,"reason":"..."}]

Tasks:
${JSON.stringify(taskSummaries, null, 2)}`,
      },
    ],
  })

  const text = message.content[0].type === 'text' ? message.content[0].text : ''
  const jsonMatch = text.replace(/```json\s*/g, '').replace(/```/g, '').match(/\[[\s\S]*\]/)
  if (!jsonMatch) throw new Error(`Claude returned unexpected response: ${text.slice(0, 200)}`)
  return JSON.parse(jsonMatch[0]) as ScoredTask[]
}

interface TaskSuggestion {
  priority: 'low' | 'normal' | 'high' | 'urgent'
  due_date: string | null
  reason: string
}

export async function suggestTaskFields(
  title: string,
  context: { streamName?: string | null; streamDeadline?: string | null; projectName?: string | null }
): Promise<TaskSuggestion> {
  const today = new Date().toISOString().slice(0, 10)
  const contextLines = [
    context.projectName && `Project: ${context.projectName}`,
    context.streamName && `Work stream: ${context.streamName}`,
    context.streamDeadline && `Stream deadline: ${context.streamDeadline}`,
  ].filter(Boolean).join('\n')

  const message = await getClient().messages.create({
    model: 'claude-haiku-4-5',
    max_tokens: 256,
    messages: [
      {
        role: 'user',
        content: `Today is ${today}. Suggest a priority and due date for this new task.

Task: "${title}"
${contextLines}

Priority options: low, normal, high, urgent
Due date: a YYYY-MM-DD date if it makes sense, or null if open-ended.
Note: tasks can repeat (daily/weekly/monthly) — if a task is clearly routine or recurring in nature, factor that into the due date suggestion (e.g. suggest the nearest natural occurrence).

Respond ONLY with valid JSON (no markdown): {"priority":"...","due_date":"YYYY-MM-DD or null","reason":"one short sentence explaining both choices"}`,
      },
    ],
  })

  const text = message.content[0].type === 'text' ? message.content[0].text : ''
  const jsonMatch = text.replace(/```json\s*/g, '').replace(/```/g, '').match(/\{[\s\S]*\}/)
  if (!jsonMatch) throw new Error('Unexpected AI response')
  const result = JSON.parse(jsonMatch[0])
  return {
    priority: ['low', 'normal', 'high', 'urgent'].includes(result.priority) ? result.priority : 'normal',
    due_date: result.due_date && result.due_date !== 'null' ? result.due_date : null,
    reason: result.reason ?? '',
  }
}

export async function getTodayFocus(tasks: Task[], streams: WorkStream[]): Promise<{ id: string; reason: string }[]> {
  if (tasks.length === 0) return []

  const today = new Date().toISOString().slice(0, 10)
  const streamMap = Object.fromEntries(streams.map((s) => [s.id, s]))

  const taskSummaries = tasks
    .sort((a, b) => (b.ai_score ?? 0) - (a.ai_score ?? 0))
    .slice(0, 20)
    .map((t) => ({
      id: t.id,
      title: t.title,
      priority: t.priority,
      status: t.status,
      due_date: t.due_date,
      recurrence: t.recurrence ?? 'none',
      ai_score: t.ai_score,
      stream: t.stream_id ? streamMap[t.stream_id]?.name : null,
    }))

  const message = await getClient().messages.create({
    model: 'claude-haiku-4-5',
    max_tokens: 1024,
    messages: [
      {
        role: 'user',
        content: `Today is ${today}. From these tasks, pick the 5 most important to focus on TODAY. For each give a short (max 15 words) reason why it matters now. Recurring tasks (daily/weekly/monthly) that are due or overdue should be prioritised — they will automatically respawn when completed. Respond ONLY with valid JSON array: [{"id":"...","reason":"..."}] ordered by priority.

Tasks:
${JSON.stringify(taskSummaries, null, 2)}`,
      },
    ],
  })

  const text = message.content[0].type === 'text' ? message.content[0].text : ''
  const jsonMatch = text.replace(/```json\s*/g, '').replace(/```/g, '').match(/\[[\s\S]*\]/)
  if (!jsonMatch) return []
  return JSON.parse(jsonMatch[0]) as { id: string; reason: string }[]
}
