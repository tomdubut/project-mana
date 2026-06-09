'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { createProject, updateProject } from '@/lib/queries/projects'
import { PROJECT_COLORS } from '@/lib/utils'
import { cn } from '@/lib/utils'
import type { Project } from '@/types'

interface ProjectFormProps {
  project?: Project
  onSuccess: () => void
  onCancel: () => void
}

export function ProjectForm({ project, onSuccess, onCancel }: ProjectFormProps) {
  const [loading, setLoading] = useState(false)
  const [form, setForm] = useState({
    name: project?.name ?? '',
    description: project?.description ?? '',
    color: project?.color ?? PROJECT_COLORS[0],
  })

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!form.name.trim()) return
    setLoading(true)
    try {
      const payload = {
        name: form.name.trim(),
        description: form.description || null,
        color: form.color,
      }
      if (project) {
        await updateProject(project.id, payload)
      } else {
        await createProject(payload)
      }
      onSuccess()
    } finally {
      setLoading(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Name *</label>
        <Input
          value={form.name}
          onChange={(e) => setForm({ ...form, name: e.target.value })}
          placeholder="Project name"
          autoFocus
          required
        />
      </div>
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
        <textarea
          value={form.description}
          onChange={(e) => setForm({ ...form, description: e.target.value })}
          placeholder="What is this project about?"
          rows={2}
          className="block w-full rounded-lg border border-gray-200 px-3 py-2 text-sm text-gray-900 placeholder-gray-400 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
        />
      </div>
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">Color</label>
        <div className="flex gap-2 flex-wrap">
          {PROJECT_COLORS.map((color) => (
            <button
              key={color}
              type="button"
              onClick={() => setForm({ ...form, color })}
              className={cn(
                'w-7 h-7 rounded-full transition-transform',
                form.color === color && 'ring-2 ring-offset-2 ring-gray-400 scale-110'
              )}
              style={{ backgroundColor: color }}
            />
          ))}
        </div>
      </div>
      <div className="flex justify-end gap-2 pt-2">
        <Button type="button" variant="secondary" onClick={onCancel}>Cancel</Button>
        <Button type="submit" disabled={loading}>
          {loading ? 'Saving…' : project ? 'Update project' : 'Create project'}
        </Button>
      </div>
    </form>
  )
}
