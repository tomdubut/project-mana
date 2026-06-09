'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Select } from '@/components/ui/select'
import { createTask, updateTask } from '@/lib/queries/tasks'
import type { Task, Project, Goal, Priority, TaskStatus } from '@/types'

interface TaskFormProps {
  task?: Task
  projects: Project[]
  goals: Goal[]
  onSuccess: () => void
  onCancel: () => void
}

export function TaskForm({ task, projects, goals, onSuccess, onCancel }: TaskFormProps) {
  const [loading, setLoading] = useState(false)
  const [form, setForm] = useState({
    title: task?.title ?? '',
    description: task?.description ?? '',
    status: task?.status ?? 'todo' as TaskStatus,
    priority: task?.priority ?? 'medium' as Priority,
    project_id: task?.project_id ?? '',
    goal_id: task?.goal_id ?? '',
    due_date: task?.due_date ? task.due_date.slice(0, 10) : '',
  })

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!form.title.trim()) return
    setLoading(true)
    try {
      const payload = {
        title: form.title.trim(),
        description: form.description || null,
        status: form.status,
        priority: form.priority,
        project_id: form.project_id || null,
        goal_id: form.goal_id || null,
        due_date: form.due_date || null,
      }
      if (task) {
        await updateTask(task.id, payload)
      } else {
        await createTask(payload as Parameters<typeof createTask>[0])
      }
      onSuccess()
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
          placeholder="Task title"
          autoFocus
          required
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
        <textarea
          value={form.description}
          onChange={(e) => setForm({ ...form, description: e.target.value })}
          placeholder="Add details..."
          rows={3}
          className="block w-full rounded-lg border border-gray-200 px-3 py-2 text-sm text-gray-900 placeholder-gray-400 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
        />
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
          <Select
            value={form.status}
            onChange={(e) => setForm({ ...form, status: e.target.value as TaskStatus })}
          >
            <option value="todo">To Do</option>
            <option value="in_progress">In Progress</option>
            <option value="done">Done</option>
            <option value="cancelled">Cancelled</option>
          </Select>
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Priority</label>
          <Select
            value={form.priority}
            onChange={(e) => setForm({ ...form, priority: e.target.value as Priority })}
          >
            <option value="low">Low</option>
            <option value="medium">Medium</option>
            <option value="high">High</option>
            <option value="urgent">Urgent</option>
          </Select>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Project</label>
          <Select
            value={form.project_id}
            onChange={(e) => setForm({ ...form, project_id: e.target.value })}
          >
            <option value="">No project</option>
            {projects.map((p) => (
              <option key={p.id} value={p.id}>{p.name}</option>
            ))}
          </Select>
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Goal</label>
          <Select
            value={form.goal_id}
            onChange={(e) => setForm({ ...form, goal_id: e.target.value })}
          >
            <option value="">No goal</option>
            {goals.map((g) => (
              <option key={g.id} value={g.id}>{g.title}</option>
            ))}
          </Select>
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Due date</label>
        <Input
          type="date"
          value={form.due_date}
          onChange={(e) => setForm({ ...form, due_date: e.target.value })}
        />
      </div>

      <div className="flex justify-end gap-2 pt-2">
        <Button type="button" variant="secondary" onClick={onCancel}>Cancel</Button>
        <Button type="submit" disabled={loading}>
          {loading ? 'Saving…' : task ? 'Update task' : 'Create task'}
        </Button>
      </div>
    </form>
  )
}
