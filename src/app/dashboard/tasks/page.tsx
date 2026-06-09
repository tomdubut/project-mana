'use client'

import { useEffect, useState, useCallback } from 'react'
import { Plus, Filter } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Select } from '@/components/ui/select'
import { Modal } from '@/components/ui/modal'
import { TaskCard } from '@/components/tasks/task-card'
import { TaskForm } from '@/components/tasks/task-form'
import { getTasks } from '@/lib/queries/tasks'
import { getProjects } from '@/lib/queries/projects'
import { getGoals } from '@/lib/queries/goals'
import type { Task, Project, Goal, Priority, TaskStatus } from '@/types'

export default function TasksPage() {
  const [tasks, setTasks] = useState<Task[]>([])
  const [projects, setProjects] = useState<Project[]>([])
  const [goals, setGoals] = useState<Goal[]>([])
  const [editTask, setEditTask] = useState<Task | null>(null)
  const [showCreate, setShowCreate] = useState(false)
  const [filterStatus, setFilterStatus] = useState<TaskStatus | ''>('')
  const [filterPriority, setFilterPriority] = useState<Priority | ''>('')
  const [filterProject, setFilterProject] = useState('')

  const loadData = useCallback(async () => {
    const [t, p, g] = await Promise.all([getTasks(), getProjects(), getGoals()])
    setTasks(t)
    setProjects(p)
    setGoals(g)
  }, [])

  useEffect(() => { loadData() }, [loadData])

  const filtered = tasks.filter((t) => {
    if (filterStatus && t.status !== filterStatus) return false
    if (filterPriority && t.priority !== filterPriority) return false
    if (filterProject && t.project_id !== filterProject) return false
    return true
  })

  return (
    <div className="max-w-3xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Tasks</h1>
          <p className="text-sm text-gray-500 mt-0.5">{filtered.length} task{filtered.length !== 1 ? 's' : ''}</p>
        </div>
        <Button onClick={() => setShowCreate(true)}>
          <Plus size={16} /> New task
        </Button>
      </div>

      <div className="flex items-center gap-3 mb-5 flex-wrap">
        <Filter size={15} className="text-gray-400" />
        <Select
          value={filterStatus}
          onChange={(e) => setFilterStatus(e.target.value as TaskStatus | '')}
          className="w-36"
        >
          <option value="">All statuses</option>
          <option value="todo">To Do</option>
          <option value="in_progress">In Progress</option>
          <option value="done">Done</option>
          <option value="cancelled">Cancelled</option>
        </Select>
        <Select
          value={filterPriority}
          onChange={(e) => setFilterPriority(e.target.value as Priority | '')}
          className="w-36"
        >
          <option value="">All priorities</option>
          <option value="urgent">Urgent</option>
          <option value="high">High</option>
          <option value="medium">Medium</option>
          <option value="low">Low</option>
        </Select>
        <Select
          value={filterProject}
          onChange={(e) => setFilterProject(e.target.value)}
          className="w-40"
        >
          <option value="">All projects</option>
          {projects.map((p) => (
            <option key={p.id} value={p.id}>{p.name}</option>
          ))}
        </Select>
      </div>

      <div className="space-y-2">
        {filtered.length === 0 ? (
          <div className="text-center py-16 text-gray-400">
            <p className="text-sm">No tasks found</p>
            <button onClick={() => setShowCreate(true)} className="mt-2 text-indigo-600 text-sm hover:underline">
              Create your first task
            </button>
          </div>
        ) : (
          filtered.map((task) => (
            <TaskCard
              key={task.id}
              task={task}
              onEdit={setEditTask}
              onRefresh={loadData}
            />
          ))
        )}
      </div>

      <Modal open={showCreate} onClose={() => setShowCreate(false)} title="New task">
        <TaskForm
          projects={projects}
          goals={goals}
          onSuccess={() => { setShowCreate(false); loadData() }}
          onCancel={() => setShowCreate(false)}
        />
      </Modal>

      <Modal open={!!editTask} onClose={() => setEditTask(null)} title="Edit task">
        {editTask && (
          <TaskForm
            task={editTask}
            projects={projects}
            goals={goals}
            onSuccess={() => { setEditTask(null); loadData() }}
            onCancel={() => setEditTask(null)}
          />
        )}
      </Modal>
    </div>
  )
}
