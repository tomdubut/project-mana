'use client'

import { useEffect, useState, useCallback } from 'react'
import {
  Plus, Circle, CheckCircle2, Clock, Sparkles,
  MoreHorizontal, Pencil, Trash2, Filter,
} from 'lucide-react'
import { getTasks, createTask, updateTask, deleteTask } from '@/lib/queries/tasks'
import { getStreams } from '@/lib/queries/streams'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { TaskPanel } from '@/components/tasks/task-panel'
import { cn, PRIORITY_CONFIG, STATUS_CONFIG, formatDate, isOverdue } from '@/lib/utils'
import { useWorkspace } from '@/lib/workspace-context'
import type { Task, WorkStream, TaskStatus, TaskPriority } from '@/types'

const ALL_STATUSES: TaskStatus[] = ['todo', 'in_progress', 'blocked', 'done']
const ALL_PRIORITIES: TaskPriority[] = ['high', 'normal', 'low']

export default function TasksPage() {
  const [tasks, setTasks] = useState<Task[]>([])
  const [streams, setStreams] = useState<WorkStream[]>([])
  const [panelTask, setPanelTask] = useState<Task | null>(null)
  const [quickTitle, setQuickTitle] = useState('')
  const [adding, setAdding] = useState(false)
  const [menuOpen, setMenuOpen] = useState<string | null>(null)
  const [filterStatus, setFilterStatus] = useState<TaskStatus | 'all'>('all')
  const [filterPriority, setFilterPriority] = useState<TaskPriority | 'all'>('all')
  const [loading, setLoading] = useState(true)

  const { activeWorkspace } = useWorkspace()

  const load = useCallback(async () => {
    const [t, s] = await Promise.all([
      getTasks({ workspaceId: activeWorkspace?.id }),
      getStreams(false, activeWorkspace?.id),
    ])
    setTasks(t)
    setStreams(s)
    setLoading(false)
  }, [activeWorkspace?.id])

  useEffect(() => { load() }, [load])

  const filtered = tasks.filter((t) => {
    if (filterStatus !== 'all' && t.status !== filterStatus) return false
    if (filterPriority !== 'all' && t.priority !== filterPriority) return false
    return true
  })

  async function handleQuickAdd(e: React.FormEvent) {
    e.preventDefault()
    if (!quickTitle.trim()) return
    setAdding(true)
    await createTask({
      title: quickTitle.trim(),
      description: null,
      status: 'todo',
      priority: 'normal',
      stream_id: null,
      goal_id: null,
      due_date: null,
      ai_score: null,
      ai_reason: null,
      workspace_id: activeWorkspace?.id ?? null,
    })
    setQuickTitle('')
    setAdding(false)
    load()
  }

  async function handleToggle(task: Task) {
    await updateTask(task.id, { status: task.status === 'done' ? 'todo' : 'done' })
    load()
  }

  async function handleDelete(taskId: string) {
    if (!confirm('Delete this task?')) return
    await deleteTask(taskId)
    load()
  }

  if (loading) return (
    <div className="max-w-3xl mx-auto px-4 sm:px-8 py-8">
      <div className="text-gray-400 text-sm">Loading…</div>
    </div>
  )

  return (
    <div className={cn('transition-all duration-300 ease-in-out', panelTask ? 'sm:mr-[420px]' : '')}>
      <div className="max-w-3xl mx-auto px-4 sm:px-8 py-8">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-xl font-bold text-gray-900">Tasks</h1>
        </div>

        {/* Quick add */}
        <form onSubmit={handleQuickAdd} className="flex gap-2 mb-6">
          <Input
            value={quickTitle}
            onChange={(e) => setQuickTitle(e.target.value)}
            placeholder="Add a task…"
            className="flex-1"
          />
          <Button type="submit" disabled={adding || !quickTitle.trim()} size="sm">
            <Plus size={15} /> Add
          </Button>
        </form>

        {/* Filters */}
        <div className="flex items-center gap-2 mb-4 flex-wrap">
          <Filter size={13} className="text-gray-400" />
          <div className="flex gap-1 flex-wrap">
            {(['all', ...ALL_STATUSES] as const).map((s) => (
              <button
                key={s}
                onClick={() => setFilterStatus(s)}
                className={cn(
                  'text-xs px-2.5 py-1 rounded-full font-medium transition-all border',
                  filterStatus === s
                    ? s === 'all' ? 'bg-gray-800 text-white border-gray-800' : cn(STATUS_CONFIG[s].color, 'border-current')
                    : 'bg-gray-100 text-gray-500 border-transparent hover:bg-gray-200'
                )}
              >
                {s === 'all' ? 'All' : STATUS_CONFIG[s].label}
              </button>
            ))}
          </div>
          <div className="w-px h-4 bg-gray-200" />
          <div className="flex gap-1 flex-wrap">
            {(['all', ...ALL_PRIORITIES] as const).map((p) => (
              <button
                key={p}
                onClick={() => setFilterPriority(p)}
                className={cn(
                  'text-xs px-2.5 py-1 rounded-full font-medium transition-all border',
                  filterPriority === p
                    ? p === 'all' ? 'bg-gray-800 text-white border-gray-800' : cn(PRIORITY_CONFIG[p].color, 'border-current')
                    : 'bg-gray-100 text-gray-500 border-transparent hover:bg-gray-200'
                )}
              >
                {p === 'all' ? 'All' : PRIORITY_CONFIG[p].label}
              </button>
            ))}
          </div>
        </div>

        {/* Task list */}
        {filtered.length === 0 ? (
          <div className="text-center py-16 text-gray-400 text-sm">No tasks match.</div>
        ) : (
          <div className="space-y-1.5">
            {filtered.map((task) => (
              <TaskRow
                key={task.id}
                task={task}
                streams={streams}
                menuOpen={menuOpen === task.id}
                onMenu={() => setMenuOpen(menuOpen === task.id ? null : task.id)}
                onCloseMenu={() => setMenuOpen(null)}
                onToggle={() => handleToggle(task)}
                onOpen={() => setPanelTask(task)}
                onEdit={() => { setPanelTask(task); setMenuOpen(null) }}
                onDelete={() => { handleDelete(task.id); setMenuOpen(null) }}
              />
            ))}
          </div>
        )}
      </div>

      <TaskPanel
        task={panelTask}
        streams={streams}
        onClose={() => setPanelTask(null)}
        onUpdate={async (id, updates) => { await updateTask(id, updates); setPanelTask((prev) => prev ? { ...prev, ...updates } : null); load() }}
        onDelete={async (id) => { await deleteTask(id); load(); setPanelTask(null) }}
      />
    </div>
  )
}

function TaskRow({ task, streams, menuOpen, onMenu, onCloseMenu, onToggle, onOpen, onEdit, onDelete }: {
  task: Task; streams: WorkStream[]; menuOpen: boolean; onMenu: () => void; onCloseMenu: () => void
  onToggle: () => void; onOpen: () => void; onEdit: () => void; onDelete: () => void
}) {
  const priority = PRIORITY_CONFIG[task.priority]
  const status = STATUS_CONFIG[task.status]
  const stream = streams.find((s) => s.id === task.stream_id)
  const overdue = isOverdue(task.due_date, task.status)

  return (
    <div className={cn(
      'group flex items-center gap-3 px-4 py-2.5 bg-white rounded-xl border border-gray-100 hover:border-gray-200 transition-all',
      task.status === 'done' && 'opacity-50'
    )}>
      <button onClick={onToggle} className="flex-shrink-0 text-gray-300 hover:text-green-500 transition-colors">
        {task.status === 'done' ? <CheckCircle2 size={17} className="text-green-500" /> : <Circle size={17} />}
      </button>
      <button onClick={onOpen} className={cn('flex-1 text-sm text-gray-800 truncate text-left hover:text-indigo-600 transition-colors', task.status === 'done' && 'line-through text-gray-400')}>
        {task.title}
      </button>
      <div className="flex items-center gap-2 flex-shrink-0">
        {task.ai_score !== null && (
          <span className="text-xs text-indigo-400 flex items-center gap-0.5">
            <Sparkles size={10} />{task.ai_score}
          </span>
        )}
        <span className={cn('text-xs px-1.5 py-0.5 rounded-full font-medium', status.color)}>{status.label}</span>
        <span className={cn('text-xs px-1.5 py-0.5 rounded font-medium', priority.color)}>{priority.label}</span>
        {stream && (
          <span className="text-xs text-gray-400 flex items-center gap-1">
            <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: stream.color }} />
            {stream.name}
          </span>
        )}
        {task.due_date && (
          <span className={cn('text-xs flex items-center gap-1', overdue ? 'text-red-500' : 'text-gray-400')}>
            <Clock size={10} />{formatDate(task.due_date)}
          </span>
        )}
        <div className="relative">
          <button
            onClick={onMenu}
            className="opacity-100 sm:opacity-0 sm:group-hover:opacity-100 text-gray-400 hover:text-gray-700 p-1 rounded transition-all"
          >
            <MoreHorizontal size={15} />
          </button>
          {menuOpen && (
            <>
              <div className="fixed inset-0 z-10" onClick={onCloseMenu} />
              <div className="absolute right-0 top-7 z-20 bg-white border border-gray-100 shadow-lg rounded-lg py-1 w-32">
                <button onClick={onEdit} className="flex items-center gap-2 w-full px-3 py-2 text-sm text-gray-700 hover:bg-gray-50">
                  <Pencil size={12} /> Edit
                </button>
                <button onClick={onDelete} className="flex items-center gap-2 w-full px-3 py-2 text-sm text-red-600 hover:bg-red-50">
                  <Trash2 size={12} /> Delete
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  )
}
