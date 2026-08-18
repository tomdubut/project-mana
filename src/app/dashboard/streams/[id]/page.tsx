'use client'

import { useEffect, useState, useCallback } from 'react'
import { useParams, useRouter } from 'next/navigation'
import {
  ArrowLeft, Plus, Circle, CheckCircle2, Clock, Sparkles,
  MoreHorizontal, Pencil, Trash2, BookOpen, Target, AlertTriangle,
  ExternalLink, Archive,
} from 'lucide-react'
import Link from 'next/link'
import { getStreams, updateStream, deleteStream } from '@/lib/queries/streams'
import { getTasks, createTask, updateTask, deleteTask } from '@/lib/queries/tasks'
import { getPages } from '@/lib/queries/knowledge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { TaskPanel } from '@/components/tasks/task-panel'
import { cn, PRIORITY_CONFIG, STATUS_CONFIG, formatDate, isOverdue } from '@/lib/utils'
import { useWorkspace } from '@/lib/workspace-context'
import type { Task, WorkStream, KnowledgePage, TaskStatus } from '@/types'

const STATUS_ORDER: TaskStatus[] = ['in_progress', 'todo', 'blocked', 'done']

export default function StreamDetailPage() {
  const { id } = useParams<{ id: string }>()
  const router = useRouter()
  const { activeWorkspace } = useWorkspace()

  const [stream, setStream] = useState<WorkStream | null>(null)
  const [tasks, setTasks] = useState<Task[]>([])
  const [pages, setPages] = useState<KnowledgePage[]>([])
  const [panelTask, setPanelTask] = useState<Task | null>(null)
  const [quickTitle, setQuickTitle] = useState('')
  const [adding, setAdding] = useState(false)
  const [menuOpen, setMenuOpen] = useState<string | null>(null)
  const [editing, setEditing] = useState(false)
  const [editName, setEditName] = useState('')
  const [loading, setLoading] = useState(true)

  const load = useCallback(async () => {
    const [streams, t, p] = await Promise.all([
      getStreams(true, activeWorkspace?.id),
      getTasks({ streamId: id }),
      getPages(id),
    ])
    const found = streams.find((s) => s.id === id)
    if (!found) { router.push('/dashboard/strategy'); return }
    setStream(found)
    setEditName(found.name)
    setTasks(t)
    setPages(p)
    setLoading(false)
  }, [id, activeWorkspace?.id, router])

  useEffect(() => { load() }, [load])

  const grouped = STATUS_ORDER.reduce((acc, s) => {
    acc[s] = tasks.filter((t) => t.status === s)
    return acc
  }, {} as Record<TaskStatus, Task[]>)

  const totalTasks = tasks.length
  const doneTasks = tasks.filter((t) => t.status === 'done').length
  const progress = totalTasks > 0 ? Math.round((doneTasks / totalTasks) * 100) : 0
  const blockedCount = tasks.filter((t) => t.status === 'blocked').length

  async function handleQuickAdd(e: React.FormEvent) {
    e.preventDefault()
    if (!quickTitle.trim()) return
    setAdding(true)
    await createTask({
      title: quickTitle.trim(),
      description: null,
      status: 'todo',
      priority: 'normal',
      stream_id: id,
      goal_id: stream?.goal_id ?? null,
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

  async function handleSaveName(e: React.FormEvent) {
    e.preventDefault()
    if (!stream || !editName.trim()) return
    await updateStream(stream.id, { name: editName.trim() })
    setEditing(false)
    load()
  }

  async function handleArchiveStream() {
    if (!stream) return
    await updateStream(stream.id, { archived: true })
    router.push('/dashboard/strategy')
  }

  async function handleDeleteStream() {
    if (!stream) return
    if (!confirm(`Delete stream "${stream.name}"? This won't delete its tasks.`)) return
    await deleteStream(stream.id)
    router.push('/dashboard/strategy')
  }

  if (loading) return (
    <div className="max-w-4xl mx-auto px-4 sm:px-8 py-8">
      <div className="text-gray-400 text-sm">Loading…</div>
    </div>
  )
  if (!stream) return null

  const goal = (stream as any).goal as { id: string; title: string } | null

  return (
    <div className={cn('transition-all duration-300 ease-in-out', panelTask ? 'sm:mr-[420px]' : '')}>
      <div className="max-w-4xl mx-auto px-4 sm:px-8 py-8">

        {/* Back */}
        <Link href="/dashboard/strategy" className="inline-flex items-center gap-1.5 text-sm text-gray-400 hover:text-gray-700 mb-6 transition-colors">
          <ArrowLeft size={14} /> Strategy
        </Link>

        {/* Header */}
        <div className="flex items-start justify-between gap-4 mb-6">
          <div className="flex items-start gap-3 min-w-0">
            <span className="w-4 h-4 rounded-full flex-shrink-0 mt-1" style={{ backgroundColor: stream.color }} />
            <div className="min-w-0">
              {editing ? (
                <form onSubmit={handleSaveName} className="flex items-center gap-2">
                  <input
                    autoFocus
                    value={editName}
                    onChange={(e) => setEditName(e.target.value)}
                    className="text-xl font-bold text-gray-900 border-0 border-b-2 border-indigo-400 focus:outline-none bg-transparent"
                  />
                  <button type="submit" className="text-xs px-2.5 py-1 bg-indigo-600 text-white rounded-lg">Save</button>
                  <button type="button" onClick={() => { setEditing(false); setEditName(stream.name) }} className="text-xs px-2.5 py-1 bg-gray-100 text-gray-600 rounded-lg">Cancel</button>
                </form>
              ) : (
                <h1 className="text-xl font-bold text-gray-900">{stream.name}</h1>
              )}
              {goal && (
                <Link href="/dashboard/strategy" className="flex items-center gap-1 text-sm text-indigo-500 hover:text-indigo-700 mt-0.5 transition-colors">
                  <Target size={12} /> {goal.title}
                </Link>
              )}
            </div>
          </div>
          <div className="flex items-center gap-2 flex-shrink-0">
            <button onClick={() => setEditing(true)} className="text-gray-400 hover:text-gray-700 p-1.5 rounded-lg hover:bg-gray-100 transition-colors" title="Rename">
              <Pencil size={14} />
            </button>
            <button onClick={handleArchiveStream} className="text-gray-400 hover:text-amber-600 p-1.5 rounded-lg hover:bg-amber-50 transition-colors" title="Archive stream">
              <Archive size={14} />
            </button>
            <button onClick={handleDeleteStream} className="text-gray-400 hover:text-red-600 p-1.5 rounded-lg hover:bg-red-50 transition-colors" title="Delete stream">
              <Trash2 size={14} />
            </button>
          </div>
        </div>

        {/* Stats row */}
        <div className="grid grid-cols-3 gap-3 mb-6">
          <StatCard label="Progress" value={`${progress}%`} sub={`${doneTasks} / ${totalTasks} done`} accent={progress === 100 ? 'green' : 'indigo'}>
            <div className="mt-2 h-1.5 bg-gray-100 rounded-full overflow-hidden">
              <div
                className={cn('h-full rounded-full transition-all', progress === 100 ? 'bg-green-500' : 'bg-indigo-500')}
                style={{ width: `${progress}%` }}
              />
            </div>
          </StatCard>
          <StatCard label="Open tasks" value={String(tasks.filter(t => t.status !== 'done').length)} sub={`${tasks.filter(t => t.status === 'in_progress').length} in progress`} accent="blue" />
          <StatCard label="Blocked" value={String(blockedCount)} sub={blockedCount > 0 ? 'needs attention' : 'all clear'} accent={blockedCount > 0 ? 'orange' : 'gray'} />
        </div>

        {/* Blocked banner */}
        {blockedCount > 0 && (
          <div className="flex items-center gap-2 px-4 py-3 bg-orange-50 border border-orange-100 rounded-xl text-sm text-orange-700 mb-6">
            <AlertTriangle size={15} className="flex-shrink-0" />
            <span>{blockedCount} task{blockedCount !== 1 ? 's are' : ' is'} blocked — scroll down to review</span>
          </div>
        )}

        {/* Quick add */}
        <form onSubmit={handleQuickAdd} className="flex gap-2 mb-8">
          <Input
            value={quickTitle}
            onChange={(e) => setQuickTitle(e.target.value)}
            placeholder="Add a task to this stream…"
            className="flex-1"
          />
          <Button type="submit" disabled={adding || !quickTitle.trim()} size="sm">
            <Plus size={15} /> Add
          </Button>
        </form>

        {/* Tasks by status */}
        {totalTasks === 0 ? (
          <div className="text-center py-16 text-gray-400 text-sm">
            No tasks yet. Add one above.
          </div>
        ) : (
          <div className="space-y-6 mb-10">
            {STATUS_ORDER.map((status) => {
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

        {/* Knowledge pages */}
        <div>
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-sm font-semibold text-gray-700 flex items-center gap-2">
              <BookOpen size={14} className="text-gray-400" /> Knowledge Pages
              <span className="text-xs font-normal text-gray-400">{pages.length}</span>
            </h2>
            <Link
              href={`/dashboard/knowledge?stream=${id}`}
              className="text-xs text-indigo-500 hover:text-indigo-700 flex items-center gap-1 transition-colors"
            >
              <Plus size={11} /> New page
            </Link>
          </div>
          {pages.length === 0 ? (
            <div className="text-sm text-gray-400 italic py-3">No pages linked to this stream yet.</div>
          ) : (
            <div className="space-y-1.5">
              {pages.map((page) => (
                <Link
                  key={page.id}
                  href={`/dashboard/knowledge?page=${page.id}`}
                  className="flex items-center gap-3 px-4 py-2.5 bg-white rounded-xl border border-gray-100 hover:border-gray-200 transition-all group"
                >
                  <BookOpen size={14} className="text-gray-300 flex-shrink-0" />
                  <span className="text-sm text-gray-700 flex-1 truncate group-hover:text-indigo-600 transition-colors">{page.title}</span>
                  <span className="text-xs text-gray-400 flex-shrink-0">{formatDate(page.updated_at)}</span>
                  <ExternalLink size={11} className="text-gray-300 flex-shrink-0 opacity-0 group-hover:opacity-100 transition-opacity" />
                </Link>
              ))}
            </div>
          )}
        </div>

      </div>

      <TaskPanel
        task={panelTask}
        streams={[stream]}
        onClose={() => setPanelTask(null)}
        onUpdate={async (taskId, updates) => { await updateTask(taskId, updates); setPanelTask((prev) => prev ? { ...prev, ...updates } : null); load() }}
        onDelete={async (taskId) => { await deleteTask(taskId); load(); setPanelTask(null) }}
      />
    </div>
  )
}

function StatCard({ label, value, sub, accent, children }: {
  label: string; value: string; sub: string; accent: 'indigo' | 'green' | 'blue' | 'orange' | 'gray'; children?: React.ReactNode
}) {
  const colors = {
    indigo: 'text-indigo-600', green: 'text-green-600',
    blue: 'text-blue-600', orange: 'text-orange-500', gray: 'text-gray-400',
  }
  return (
    <div className="bg-white rounded-xl border border-gray-100 px-4 py-3">
      <p className="text-xs text-gray-400 mb-1">{label}</p>
      <p className={cn('text-2xl font-bold', colors[accent])}>{value}</p>
      <p className="text-xs text-gray-400 mt-0.5">{sub}</p>
      {children}
    </div>
  )
}

function TaskRow({ task, menuOpen, onMenu, onCloseMenu, onToggle, onOpen, onEdit, onDelete }: {
  task: Task; menuOpen: boolean; onMenu: () => void; onCloseMenu: () => void;
  onToggle: () => void; onOpen: () => void; onEdit: () => void; onDelete: () => void;
}) {
  const priority = PRIORITY_CONFIG[task.priority]
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
