'use client'

import { useEffect, useState, useCallback, useMemo } from 'react'
import {
  Plus, Circle, CheckCircle2, Clock, Sparkles, AlertTriangle,
  MoreHorizontal, Pencil, Trash2, ChevronDown, ChevronRight, X,
  CheckSquare, Square, Target, Layers, RefreshCw,
} from 'lucide-react'
import { getTasks, createTask, updateTask, deleteTask } from '@/lib/queries/tasks'
import { getStreams } from '@/lib/queries/streams'
import { getProjects } from '@/lib/queries/goals'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { TaskPanel } from '@/components/tasks/task-panel'
import { cn, PRIORITY_CONFIG, STATUS_CONFIG, formatDate, isOverdue } from '@/lib/utils'
import { useWorkspace } from '@/lib/workspace-context'
import type { Task, WorkStream, Project, TaskStatus, TaskPriority } from '@/types'
import { Breadcrumb } from '@/components/ui/breadcrumb'

const STATUS_ICON: Record<TaskStatus, React.ReactNode> = {
  todo:        <Circle size={15} className="text-gray-300" />,
  in_progress: <RefreshCw size={14} className="text-blue-400" />,
  blocked:     <AlertTriangle size={14} className="text-orange-400" />,
  done:        <CheckCircle2 size={15} className="text-green-500" />,
}

interface Group {
  id: string | null
  label: string
  color?: string
  isProject: boolean
  tasks: Task[]
  totalOpen: number
  totalDone: number
}

export default function TasksPage() {
  const [tasks, setTasks] = useState<Task[]>([])
  const [streams, setStreams] = useState<WorkStream[]>([])
  const [projects, setProjects] = useState<Project[]>([])
  const [panelTask, setPanelTask] = useState<Task | null>(null)
  const [quickTitle, setQuickTitle] = useState('')
  const [adding, setAdding] = useState(false)
  const [menuOpen, setMenuOpen] = useState<string | null>(null)
  const [collapsed, setCollapsed] = useState<Set<string>>(new Set())
  const [showDone, setShowDone] = useState<Set<string>>(new Set())
  const [selected, setSelected] = useState<Set<string>>(new Set())
  const [bulkMenu, setBulkMenu] = useState<'status' | 'priority' | null>(null)
  const [bulkWorking, setBulkWorking] = useState(false)
  const [search, setSearch] = useState('')
  const [loading, setLoading] = useState(true)

  const { activeWorkspace } = useWorkspace()

  const load = useCallback(async () => {
    const [t, s, p] = await Promise.all([
      getTasks({ workspaceId: activeWorkspace?.id }),
      getStreams(false, activeWorkspace?.id),
      getProjects(activeWorkspace?.id),
    ])
    setTasks(t)
    setStreams(s)
    setProjects(p)
    setLoading(false)
  }, [activeWorkspace?.id])

  useEffect(() => { load() }, [load])

  // Build groups: one per project, plus "Unassigned" at end
  const groups = useMemo<Group[]>(() => {
    const q = search.trim().toLowerCase()
    const allTasks = q
      ? tasks.filter((t) => t.title.toLowerCase().includes(q))
      : tasks

    const streamMap = Object.fromEntries(streams.map((s) => [s.id, s]))

    // Map task → project id
    const taskProject = (t: Task): string | null => {
      if (t.goal_id) return t.goal_id
      if (t.stream_id && streamMap[t.stream_id]?.goal_id) return streamMap[t.stream_id].goal_id
      return null
    }

    const result: Group[] = projects.map((p) => {
      const ptasks = allTasks.filter((t) => taskProject(t) === p.id)
      return {
        id: p.id,
        label: p.title,
        isProject: true,
        tasks: ptasks,
        totalOpen: ptasks.filter((t) => t.status !== 'done').length,
        totalDone: ptasks.filter((t) => t.status === 'done').length,
      }
    }).filter((g) => g.tasks.length > 0)

    const assignedIds = new Set(projects.map((p) => p.id))
    const unassigned = allTasks.filter((t) => {
      const pid = taskProject(t)
      return !pid || !assignedIds.has(pid)
    })

    if (unassigned.length > 0) {
      result.push({
        id: null,
        label: 'Unassigned',
        isProject: false,
        tasks: unassigned,
        totalOpen: unassigned.filter((t) => t.status !== 'done').length,
        totalDone: unassigned.filter((t) => t.status === 'done').length,
      })
    }

    return result
  }, [tasks, streams, projects, search])

  const overdueTasks = useMemo(() =>
    tasks.filter((t) => isOverdue(t.due_date, t.status) && t.status !== 'done'),
    [tasks]
  )

  const allVisibleIds = useMemo(() => {
    const ids: string[] = []
    for (const g of groups) {
      const key = g.id ?? 'unassigned'
      if (collapsed.has(key)) continue
      const open = g.tasks.filter((t) => t.status !== 'done')
      ids.push(...open.map((t) => t.id))
      if (showDone.has(key)) {
        ids.push(...g.tasks.filter((t) => t.status === 'done').map((t) => t.id))
      }
    }
    return ids
  }, [groups, collapsed, showDone])

  const allSelected = allVisibleIds.length > 0 && allVisibleIds.every((id) => selected.has(id))
  const hasSelection = selected.size > 0

  function toggleSelect(id: string) {
    setSelected((prev) => { const n = new Set(prev); n.has(id) ? n.delete(id) : n.add(id); return n })
  }
  function toggleAll() {
    setSelected(allSelected ? new Set() : new Set(allVisibleIds))
  }
  function clearSelection() { setSelected(new Set()); setBulkMenu(null) }

  function toggleCollapse(key: string) {
    setCollapsed((prev) => { const n = new Set(prev); n.has(key) ? n.delete(key) : n.add(key); return n })
  }
  function toggleShowDone(key: string) {
    setShowDone((prev) => { const n = new Set(prev); n.has(key) ? n.delete(key) : n.add(key); return n })
  }

  async function bulkUpdate(updates: Partial<Task>) {
    setBulkWorking(true)
    await Promise.all([...selected].map((id) => updateTask(id, updates)))
    setBulkWorking(false)
    clearSelection()
    load()
  }

  async function bulkDelete() {
    if (!confirm(`Delete ${selected.size} task${selected.size !== 1 ? 's' : ''}?`)) return
    setBulkWorking(true)
    await Promise.all([...selected].map((id) => deleteTask(id)))
    setBulkWorking(false)
    clearSelection()
    load()
  }

  async function handleQuickAdd(e: React.FormEvent) {
    e.preventDefault()
    if (!quickTitle.trim()) return
    setAdding(true)
    await createTask({
      title: quickTitle.trim(),
      description: null, status: 'todo', priority: 'normal',
      stream_id: null, goal_id: null, due_date: null,
      ai_score: null, ai_reason: null, recurrence: 'none',
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
        <Breadcrumb items={[
          { label: activeWorkspace?.name ?? 'Workspace', color: activeWorkspace?.color },
          { label: 'Tasks' },
        ]} />

        <div className="flex items-center justify-between mb-5">
          <h1 className="text-xl font-bold text-gray-900">Tasks</h1>
          <span className="text-xs text-gray-400">{tasks.filter(t => t.status !== 'done').length} open</span>
        </div>

        {/* Quick add + search */}
        <div className="flex gap-2 mb-5">
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search tasks…"
            className="w-36 sm:w-48"
          />
          <form onSubmit={handleQuickAdd} className="flex gap-2 flex-1">
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
        </div>

        {/* Overdue banner */}
        {overdueTasks.length > 0 && (
          <div className="flex items-center gap-2 mb-5 px-4 py-2.5 bg-red-50 border border-red-100 rounded-xl text-sm text-red-700">
            <AlertTriangle size={14} className="flex-shrink-0" />
            <span className="font-medium">{overdueTasks.length} overdue task{overdueTasks.length !== 1 ? 's' : ''}</span>
            <span className="text-red-400">·</span>
            <span className="text-red-500 text-xs truncate">{overdueTasks.slice(0, 3).map(t => t.title).join(', ')}{overdueTasks.length > 3 ? '…' : ''}</span>
          </div>
        )}

        {/* Bulk action bar */}
        {hasSelection && (
          <div className="flex items-center gap-2 mb-4 px-3 py-2 bg-indigo-50 border border-indigo-100 rounded-xl flex-wrap">
            <button onClick={toggleAll} className="text-indigo-600 hover:text-indigo-800 transition-colors">
              {allSelected ? <CheckSquare size={15} /> : <Square size={15} />}
            </button>
            <span className="text-xs font-semibold text-indigo-700">{selected.size} selected</span>
            <div className="flex-1" />
            <button onClick={() => bulkUpdate({ status: 'done' })} disabled={bulkWorking}
              className="flex items-center gap-1 text-xs px-2.5 py-1.5 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors disabled:opacity-50">
              <CheckCircle2 size={12} /> Mark done
            </button>
            <div className="relative">
              <button onClick={() => setBulkMenu(bulkMenu === 'status' ? null : 'status')} disabled={bulkWorking}
                className="flex items-center gap-1 text-xs px-2.5 py-1.5 bg-white border border-indigo-200 text-indigo-700 rounded-lg hover:bg-indigo-50 transition-colors disabled:opacity-50">
                Status <ChevronDown size={11} />
              </button>
              {bulkMenu === 'status' && (
                <>
                  <div className="fixed inset-0 z-10" onClick={() => setBulkMenu(null)} />
                  <div className="absolute left-0 top-8 z-20 bg-white border border-gray-100 shadow-lg rounded-lg py-1 w-36">
                    {(['todo','in_progress','blocked','done'] as TaskStatus[]).map((s) => (
                      <button key={s} onClick={() => { setBulkMenu(null); bulkUpdate({ status: s }) }}
                        className="flex items-center gap-2 w-full px-3 py-2 text-xs text-gray-700 hover:bg-gray-50">
                        <span className={cn('px-1.5 py-0.5 rounded-full font-medium', STATUS_CONFIG[s].color)}>{STATUS_CONFIG[s].label}</span>
                      </button>
                    ))}
                  </div>
                </>
              )}
            </div>
            <div className="relative">
              <button onClick={() => setBulkMenu(bulkMenu === 'priority' ? null : 'priority')} disabled={bulkWorking}
                className="flex items-center gap-1 text-xs px-2.5 py-1.5 bg-white border border-indigo-200 text-indigo-700 rounded-lg hover:bg-indigo-50 transition-colors disabled:opacity-50">
                Priority <ChevronDown size={11} />
              </button>
              {bulkMenu === 'priority' && (
                <>
                  <div className="fixed inset-0 z-10" onClick={() => setBulkMenu(null)} />
                  <div className="absolute left-0 top-8 z-20 bg-white border border-gray-100 shadow-lg rounded-lg py-1 w-32">
                    {(['urgent','high','normal','low'] as TaskPriority[]).map((p) => (
                      <button key={p} onClick={() => { setBulkMenu(null); bulkUpdate({ priority: p }) }}
                        className="flex items-center gap-2 w-full px-3 py-2 text-xs text-gray-700 hover:bg-gray-50">
                        <span className={cn('px-1.5 py-0.5 rounded font-medium', PRIORITY_CONFIG[p].color)}>{PRIORITY_CONFIG[p].label}</span>
                      </button>
                    ))}
                  </div>
                </>
              )}
            </div>
            <button onClick={bulkDelete} disabled={bulkWorking}
              className="flex items-center gap-1 text-xs px-2.5 py-1.5 bg-white border border-red-200 text-red-600 rounded-lg hover:bg-red-50 transition-colors disabled:opacity-50">
              <Trash2 size={12} /> Delete
            </button>
            <button onClick={clearSelection} className="text-indigo-400 hover:text-indigo-600 transition-colors ml-1">
              <X size={15} />
            </button>
          </div>
        )}

        {/* Groups */}
        {groups.length === 0 ? (
          <div className="text-center py-16 text-gray-400 text-sm">
            {search ? 'No tasks match your search.' : 'No tasks yet. Add one above.'}
          </div>
        ) : (
          <div className="space-y-4">
            {groups.map((group) => {
              const key = group.id ?? 'unassigned'
              const isCollapsed = collapsed.has(key)
              const isDoneShown = showDone.has(key)
              const openTasks = group.tasks.filter((t) => t.status !== 'done')
              const doneTasks = group.tasks.filter((t) => t.status === 'done')
              const total = group.tasks.length
              const progress = total > 0 ? Math.round((group.totalDone / total) * 100) : 0

              return (
                <div key={key} className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
                  {/* Group header */}
                  <button
                    onClick={() => toggleCollapse(key)}
                    className="w-full flex items-center gap-3 px-4 py-3 hover:bg-gray-50 transition-colors text-left"
                  >
                    <span className="text-gray-400 flex-shrink-0">
                      {isCollapsed ? <ChevronRight size={15} /> : <ChevronDown size={15} />}
                    </span>
                    {group.isProject
                      ? <Target size={14} className="text-indigo-400 flex-shrink-0" />
                      : <Layers size={14} className="text-gray-300 flex-shrink-0" />
                    }
                    <span className="font-semibold text-sm text-gray-800 flex-1 min-w-0 truncate">{group.label}</span>

                    {/* Stats */}
                    <div className="flex items-center gap-2 flex-shrink-0">
                      {group.totalOpen > 0 && (
                        <span className="text-xs text-gray-400">{group.totalOpen} open</span>
                      )}
                      {group.totalDone > 0 && (
                        <span className="text-xs text-green-500">{group.totalDone} done</span>
                      )}
                    </div>

                    {/* Progress bar */}
                    {total > 0 && (
                      <div className="w-16 h-1.5 bg-gray-100 rounded-full overflow-hidden flex-shrink-0">
                        <div
                          className={cn('h-full rounded-full transition-all', progress === 100 ? 'bg-green-400' : 'bg-indigo-400')}
                          style={{ width: `${progress}%` }}
                        />
                      </div>
                    )}
                  </button>

                  {/* Tasks */}
                  {!isCollapsed && (
                    <div className="border-t border-gray-50">
                      {openTasks.length === 0 && doneTasks.length > 0 && (
                        <p className="text-xs text-gray-400 px-4 py-3 italic">All tasks done 🎉</p>
                      )}
                      {openTasks.map((task) => (
                        <TaskRow
                          key={task.id}
                          task={task}
                          streams={streams}
                          selected={selected.has(task.id)}
                          anySelected={hasSelection}
                          active={panelTask?.id === task.id}
                          onSelect={() => toggleSelect(task.id)}
                          menuOpen={menuOpen === task.id}
                          onMenu={() => setMenuOpen(menuOpen === task.id ? null : task.id)}
                          onCloseMenu={() => setMenuOpen(null)}
                          onToggle={() => handleToggle(task)}
                          onOpen={() => setPanelTask(task)}
                          onEdit={() => { setPanelTask(task); setMenuOpen(null) }}
                          onDelete={() => { handleDelete(task.id); setMenuOpen(null) }}
                        />
                      ))}

                      {/* Done tasks (collapsible) */}
                      {doneTasks.length > 0 && (
                        <>
                          <button
                            onClick={() => toggleShowDone(key)}
                            className="w-full flex items-center gap-1.5 px-4 py-2 text-xs text-gray-400 hover:text-gray-600 transition-colors border-t border-gray-50"
                          >
                            {isDoneShown ? <ChevronDown size={11} /> : <ChevronRight size={11} />}
                            {doneTasks.length} completed task{doneTasks.length !== 1 ? 's' : ''}
                          </button>
                          {isDoneShown && doneTasks.map((task) => (
                            <TaskRow
                              key={task.id}
                              task={task}
                              streams={streams}
                              selected={selected.has(task.id)}
                              anySelected={hasSelection}
                              active={panelTask?.id === task.id}
                              onSelect={() => toggleSelect(task.id)}
                              menuOpen={menuOpen === task.id}
                              onMenu={() => setMenuOpen(menuOpen === task.id ? null : task.id)}
                              onCloseMenu={() => setMenuOpen(null)}
                              onToggle={() => handleToggle(task)}
                              onOpen={() => setPanelTask(task)}
                              onEdit={() => { setPanelTask(task); setMenuOpen(null) }}
                              onDelete={() => { handleDelete(task.id); setMenuOpen(null) }}
                            />
                          ))}
                        </>
                      )}
                    </div>
                  )}
                </div>
              )
            })}
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

function TaskRow({ task, streams, selected, anySelected, active, onSelect, menuOpen, onMenu, onCloseMenu, onToggle, onOpen, onEdit, onDelete }: {
  task: Task; streams: WorkStream[]; selected: boolean; anySelected: boolean; active?: boolean
  onSelect: () => void; menuOpen: boolean; onMenu: () => void; onCloseMenu: () => void
  onToggle: () => void; onOpen: () => void; onEdit: () => void; onDelete: () => void
}) {
  const priority = PRIORITY_CONFIG[task.priority]
  const stream = streams.find((s) => s.id === task.stream_id)
  const overdue = isOverdue(task.due_date, task.status)
  const isDone = task.status === 'done'

  return (
    <div className={cn(
      'group flex items-center gap-2.5 px-4 py-2.5 border-b border-gray-50 last:border-0 transition-all',
      active ? 'bg-indigo-50 ring-1 ring-inset ring-indigo-200' : 'hover:bg-gray-50/70',
      selected && !active && 'bg-indigo-50/40',
      isDone && !active && !selected && 'opacity-50'
    )}>
      {/* Checkbox */}
      <button onClick={onSelect}
        className={cn('flex-shrink-0 transition-all text-gray-300 hover:text-indigo-400',
          selected ? 'text-indigo-500 opacity-100' : anySelected ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'
        )}>
        {selected ? <CheckSquare size={14} /> : <Square size={14} />}
      </button>

      {/* Status icon / done toggle */}
      <button onClick={onToggle} className="flex-shrink-0 hover:scale-110 transition-transform" title={isDone ? 'Mark todo' : 'Mark done'}>
        {STATUS_ICON[task.status]}
      </button>

      {/* Title */}
      <button onClick={onOpen}
        className={cn('flex-1 min-w-0 text-sm text-left truncate hover:text-indigo-600 transition-colors',
          isDone ? 'line-through text-gray-400' : 'text-gray-800'
        )}>
        {task.title}
      </button>

      {/* Meta row */}
      <div className="flex items-center gap-1.5 flex-shrink-0 overflow-hidden">
        {stream && (
          <span className="hidden sm:flex items-center gap-1 text-xs text-gray-400 max-w-[100px]">
            <span className="w-1.5 h-1.5 rounded-full flex-shrink-0" style={{ backgroundColor: stream.color }} />
            <span className="truncate">{stream.name}</span>
          </span>
        )}
        {overdue && task.due_date && (
          <span className="hidden sm:flex items-center gap-0.5 text-xs text-red-500 flex-shrink-0">
            <Clock size={10} /> {formatDate(task.due_date)}
          </span>
        )}
        {!overdue && task.due_date && (
          <span className="hidden md:flex items-center gap-0.5 text-xs text-gray-400 flex-shrink-0">
            <Clock size={10} /> {formatDate(task.due_date)}
          </span>
        )}
        {task.ai_score !== null && (
          <span className="hidden lg:flex text-xs text-indigo-400 items-center gap-0.5 flex-shrink-0">
            <Sparkles size={10} />{task.ai_score}
          </span>
        )}
        {task.recurrence && task.recurrence !== 'none' && (
          <span className="hidden lg:block"><RefreshCw size={10} className="text-gray-300" /></span>
        )}
        <span className={cn('text-xs px-1.5 py-0.5 rounded font-medium flex-shrink-0', priority.color)}>{priority.label}</span>

        {/* Menu */}
        <div className="relative">
          <button onClick={onMenu}
            className={cn('text-gray-300 hover:text-gray-500 transition-colors p-0.5 flex-shrink-0',
              menuOpen ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'
            )}>
            <MoreHorizontal size={14} />
          </button>
          {menuOpen && (
            <>
              <div className="fixed inset-0 z-10" onClick={onCloseMenu} />
              <div className="absolute right-0 top-6 z-20 bg-white border border-gray-100 shadow-lg rounded-lg py-1 w-32">
                <button onClick={onEdit} className="flex items-center gap-2 w-full px-3 py-2 text-xs text-gray-700 hover:bg-gray-50">
                  <Pencil size={12} /> Edit
                </button>
                <button onClick={onDelete} className="flex items-center gap-2 w-full px-3 py-2 text-xs text-red-600 hover:bg-red-50">
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
