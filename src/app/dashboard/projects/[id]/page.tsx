'use client'

import { useEffect, useState, useCallback } from 'react'
import { useParams, useRouter } from 'next/navigation'
import {
  Plus, Circle, CheckCircle2, Clock, Layers, AlertTriangle,
  ExternalLink, BookOpen, Target, Pencil, Trash2, Archive, LayoutGrid, BarChart2,
} from 'lucide-react'
import Link from 'next/link'
import { Breadcrumb } from '@/components/ui/breadcrumb'
import { getProjects, updateProject, deleteProject } from '@/lib/queries/goals'
import { getStreams } from '@/lib/queries/streams'
import { getTasks, updateTask, deleteTask, createTask } from '@/lib/queries/tasks'
import { getPages } from '@/lib/queries/knowledge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { TaskPanel } from '@/components/tasks/task-panel'
import { cn, PRIORITY_CONFIG, STATUS_CONFIG, formatDate, isOverdue } from '@/lib/utils'
import { useWorkspace } from '@/lib/workspace-context'
import type { Task, WorkStream, KnowledgePage, Project, TaskStatus } from '@/types'

type Tab = 'overview' | 'board' | 'streams'

const BOARD_COLUMNS: { status: TaskStatus; label: string }[] = [
  { status: 'todo',        label: 'To Do'       },
  { status: 'in_progress', label: 'In Progress' },
  { status: 'blocked',     label: 'Blocked'     },
  { status: 'done',        label: 'Done'        },
]

export default function ProjectDetailPage() {
  const { id } = useParams<{ id: string }>()
  const router = useRouter()
  const { activeWorkspace } = useWorkspace()

  const [project, setProject] = useState<Project | null>(null)
  const [streams, setStreams] = useState<WorkStream[]>([])
  const [tasks, setTasks] = useState<Task[]>([])
  const [pages, setPages] = useState<KnowledgePage[]>([])
  const [panelTask, setPanelTask] = useState<Task | null>(null)
  const [tab, setTab] = useState<Tab>('overview')
  const [quickTitle, setQuickTitle] = useState('')
  const [quickStreamId, setQuickStreamId] = useState<string>('')
  const [adding, setAdding] = useState(false)
  const [editing, setEditing] = useState(false)
  const [editTitle, setEditTitle] = useState('')
  const [loading, setLoading] = useState(true)

  const { activeWorkspace: ws } = useWorkspace()

  const load = useCallback(async () => {
    const [projects, s, t, p] = await Promise.all([
      getProjects(activeWorkspace?.id),
      getStreams(false, activeWorkspace?.id),
      getTasks({ workspaceId: activeWorkspace?.id }),
      getPages(undefined, activeWorkspace?.id),
    ])
    const found = projects.find((pr) => pr.id === id)
    if (!found) { router.push('/dashboard/strategy'); return }
    setProject(found)
    setEditTitle(found.title)
    const projectStreams = s.filter((st) => st.goal_id === id)
    setStreams(projectStreams)
    const streamIds = new Set(projectStreams.map((st) => st.id))
    setTasks(t.filter((tk) => tk.goal_id === id || (tk.stream_id && streamIds.has(tk.stream_id))))
    setPages(p.filter((pg) => pg.goal_id === id || (pg.stream_id && streamIds.has(pg.stream_id ?? ''))))
    if (!quickStreamId && projectStreams.length > 0) setQuickStreamId(projectStreams[0].id)
    setLoading(false)
  }, [id, activeWorkspace?.id, router, quickStreamId])

  useEffect(() => { load() }, [load])

  const doneTasks = tasks.filter((t) => t.status === 'done').length
  const openTasks = tasks.filter((t) => t.status !== 'done').length
  const blockedTasks = tasks.filter((t) => t.status === 'blocked').length
  const progress = tasks.length > 0 ? Math.round((doneTasks / tasks.length) * 100) : 0

  const streamMap = Object.fromEntries(streams.map((s) => [s.id, s]))

  async function handleQuickAdd(e: React.FormEvent) {
    e.preventDefault()
    if (!quickTitle.trim()) return
    setAdding(true)
    await createTask({
      title: quickTitle.trim(),
      description: null,
      status: 'todo',
      priority: 'normal',
      stream_id: quickStreamId || null,
      goal_id: id,
      due_date: null,
      ai_score: null,
      ai_reason: null,
      workspace_id: activeWorkspace?.id ?? null,
    })
    setQuickTitle('')
    setAdding(false)
    load()
  }

  async function handleSaveTitle(e: React.FormEvent) {
    e.preventDefault()
    if (!project || !editTitle.trim()) return
    await updateProject(project.id, { title: editTitle.trim() })
    setEditing(false)
    load()
  }

  async function handleArchive() {
    if (!project) return
    await updateProject(project.id, { archived: true })
    router.push('/dashboard/strategy')
  }

  async function handleDelete() {
    if (!project) return
    if (!confirm(`Delete project "${project.title}"? This won't delete its streams or tasks.`)) return
    await deleteProject(project.id)
    router.push('/dashboard/strategy')
  }

  if (loading) return (
    <div className="max-w-5xl mx-auto px-4 sm:px-8 py-8">
      <div className="text-gray-400 text-sm">Loading…</div>
    </div>
  )
  if (!project) return null

  return (
    <div className={cn('transition-all duration-300 ease-in-out', panelTask ? 'sm:mr-[420px]' : '')}>
      <div className="max-w-5xl mx-auto px-4 sm:px-8 py-8">

        <Breadcrumb items={[
          { label: 'Strategy', href: '/dashboard/strategy' },
          { label: project.title },
        ]} />

        {/* Header */}
        <div className="flex items-start justify-between gap-4 mb-5">
          <div className="flex items-start gap-3 min-w-0">
            <Target size={20} className="text-indigo-500 flex-shrink-0 mt-0.5" />
            <div className="min-w-0">
              {editing ? (
                <form onSubmit={handleSaveTitle} className="flex items-center gap-2">
                  <input
                    autoFocus
                    value={editTitle}
                    onChange={(e) => setEditTitle(e.target.value)}
                    className="text-xl font-bold text-gray-900 border-0 border-b-2 border-indigo-400 focus:outline-none bg-transparent"
                  />
                  <button type="submit" className="text-xs px-2.5 py-1 bg-indigo-600 text-white rounded-lg">Save</button>
                  <button type="button" onClick={() => { setEditing(false); setEditTitle(project.title) }} className="text-xs px-2.5 py-1 bg-gray-100 text-gray-600 rounded-lg">Cancel</button>
                </form>
              ) : (
                <h1 className="text-xl font-bold text-gray-900">{project.title}</h1>
              )}
              {project.description && <p className="text-sm text-gray-500 mt-0.5">{project.description}</p>}
              {project.target_date && (
                <p className="text-xs text-gray-400 mt-1 flex items-center gap-1">
                  <Clock size={11} /> Target: {formatDate(project.target_date)}
                </p>
              )}
            </div>
          </div>
          <div className="flex items-center gap-2 flex-shrink-0">
            <button onClick={() => setEditing(true)} className="text-gray-400 hover:text-gray-700 p-1.5 rounded-lg hover:bg-gray-100 transition-colors" title="Rename"><Pencil size={14} /></button>
            <button onClick={handleArchive} className="text-gray-400 hover:text-amber-600 p-1.5 rounded-lg hover:bg-amber-50 transition-colors" title="Archive"><Archive size={14} /></button>
            <button onClick={handleDelete} className="text-gray-400 hover:text-red-600 p-1.5 rounded-lg hover:bg-red-50 transition-colors" title="Delete"><Trash2 size={14} /></button>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-4 gap-3 mb-5">
          <StatCard label="Progress" value={`${progress}%`} sub={`${doneTasks}/${tasks.length} done`} accent={progress === 100 ? 'green' : 'indigo'}>
            <div className="mt-2 h-1.5 bg-gray-100 rounded-full overflow-hidden">
              <div className={cn('h-full rounded-full', progress === 100 ? 'bg-green-500' : 'bg-indigo-500')} style={{ width: `${progress}%` }} />
            </div>
          </StatCard>
          <StatCard label="Open tasks" value={String(openTasks)} sub={`${tasks.filter(t => t.status === 'in_progress').length} in progress`} accent="blue" />
          <StatCard label="Blocked" value={String(blockedTasks)} sub={blockedTasks > 0 ? 'needs attention' : 'all clear'} accent={blockedTasks > 0 ? 'orange' : 'gray'} />
          <StatCard label="Streams" value={String(streams.length)} sub="work streams" accent="gray" />
        </div>

        {/* Tabs */}
        <div className="flex gap-1 border-b border-gray-100 mb-6">
          {([
            { key: 'overview', label: 'Overview',  icon: BarChart2  },
            { key: 'board',    label: 'Board',     icon: LayoutGrid },
            { key: 'streams',  label: 'Streams',   icon: Layers     },
          ] as { key: Tab; label: string; icon: any }[]).map(({ key, label, icon: Icon }) => (
            <button
              key={key}
              onClick={() => setTab(key)}
              className={cn(
                'flex items-center gap-1.5 px-4 py-2.5 text-sm font-medium border-b-2 -mb-px transition-colors',
                tab === key
                  ? 'border-indigo-600 text-indigo-600'
                  : 'border-transparent text-gray-500 hover:text-gray-800'
              )}
            >
              <Icon size={14} /> {label}
            </button>
          ))}
        </div>

        {/* Quick add — shown on all tabs */}
        <form onSubmit={handleQuickAdd} className="flex gap-2 mb-6">
          <Input
            value={quickTitle}
            onChange={(e) => setQuickTitle(e.target.value)}
            placeholder="Add a task to this project…"
            className="flex-1"
          />
          {streams.length > 0 && (
            <select
              value={quickStreamId}
              onChange={(e) => setQuickStreamId(e.target.value)}
              className="text-sm border border-gray-200 rounded-lg px-2 py-1.5 text-gray-700 focus:outline-none focus:border-indigo-400"
            >
              <option value="">No stream</option>
              {streams.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
            </select>
          )}
          <Button type="submit" disabled={adding || !quickTitle.trim()} size="sm">
            <Plus size={15} /> Add
          </Button>
        </form>

        {/* ── OVERVIEW TAB ── */}
        {tab === 'overview' && (
          <div className="space-y-8">
            {blockedTasks > 0 && (
              <div className="flex items-center gap-2 px-4 py-3 bg-orange-50 border border-orange-100 rounded-xl text-sm text-orange-700">
                <AlertTriangle size={15} className="flex-shrink-0" />
                <span>{blockedTasks} task{blockedTasks !== 1 ? 's are' : ' is'} blocked — check the Board view for details</span>
              </div>
            )}

            {/* Stream health */}
            <div>
              <h2 className="text-sm font-semibold text-gray-700 mb-3 flex items-center gap-2">
                <Layers size={14} className="text-gray-400" /> Stream health
              </h2>
              {streams.length === 0 ? (
                <p className="text-sm text-gray-400 italic py-3">No streams yet. Create one from <Link href="/dashboard/strategy" className="text-indigo-500 hover:underline">Strategy</Link>.</p>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {streams.map((s) => {
                    const st = tasks.filter((t) => t.stream_id === s.id)
                    const done = st.filter((t) => t.status === 'done').length
                    const open = st.filter((t) => t.status !== 'done').length
                    const blocked = st.filter((t) => t.status === 'blocked').length
                    const prog = st.length > 0 ? Math.round((done / st.length) * 100) : 0
                    return (
                      <Link
                        key={s.id}
                        href={`/dashboard/streams/${s.id}`}
                        className="flex items-center gap-3 px-4 py-3 bg-white rounded-xl border border-gray-100 hover:border-gray-200 transition-all group"
                      >
                        <span className="w-3 h-3 rounded-full flex-shrink-0" style={{ backgroundColor: s.color }} />
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-gray-800 truncate group-hover:text-indigo-600 transition-colors">{s.name}</p>
                          <div className="flex items-center gap-2 mt-1">
                            <div className="flex-1 bg-gray-100 rounded-full h-1">
                              <div className={cn('h-1 rounded-full', prog === 100 ? 'bg-green-500' : 'bg-indigo-500')} style={{ width: `${prog}%` }} />
                            </div>
                            <span className="text-xs text-gray-400 flex-shrink-0">{prog}%</span>
                          </div>
                        </div>
                        <div className="flex items-center gap-2 text-xs flex-shrink-0">
                          <span className="text-gray-400">{open} open</span>
                          {blocked > 0 && <span className="text-orange-500 font-medium">{blocked} blocked</span>}
                        </div>
                        <ExternalLink size={11} className="text-gray-300 opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0" />
                      </Link>
                    )
                  })}
                </div>
              )}
            </div>

            {/* Knowledge pages */}
            {pages.length > 0 && (
              <div>
                <h2 className="text-sm font-semibold text-gray-700 mb-3 flex items-center gap-2">
                  <BookOpen size={14} className="text-gray-400" /> Knowledge Pages
                  <span className="text-xs font-normal text-gray-400">{pages.length}</span>
                </h2>
                <div className="space-y-1.5">
                  {pages.map((page) => (
                    <Link
                      key={page.id}
                      href={`/dashboard/knowledge?page=${page.id}`}
                      className="flex items-center gap-3 px-4 py-2.5 bg-white rounded-xl border border-gray-100 hover:border-gray-200 transition-all group"
                    >
                      <BookOpen size={14} className="text-gray-300 flex-shrink-0" />
                      <span className="text-sm text-gray-700 flex-1 truncate group-hover:text-indigo-600">{page.title}</span>
                      <span className="text-xs text-gray-400">{formatDate(page.updated_at)}</span>
                    </Link>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* ── BOARD TAB ── */}
        {tab === 'board' && (
          <div className="overflow-x-auto -mx-4 px-4">
            <div className="flex gap-4 min-w-[640px] pb-4">
              {BOARD_COLUMNS.map(({ status, label }) => {
                const col = tasks.filter((t) => t.status === status)
                const conf = STATUS_CONFIG[status]
                return (
                  <div key={status} className="flex-1 min-w-[180px]">
                    <div className="flex items-center gap-2 mb-3">
                      <span className={cn('text-xs font-semibold px-2 py-0.5 rounded-full', conf.color)}>{label}</span>
                      <span className="text-xs text-gray-400">{col.length}</span>
                    </div>
                    <div className="space-y-2">
                      {col.map((task) => {
                        const priority = PRIORITY_CONFIG[task.priority]
                        const stream = task.stream_id ? streamMap[task.stream_id] : null
                        const overdue = isOverdue(task.due_date, task.status)
                        return (
                          <div
                            key={task.id}
                            onClick={() => setPanelTask(task)}
                            className="bg-white border border-gray-100 rounded-xl p-3 cursor-pointer hover:border-gray-300 hover:shadow-sm transition-all group"
                          >
                            {stream && (
                              <div className="flex items-center gap-1.5 mb-2">
                                <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ backgroundColor: stream.color }} />
                                <span className="text-xs text-gray-400 truncate">{stream.name}</span>
                              </div>
                            )}
                            <p className={cn(
                              'text-sm text-gray-800 leading-snug mb-2',
                              task.status === 'done' && 'line-through text-gray-400'
                            )}>
                              {task.title}
                            </p>
                            <div className="flex items-center justify-between gap-2">
                              <span className={cn('text-xs px-1.5 py-0.5 rounded font-medium', priority.color)}>
                                {priority.label}
                              </span>
                              <div className="flex items-center gap-2">
                                {task.due_date && (
                                  <span className={cn('text-xs flex items-center gap-0.5', overdue ? 'text-red-500' : 'text-gray-400')}>
                                    <Clock size={10} />{formatDate(task.due_date)}
                                  </span>
                                )}
                                <button
                                  onClick={(e) => { e.stopPropagation(); updateTask(task.id, { status: task.status === 'done' ? 'todo' : 'done' }).then(load) }}
                                  className="text-gray-300 hover:text-green-500 transition-colors opacity-0 group-hover:opacity-100"
                                >
                                  {task.status === 'done' ? <CheckCircle2 size={14} className="text-green-500 opacity-100" /> : <Circle size={14} />}
                                </button>
                              </div>
                            </div>
                          </div>
                        )
                      })}
                      {col.length === 0 && (
                        <div className="border-2 border-dashed border-gray-100 rounded-xl py-6 text-center text-xs text-gray-300">
                          No tasks
                        </div>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        )}

        {/* ── STREAMS TAB ── */}
        {tab === 'streams' && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <p className="text-sm text-gray-500">{streams.length} work stream{streams.length !== 1 ? 's' : ''} in this project</p>
              <Link href="/dashboard/strategy" className="text-xs text-indigo-500 hover:text-indigo-700 flex items-center gap-1">
                <Plus size={11} /> New stream
              </Link>
            </div>
            {streams.length === 0 ? (
              <p className="text-sm text-gray-400 italic py-6 text-center">No streams yet.</p>
            ) : (
              <div className="space-y-3">
                {streams.map((s) => {
                  const st = tasks.filter((t) => t.stream_id === s.id)
                  const done = st.filter((t) => t.status === 'done').length
                  const inProgress = st.filter((t) => t.status === 'in_progress').length
                  const blocked = st.filter((t) => t.status === 'blocked').length
                  const todo = st.filter((t) => t.status === 'todo').length
                  const prog = st.length > 0 ? Math.round((done / st.length) * 100) : 0
                  return (
                    <Link
                      key={s.id}
                      href={`/dashboard/streams/${s.id}`}
                      className="block px-5 py-4 bg-white rounded-xl border border-gray-100 hover:border-gray-200 transition-all group"
                    >
                      <div className="flex items-center gap-3 mb-3">
                        <span className="w-3 h-3 rounded-full flex-shrink-0" style={{ backgroundColor: s.color }} />
                        <span className="text-sm font-semibold text-gray-800 flex-1 truncate group-hover:text-indigo-600 transition-colors">{s.name}</span>
                        {blocked > 0 && (
                          <span className="text-xs text-orange-500 font-medium flex items-center gap-1">
                            <AlertTriangle size={11} /> {blocked} blocked
                          </span>
                        )}
                        <ExternalLink size={12} className="text-gray-300 opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0" />
                      </div>
                      <div className="flex items-center gap-2 mb-3">
                        <div className="flex-1 bg-gray-100 rounded-full h-1.5">
                          <div className={cn('h-1.5 rounded-full transition-all', prog === 100 ? 'bg-green-500' : 'bg-indigo-500')} style={{ width: `${prog}%` }} />
                        </div>
                        <span className="text-xs text-gray-500 font-medium flex-shrink-0">{prog}%</span>
                      </div>
                      <div className="flex items-center gap-4 text-xs text-gray-400">
                        <span>{todo} to do</span>
                        <span>{inProgress} in progress</span>
                        <span className="text-green-600">{done} done</span>
                        {s.deadline && (
                          <span className="ml-auto flex items-center gap-1">
                            <Clock size={10} /> {formatDate(s.deadline)}
                          </span>
                        )}
                      </div>
                    </Link>
                  )
                })}
              </div>
            )}
          </div>
        )}

      </div>

      <TaskPanel
        task={panelTask}
        streams={streams}
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
  const colors = { indigo: 'text-indigo-600', green: 'text-green-600', blue: 'text-blue-600', orange: 'text-orange-500', gray: 'text-gray-400' }
  return (
    <div className="bg-white rounded-xl border border-gray-100 px-4 py-3">
      <p className="text-xs text-gray-400 mb-1">{label}</p>
      <p className={cn('text-2xl font-bold', colors[accent])}>{value}</p>
      <p className="text-xs text-gray-400 mt-0.5">{sub}</p>
      {children}
    </div>
  )
}
