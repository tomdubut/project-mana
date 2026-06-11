'use client'

import { useState } from 'react'
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
        <Input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} autoFocus required />
      </div>
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
