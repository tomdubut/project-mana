'use client'

import { useState, useRef } from 'react'
import { Sparkles, X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Select } from '@/components/ui/select'
import { createTask, updateTask } from '@/lib/queries/tasks'
import type { Task, WorkStream, TaskStatus, TaskPriority } from '@/types'

interface TaskFormProps {
  task?: Task
  streams: WorkStream[]
  onSuccess: () => void
  onCancel: () => void
}

interface AISuggestion {
  priority: TaskPriority
  due_date: string | null
  reason: string
}

export function TaskForm({ task, streams, onSuccess, onCancel }: TaskFormProps) {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [form, setForm] = useState({
    title: task?.title ?? '',
    description: task?.description ?? '',
    status: task?.status ?? 'todo' as TaskStatus,
    priority: task?.priority ?? 'normal' as TaskPriority,
    stream_id: task?.stream_id ?? '',
    due_date: task?.due_date ?? '',
  })
  const [suggestion, setSuggestion] = useState<AISuggestion | null>(null)
  const [suggesting, setSuggesting] = useState(false)
  const lastSuggestedTitle = useRef('')

  const isNew = !task

  async function fetchSuggestion(title: string) {
    if (!title.trim() || title === lastSuggestedTitle.current) return
    lastSuggestedTitle.current = title
    setSuggesting(true)
    try {
      const selectedStream = streams.find((s) => s.id === form.stream_id)
      const res = await fetch('/api/internal/suggest', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title,
          streamName: selectedStream?.name ?? null,
          streamDeadline: selectedStream?.deadline ?? null,
        }),
      })
      if (res.ok) {
        const data: AISuggestion = await res.json()
        setSuggestion(data)
      }
    } catch {}
    finally { setSuggesting(false) }
  }

  function applySuggestion() {
    if (!suggestion) return
    setForm((f) => ({
      ...f,
      priority: suggestion.priority,
      due_date: suggestion.due_date ?? f.due_date,
    }))
    setSuggestion(null)
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!form.title.trim()) return
    setError('')
    setLoading(true)
    try {
      const payload = {
        title: form.title.trim(),
        description: form.description || null,
        status: form.status,
        priority: form.priority,
        stream_id: form.stream_id || null,
        due_date: form.due_date || null,
        ai_score: task?.ai_score ?? null,
        ai_reason: task?.ai_reason ?? null,
      }
      if (task) await updateTask(task.id, payload)
      else await createTask(payload as Parameters<typeof createTask>[0])
      onSuccess()
    } catch (err: any) {
      setError(err.message ?? 'Something went wrong')
    } finally {
      setLoading(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Title *</label>
        <Input
          value={form.title}
          onChange={(e) => setForm({ ...form, title: e.target.value })}
          onBlur={isNew ? (e) => fetchSuggestion(e.target.value) : undefined}
          autoFocus
          required
        />
      </div>

      {/* AI suggestion banner */}
      {isNew && (suggestion || suggesting) && (
        <div className="flex items-start gap-3 px-3 py-2.5 bg-indigo-50 border border-indigo-100 rounded-xl text-sm">
          <Sparkles size={14} className="text-indigo-500 flex-shrink-0 mt-0.5" />
          {suggesting ? (
            <span className="text-indigo-500 text-xs">AI is suggesting…</span>
          ) : suggestion ? (
            <div className="flex-1 min-w-0">
              <p className="text-indigo-700 text-xs">{suggestion.reason}</p>
              <p className="text-indigo-500 text-xs mt-0.5">
                Suggested: <strong>{suggestion.priority}</strong> priority
                {suggestion.due_date && <>, due <strong>{suggestion.due_date}</strong></>}
              </p>
              <button
                type="button"
                onClick={applySuggestion}
                className="mt-1.5 text-xs px-2 py-0.5 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 transition-colors"
              >
                Apply suggestion
              </button>
            </div>
          ) : null}
          {suggestion && (
            <button type="button" onClick={() => setSuggestion(null)} className="text-indigo-300 hover:text-indigo-500 flex-shrink-0">
              <X size={13} />
            </button>
          )}
        </div>
      )}

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
        <textarea
          value={form.description}
          onChange={(e) => setForm({ ...form, description: e.target.value })}
          rows={3}
          className="block w-full rounded-lg border border-gray-200 px-3 py-2 text-sm text-gray-900 placeholder-gray-400 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
        />
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
          <Select value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value as TaskStatus })}>
            <option value="todo">To Do</option>
            <option value="in_progress">In Progress</option>
            <option value="blocked">Blocked</option>
            <option value="done">Done</option>
          </Select>
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Priority</label>
          <Select value={form.priority} onChange={(e) => setForm({ ...form, priority: e.target.value as TaskPriority })}>
            <option value="urgent">Urgent</option>
            <option value="high">High</option>
            <option value="normal">Normal</option>
            <option value="low">Low</option>
          </Select>
        </div>
      </div>
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Work Stream</label>
        <Select value={form.stream_id} onChange={(e) => setForm({ ...form, stream_id: e.target.value })}>
          <option value="">No stream</option>
          {streams.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
        </Select>
      </div>
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Due date</label>
        <Input type="date" value={form.due_date} onChange={(e) => setForm({ ...form, due_date: e.target.value })} />
      </div>
      {error && <p className="text-sm text-red-600">{error}</p>}
      <div className="flex justify-end gap-2 pt-1">
        <Button type="button" variant="secondary" onClick={onCancel}>Cancel</Button>
        <Button type="submit" disabled={loading}>{loading ? 'Saving…' : task ? 'Update' : 'Create task'}</Button>
      </div>
    </form>
  )
}
