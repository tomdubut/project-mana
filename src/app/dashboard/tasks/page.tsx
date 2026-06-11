'use client'

import { useEffect, useState, useCallback } from 'react'
import { useSearchParams } from 'next/navigation'
import { Plus, Circle, CheckCircle2, Clock, Sparkles, MoreHorizontal, Pencil, Trash2 } from 'lucide-react'
import { getTasks, createTask, updateTask, deleteTask } from '@/lib/queries/tasks'
import { getStreams } from '@/lib/queries/streams'
import { getGoals } from '@/lib/queries/goals'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Select } from '@/components/ui/select'
import { TaskPanel } from '@/components/tasks/task-panel'
import { cn, PRIORITY_CONFIG, STATUS_CONFIG, formatDate, isOverdue } from '@/lib/utils'
import { useWorkspace } from '@/lib/workspace-context'
import type { Task, WorkStream, Goal, TaskStatus, TaskPriority } from '@/types'
import { Suspense } from 'react'

function TasksInner() {
  const searchParams = useSearchParams()
  const streamFilter = searchParams.get('stream')

  const [tasks, setTasks] = useState<Task[]>([])
  const [streams, setStreams] = useState<WorkStream[]>([])
  const [goals, setGoals] = useState<Goal[]>([])
  const [filterStatus, setFilterStatus] = useState<TaskStatus | ''>('')
  const [filterPriority, setFilterPriority] = useState<TaskPriority | ''>('')
  const [filterStream, setFilterStream] = useState(streamFilter ?? '')
  const [panelTask, setPanelTask] = useState<Task | null>(null)
  const [quickTitle, setQuickTitle] = useState('')
  const [adding, setAdding] = useState(false)
  const [menuOpen, setMenuOpen] = useState<string | null>(null)

  const { activeWorkspace } = useWorkspace()

  const load = useCallback(async () => {
    const [t, s, g] = await Promise.all([
      getTasks({ workspaceId: activeWorkspace?.id }),
      getStreams(false, activeWorkspace?.id),
      getGoals(activeWorkspace?.id),
    ])
    setTasks(t)
    setStreams(s)
    setGoals(g)
  }, [activeWorkspace?.id])

  useEffect(() => { load() }, [load])
  useEffect(() => { setFilterStream(streamFilter ?? '') }, [streamFilter])

  const filtered = tasks.filter((t) => {
    if (filterStatus && t.status !== filterStatus) return false
    if (filterPriority && t.priority !== filterPriority) return false
    if (filterStream && t.stream_id !== filterStream) return false
    return true
  })

  const currentStream = streams.find((s) => s.id === filterStream)

  async function handleQuickAdd(e: React.FormEvent) {
    e.preventDefault()
    if (!quickTitle.trim()) return
    setAdding(true)
    await createTask({
      title: quickTitle.trim(),
      description: null,
      status: 'todo',
      priority: 'normal',
      stream_id: filterStream || null,
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

  async function handleDelete(id: string) {
    if (!confirm('Delete this task?')) return
    await deleteTask(id)
    load()
  }

  const grouped = {
    todo: filtered.filter((t) => t.status === 'todo'),
    in_progress: filtered.filter((t) => t.status === 'in_progress'),
    blocked: filtered.filter((t) => t.status === 'blocked'),
    done: filtered.filter((t) => t.status === 'done'),
  }

  return (
    <div className={cn('transition-all duration-300 ease-in-out', panelTask ? 'sm:mr-[420px]' : '')}>
    <div className="max-w-3xl mx-auto px-4 sm:px-8 py-8">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-xl font-bold text-gray-900 flex items-center gap-2">
            {currentStream ? (
              <>
                <span className="w-3 h-3 rounded-full" style={{ backgroundColor: currentStream.color }} />
                {currentStream.name}
              </>
            ) : 'All Tasks'}
          </h1>
          <p className="text-sm text-gray-500 mt-0.5">{filtered.length} task{filtered.length !== 1 ? 's' : ''}</p>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-2 mb-5">
        <Select value={filterStream} onChange={(e) => setFilterStream(e.target.value)} className="w-40 text-xs">
          <option value="">All streams</option>
          {streams.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
        </Select>
        <Select value={filterStatus} onChange={(e) => setFilterStatus(e.target.value as TaskStatus | '')} className="w-36 text-xs">
          <option value="">All statuses</option>
          <option value="todo">To Do</option>
          <option value="in_progress">In Progress</option>
          <option value="blocked">Blocked</option>
          <option value="done">Done</option>
        </Select>
        <Select value={filterPriority} onChange={(e) => setFilterPriority(e.target.value as TaskPriority | '')} className="w-36 text-xs">
          <option value="">All priorities</option>
          <option value="high">High</option>
          <option value="normal">Normal</option>
          <option value="low">Low</option>
        </Select>
      </div>

      {/* Quick add */}
      <form onSubmit={handleQuickAdd} className="flex gap-2 mb-6">
        <Input
          value={quickTitle}
          onChange={(e) => setQuickTitle(e.target.value)}
          placeholder="Add a task… (press Enter)"
          className="flex-1"
        />
        <Button type="submit" disabled={adding || !quickTitle.trim()} size="sm">
          <Plus size={15} /> Add
        </Button>
      </form>

      {/* Task groups */}
      {filtered.length === 0 ? (
        <div className="text-center py-16 text-gray-400 text-sm">No tasks match your filters.</div>
      ) : (
        <div className="space-y-6">
          {(['in_progress', 'todo', 'blocked', 'done'] as TaskStatus[]).map((status) => {
            const items = grouped[status]
            if (items.length === 0) return null
            const conf = STATUS_CONFIG[status]
            return (
              <section key={status}>
                <div className="flex items-center gap-2 mb-2">
                  <span className={cn('text-xs font-semibold px-2 py-0.5 rounded-full', conf.color)}>{conf.label}</span>
                  <span className="text-xs text-gray-400">{items.length}</span>
                </div>
                <div className="space-y-1.5">
                  {items.map((task) => (
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
              </section>
            )
          })}
        </div>
      )}

    </div>
      <TaskPanel
        task={panelTask}
        streams={streams}
        goals={goals}
        onClose={() => setPanelTask(null)}
        onUpdate={async (id, updates) => { await updateTask(id, updates); load() }}
        onDelete={async (id) => { await deleteTask(id); load(); setPanelTask(null) }}
      />
    </div>
  )
}

function TaskRow({ task, streams, menuOpen, onMenu, onCloseMenu, onToggle, onOpen, onEdit, onDelete }: {
  task: Task; streams: WorkStream[];
  menuOpen: boolean; onMenu: () => void; onCloseMenu: () => void;
  onToggle: () => void; onOpen: () => void; onEdit: () => void; onDelete: () => void;
}) {
  const priority = PRIORITY_CONFIG[task.priority]
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
        <span className={cn('text-xs px-1.5 py-0.5 rounded font-medium', priority.color)}>{priority.label}</span>
        {stream && (
          <span className="text-xs text-gray-400 flex items-center gap-1 hidden sm:flex">
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

export default function TasksPage() {
  return (
    <Suspense>
      <TasksInner />
    </Suspense>
  )
}
