'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Select } from '@/components/ui/select'
import { createGoal, updateGoal } from '@/lib/queries/goals'
import type { Goal, GoalStatus, Project } from '@/types'

interface GoalFormProps {
  goal?: Goal
  projects: Project[]
  onSuccess: () => void
  onCancel: () => void
}

export function GoalForm({ goal, projects, onSuccess, onCancel }: GoalFormProps) {
  const [loading, setLoading] = useState(false)
  const [form, setForm] = useState({
    title: goal?.title ?? '',
    description: goal?.description ?? '',
    status: goal?.status ?? 'active' as GoalStatus,
    project_id: goal?.project_id ?? '',
    target_date: goal?.target_date ? goal.target_date.slice(0, 10) : '',
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
        project_id: form.project_id || null,
        target_date: form.target_date || null,
      }
      if (goal) {
        await updateGoal(goal.id, payload)
      } else {
        await createGoal(payload as Parameters<typeof createGoal>[0])
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
          placeholder="Goal title"
          autoFocus
          required
        />
      </div>
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
        <textarea
          value={form.description}
          onChange={(e) => setForm({ ...form, description: e.target.value })}
          placeholder="Describe this goal..."
          rows={3}
          className="block w-full rounded-lg border border-gray-200 px-3 py-2 text-sm text-gray-900 placeholder-gray-400 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
        />
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
          <Select
            value={form.status}
            onChange={(e) => setForm({ ...form, status: e.target.value as GoalStatus })}
          >
            <option value="active">Active</option>
            <option value="completed">Completed</option>
            <option value="paused">Paused</option>
            <option value="abandoned">Abandoned</option>
          </Select>
        </div>
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
      </div>
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Target date</label>
        <Input
          type="date"
          value={form.target_date}
          onChange={(e) => setForm({ ...form, target_date: e.target.value })}
        />
      </div>
      <div className="flex justify-end gap-2 pt-2">
        <Button type="button" variant="secondary" onClick={onCancel}>Cancel</Button>
        <Button type="submit" disabled={loading}>
          {loading ? 'Saving…' : goal ? 'Update goal' : 'Create goal'}
        </Button>
      </div>
    </form>
  )
}
