'use client'

import { useEffect, useState, useCallback } from 'react'
import { useParams, useRouter } from 'next/navigation'
import {
  Plus, Circle, CheckCircle2, Clock, Layers, AlertTriangle,
  ExternalLink, BookOpen, Target, Pencil, Trash2, Archive, LayoutGrid, BarChart2,
  ChevronDown, ChevronRight,
} from 'lucide-react'
import {
  DndContext, DragEndEvent, DragOverlay, DragStartEvent,
  PointerSensor, useSensor, useSensors, useDroppable, useDraggable,
} from '@dnd-kit/core'
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

type Tab = 'overview' | 'board'

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
  const [collapsedStreams, setCollapsedStreams] = useState<Set<string>>(new Set())
  const [draggingTask, setDraggingTask] = useState<Task | null>(null)

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

  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 8 } }))

  function handleDragStart(event: DragStartEvent) {
    const task = tasks.find((t) => t.id === event.active.id)
    setDraggingTask(task ?? null)
  }

  async function handleDragEnd(event: DragEndEvent) {
    setDraggingTask(null)
    const { active, over } = event
    if (!over) return
    const newStatus = over.id as TaskStatus
    const task = tasks.find((t) => t.id === active.id)
    if (!task || task.status === newStatus) return
    setTasks((prev) => prev.map((t) => t.id === task.id ? { ...t, status: newStatus } : t))
    await updateTask(task.id, { status: newStatus })
  }

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
                  <input autoFocus value={editTitle} onChange={(e) => setEditTitle(e.target.value)}
                    className="text-xl font-bold text-gray-900 border-0 border-b-2 border-indigo-400 focus:outline-none bg-transparent" />
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
            <button onClick={async () => { if (!project) return; await updateProject(project.id, { archived: true }); router.push('/dashboard/strategy') }} className="text-gray-400 hover:text-amber-600 p-1.5 rounded-lg hover:bg-amber-50 transition-colors" title="Archive"><Archive size={14} /></button>
            <button onClick={async () => { if (!project || !confirm(`Delete project "${project.title}"?`)) return; await deleteProject(project.id); router.push('/dashboard/strategy') }} className="text-gray-400 hover:text-red-600 p-1.5 rounded-lg hover:bg-red-50 transition-colors" title="Delete"><Trash2 size={14} /></button>
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
            { key: 'overview', label: 'Overview', icon: BarChart2  },
            { key: 'board',    label: 'Board',    icon: LayoutGrid },
          ] as { key: Tab; label: string; icon: any }[]).map(({ key, label, icon: Icon }) => (
            <button key={key} onClick={() => setTab(key)}
              className={cn(
                'flex items-center gap-1.5 px-4 py-2.5 text-sm font-medium border-b-2 -mb-px transition-colors',
                tab === key ? 'border-indigo-600 text-indigo-600' : 'border-transparent text-gray-500 hover:text-gray-800'
              )}
            >
              <Icon size={14} /> {label}
            </button>
          ))}
        </div>

        {/* Quick add */}
        <form onSubmit={handleQuickAdd} className="flex gap-2 mb-6">
          <Input value={quickTitle} onChange={(e) => setQuickTitle(e.target.value)} placeholder="Add a task to this project…" className="flex-1" />
          {streams.length > 0 && (
            <select value={quickStreamId} onChange={(e) => setQuickStreamId(e.target.value)}
              className="text-sm border border-gray-200 rounded-lg px-2 py-1.5 text-gray-700 focus:outline-none focus:border-indigo-400">
              <option value="">No stream</option>
              {streams.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
            </select>
          )}
          <Button type="submit" disabled={adding || !quickTitle.trim()} size="sm"><Plus size={15} /> Add</Button>
        </form>

        {/* ── OVERVIEW TAB ── */}
        {tab === 'overview' && (
          <div className="space-y-6">
            {blockedTasks > 0 && (
              <div className="flex items-center gap-2 px-4 py-3 bg-orange-50 border border-orange-100 rounded-xl text-sm text-orange-700">
                <AlertTriangle size={15} className="flex-shrink-0" />
                <span>{blockedTasks} task{blockedTasks !== 1 ? 's are' : ' is'} blocked — check the Board view for details</span>
              </div>
            )}

            {streams.length === 0 && (
              <p className="text-sm text-gray-400 italic py-3">No streams yet. Create one from <Link href="/dashboard/strategy" className="text-indigo-500 hover:underline">Strategy</Link>.</p>
            )}

            {streams.map((s) => {
              const streamTasks = tasks.filter((t) => t.stream_id === s.id)
              const done = streamTasks.filter((t) => t.status === 'done').length
              const blocked = streamTasks.filter((t) => t.status === 'blocked').length
              const prog = streamTasks.length > 0 ? Math.round((done / streamTasks.length) * 100) : 0
              const isCollapsed = collapsedStreams.has(s.id)
              const openStreamTasks = streamTasks.filter((t) => t.status !== 'done')
              const doneStreamTasks = streamTasks.filter((t) => t.status === 'done')

              return (
                <div key={s.id} className="bg-white rounded-xl border border-gray-100">
                  {/* Stream header */}
                  <div className="flex items-center gap-3 px-4 py-3 border-b border-gray-50">
                    <button
                      onClick={() => setCollapsedStreams((prev) => {
                        const next = new Set(prev)
                        if (next.has(s.id)) next.delete(s.id)
                        else next.add(s.id)
                        return next
                      })}
                      className="text-gray-300 hover:text-gray-500 transition-colors flex-shrink-0"
                    >
                      {isCollapsed ? <ChevronRight size={14} /> : <ChevronDown size={14} />}
                    </button>
                    <span className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ backgroundColor: s.color }} />
                    <Link href={`/dashboard/streams/${s.id}`} className="text-sm font-semibold text-gray-800 hover:text-indigo-600 flex-1 transition-colors flex items-center gap-1.5 group">
                      {s.name}
                      <ExternalLink size={11} className="text-gray-300 opacity-0 group-hover:opacity-100 transition-opacity" />
                    </Link>
                    {blocked > 0 && (
                      <span className="text-xs text-orange-500 font-medium flex items-center gap-1 flex-shrink-0">
                        <AlertTriangle size={11} /> {blocked}
                      </span>
                    )}
                    <div className="flex items-center gap-2 flex-shrink-0">
                      <div className="w-20 bg-gray-100 rounded-full h-1">
                        <div className={cn('h-1 rounded-full', prog === 100 ? 'bg-green-500' : 'bg-indigo-500')} style={{ width: `${prog}%` }} />
                      </div>
                      <span className="text-xs text-gray-400 w-7 text-right">{prog}%</span>
                    </div>
                  </div>

                  {/* Task list */}
                  {!isCollapsed && (
                    <div>
                      {streamTasks.length === 0 ? (
                        <p className="px-10 py-3 text-xs text-gray-400 italic">No tasks in this stream.</p>
                      ) : (
                        <div className="divide-y divide-gray-50">
                          {openStreamTasks.map((task) => (
                            <OverviewTaskRow key={task.id} task={task} onToggle={async () => { await updateTask(task.id, { status: 'done' }); load() }} onOpen={() => setPanelTask(task)} />
                          ))}
                          {doneStreamTasks.length > 0 && (
                            <details className="group">
                              <summary className="px-10 py-2 text-xs text-gray-400 cursor-pointer hover:text-gray-600 transition-colors list-none flex items-center gap-1">
                                <ChevronRight size={11} className="group-open:rotate-90 transition-transform" />
                                {doneStreamTasks.length} completed
                              </summary>
                              {doneStreamTasks.map((task) => (
                                <OverviewTaskRow key={task.id} task={task} onToggle={async () => { await updateTask(task.id, { status: 'todo' }); load() }} onOpen={() => setPanelTask(task)} />
                              ))}
                            </details>
                          )}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )
            })}

            {/* Tasks not in a stream */}
            {tasks.filter((t) => !t.stream_id).length > 0 && (
              <div className="bg-white rounded-xl border border-gray-100">
                <div className="px-4 py-3 border-b border-gray-50">
                  <span className="text-sm font-semibold text-gray-600">Other tasks</span>
                </div>
                <div className="divide-y divide-gray-50">
                  {tasks.filter((t) => !t.stream_id).map((task) => (
                    <OverviewTaskRow key={task.id} task={task} onToggle={async () => { await updateTask(task.id, { status: task.status === 'done' ? 'todo' : 'done' }); load() }} onOpen={() => setPanelTask(task)} />
                  ))}
                </div>
              </div>
            )}

            {/* Knowledge pages */}
            {pages.length > 0 && (
              <div>
                <h2 className="text-sm font-semibold text-gray-700 mb-3 flex items-center gap-2">
                  <BookOpen size={14} className="text-gray-400" /> Knowledge Pages
                </h2>
                <div className="space-y-1.5">
                  {pages.map((page) => (
                    <Link key={page.id} href={`/dashboard/knowledge?page=${page.id}`}
                      className="flex items-center gap-3 px-4 py-2.5 bg-white rounded-xl border border-gray-100 hover:border-gray-200 transition-all group">
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
          <DndContext sensors={sensors} onDragStart={handleDragStart} onDragEnd={handleDragEnd}>
            <div className="overflow-x-auto -mx-4 px-4">
              <div className="flex gap-4 min-w-[640px] pb-4">
                {BOARD_COLUMNS.map(({ status, label }) => {
                  const col = tasks.filter((t) => t.status === status)
                  const conf = STATUS_CONFIG[status]
                  return (
                    <BoardColumn key={status} status={status} label={label} conf={conf} count={col.length}>
                      {col.map((task) => (
                        <BoardCard
                          key={task.id}
                          task={task}
                          stream={task.stream_id ? streamMap[task.stream_id] : null}
                          onOpen={() => setPanelTask(task)}
                          onToggle={async () => { await updateTask(task.id, { status: task.status === 'done' ? 'todo' : 'done' }); load() }}
                        />
                      ))}
                    </BoardColumn>
                  )
                })}
              </div>
            </div>
            <DragOverlay>
              {draggingTask && (
                <div className="bg-white border border-indigo-200 rounded-xl p-3 shadow-lg opacity-90 w-48">
                  <p className="text-sm text-gray-800 font-medium truncate">{draggingTask.title}</p>
                </div>
              )}
            </DragOverlay>
          </DndContext>
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

function BoardColumn({ status, label, conf, count, children }: {
  status: TaskStatus; label: string; conf: { color: string }; count: number; children: React.ReactNode
}) {
  const { setNodeRef, isOver } = useDroppable({ id: status })
  return (
    <div className="flex-1 min-w-[180px]">
      <div className="flex items-center gap-2 mb-3">
        <span className={cn('text-xs font-semibold px-2 py-0.5 rounded-full', conf.color)}>{label}</span>
        <span className="text-xs text-gray-400">{count}</span>
      </div>
      <div
        ref={setNodeRef}
        className={cn(
          'min-h-[120px] rounded-xl space-y-2 p-2 transition-colors',
          isOver ? 'bg-indigo-50 ring-2 ring-indigo-200' : 'bg-gray-50'
        )}
      >
        {children}
        {count === 0 && (
          <div className="py-6 text-center text-xs text-gray-300">Drop here</div>
        )}
      </div>
    </div>
  )
}

function BoardCard({ task, stream, onOpen, onToggle }: {
  task: Task; stream: WorkStream | null; onOpen: () => void; onToggle: () => void
}) {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({ id: task.id })
  const priority = PRIORITY_CONFIG[task.priority]
  const overdue = isOverdue(task.due_date, task.status)

  const style = transform
    ? { transform: `translate3d(${transform.x}px, ${transform.y}px, 0)` }
    : undefined

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...listeners}
      {...attributes}
      className={cn(
        'bg-white border border-gray-100 rounded-xl p-3 cursor-grab active:cursor-grabbing hover:border-gray-300 hover:shadow-sm transition-all group touch-none',
        isDragging && 'opacity-40'
      )}
    >
      {stream && (
        <div className="flex items-center gap-1.5 mb-2">
          <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ backgroundColor: stream.color }} />
          <span className="text-xs text-gray-400 truncate">{stream.name}</span>
        </div>
      )}
      <p
        onClick={(e) => { e.stopPropagation(); onOpen() }}
        className={cn('text-sm text-gray-800 leading-snug mb-2 cursor-pointer hover:text-indigo-600 transition-colors', task.status === 'done' && 'line-through text-gray-400')}
      >
        {task.title}
      </p>
      <div className="flex items-center justify-between gap-2">
        <span className={cn('text-xs px-1.5 py-0.5 rounded font-medium', priority.color)}>{priority.label}</span>
        <div className="flex items-center gap-2">
          {task.due_date && (
            <span className={cn('text-xs flex items-center gap-0.5', overdue ? 'text-red-500' : 'text-gray-400')}>
              <Clock size={10} />{formatDate(task.due_date)}
            </span>
          )}
          <button
            onClick={(e) => { e.stopPropagation(); onToggle() }}
            onPointerDown={(e) => e.stopPropagation()}
            className="text-gray-300 hover:text-green-500 transition-colors opacity-0 group-hover:opacity-100"
          >
            {task.status === 'done' ? <CheckCircle2 size={14} className="text-green-500 opacity-100" /> : <Circle size={14} />}
          </button>
        </div>
      </div>
    </div>
  )
}

function OverviewTaskRow({ task, onToggle, onOpen }: { task: Task; onToggle: () => void; onOpen: () => void }) {
  const priority = PRIORITY_CONFIG[task.priority]
  const overdue = isOverdue(task.due_date, task.status)
  const conf = STATUS_CONFIG[task.status]
  return (
    <div className={cn('flex items-center gap-3 px-4 py-2.5 hover:bg-gray-50 transition-colors group', task.status === 'done' && 'opacity-60')}>
      <button onClick={onToggle} className="flex-shrink-0 text-gray-300 hover:text-green-500 transition-colors">
        {task.status === 'done' ? <CheckCircle2 size={16} className="text-green-500" /> : <Circle size={16} />}
      </button>
      <button onClick={onOpen} className={cn('flex-1 text-sm text-gray-800 truncate text-left hover:text-indigo-600 transition-colors', task.status === 'done' && 'line-through text-gray-400')}>
        {task.title}
      </button>
      <div className="flex items-center gap-2 flex-shrink-0">
        <span className={cn('text-xs px-1.5 py-0.5 rounded-full font-medium hidden sm:inline', conf.color)}>{conf.label}</span>
        <span className={cn('text-xs px-1.5 py-0.5 rounded font-medium', priority.color)}>{priority.label}</span>
        {task.due_date && (
          <span className={cn('text-xs flex items-center gap-1', overdue ? 'text-red-500' : 'text-gray-400')}>
            <Clock size={10} />{formatDate(task.due_date)}
          </span>
        )}
      </div>
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
