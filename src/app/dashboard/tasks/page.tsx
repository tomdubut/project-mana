'use client'

import { useEffect, useState, useCallback } from 'react'
import {
  Plus, Circle, CheckCircle2, Clock, Sparkles,
  MoreHorizontal, Pencil, Trash2, Filter, AlertTriangle,
  CheckSquare, Square, ChevronDown, X, RefreshCw,
} from 'lucide-react'
import { getTasks, createTask, updateTask, deleteTask } from '@/lib/queries/tasks'
import { getStreams } from '@/lib/queries/streams'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { TaskPanel } from '@/components/tasks/task-panel'
import { cn, PRIORITY_CONFIG, STATUS_CONFIG, formatDate, isOverdue } from '@/lib/utils'
import { useWorkspace } from '@/lib/workspace-context'
import type { Task, WorkStream, TaskStatus, TaskPriority } from '@/types'
import { Breadcrumb } from '@/components/ui/breadcrumb'

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
  const [selected, setSelected] = useState<Set<string>>(new Set())
  const [bulkMenu, setBulkMenu] = useState<'status' | 'priority' | null>(null)
  const [bulkWorking, setBulkWorking] = useState(false)

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

  const overdueTasks = tasks.filter((t) => isOverdue(t.due_date, t.status))
  const overdueIds = new Set(overdueTasks.map((t) => t.id))

  const filtered = tasks.filter((t) => {
    if (overdueIds.has(t.id)) return false
    if (filterStatus !== 'all' && t.status !== filterStatus) return false
    if (filterPriority !== 'all' && t.priority !== filterPriority) return false
    return true
  })

  const visibleIds = [...overdueTasks, ...filtered].map((t) => t.id)
  const allSelected = visibleIds.length > 0 && visibleIds.every((id) => selected.has(id))

  function toggleSelect(id: string) {
    setSelected((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  function toggleAll() {
    if (allSelected) {
      setSelected(new Set())
    } else {
      setSelected(new Set(visibleIds))
    }
  }

  function clearSelection() {
    setSelected(new Set())
    setBulkMenu(null)
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
      description: null,
      status: 'todo',
      priority: 'normal',
      stream_id: null,
      goal_id: null,
      due_date: null,
      ai_score: null,
      ai_reason: null,
      recurrence: 'none',
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

  const hasSelection = selected.size > 0

  return (
    <div className={cn('transition-all duration-300 ease-in-out', panelTask ? 'sm:mr-[420px]' : '')}>
      <div className="max-w-3xl mx-auto px-4 sm:px-8 py-8">
        <Breadcrumb items={[
          { label: activeWorkspace?.name ?? 'Workspace', color: activeWorkspace?.color },
          { label: 'Tasks' },
        ]} />
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

        {/* Bulk action bar */}
        {hasSelection && (
          <div className="flex items-center gap-2 mb-4 px-3 py-2 bg-indigo-50 border border-indigo-100 rounded-xl flex-wrap">
            <button onClick={toggleAll} className="text-indigo-600 hover:text-indigo-800 transition-colors">
              {allSelected ? <CheckSquare size={15} /> : <Square size={15} />}
            </button>
            <span className="text-xs font-semibold text-indigo-700">{selected.size} selected</span>
            <div className="flex-1" />

            <button
              onClick={() => bulkUpdate({ status: 'done' })}
              disabled={bulkWorking}
              className="flex items-center gap-1 text-xs px-2.5 py-1.5 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors disabled:opacity-50"
            >
              <CheckCircle2 size={12} /> Mark done
            </button>

            {/* Status dropdown */}
            <div className="relative">
              <button
                onClick={() => setBulkMenu(bulkMenu === 'status' ? null : 'status')}
                disabled={bulkWorking}
                className="flex items-center gap-1 text-xs px-2.5 py-1.5 bg-white border border-indigo-200 text-indigo-700 rounded-lg hover:bg-indigo-50 transition-colors disabled:opacity-50"
              >
                Status <ChevronDown size={11} />
              </button>
              {bulkMenu === 'status' && (
                <>
                  <div className="fixed inset-0 z-10" onClick={() => setBulkMenu(null)} />
                  <div className="absolute left-0 top-8 z-20 bg-white border border-gray-100 shadow-lg rounded-lg py-1 w-36">
                    {ALL_STATUSES.map((s) => (
                      <button
                        key={s}
                        onClick={() => { setBulkMenu(null); bulkUpdate({ status: s }) }}
                        className="flex items-center gap-2 w-full px-3 py-2 text-xs text-gray-700 hover:bg-gray-50"
                      >
                        <span className={cn('px-1.5 py-0.5 rounded-full font-medium', STATUS_CONFIG[s].color)}>{STATUS_CONFIG[s].label}</span>
                      </button>
                    ))}
                  </div>
                </>
              )}
            </div>

            {/* Priority dropdown */}
            <div className="relative">
              <button
                onClick={() => setBulkMenu(bulkMenu === 'priority' ? null : 'priority')}
                disabled={bulkWorking}
                className="flex items-center gap-1 text-xs px-2.5 py-1.5 bg-white border border-indigo-200 text-indigo-700 rounded-lg hover:bg-indigo-50 transition-colors disabled:opacity-50"
              >
                Priority <ChevronDown size={11} />
              </button>
              {bulkMenu === 'priority' && (
                <>
                  <div className="fixed inset-0 z-10" onClick={() => setBulkMenu(null)} />
                  <div className="absolute left-0 top-8 z-20 bg-white border border-gray-100 shadow-lg rounded-lg py-1 w-32">
                    {(['urgent', ...ALL_PRIORITIES] as TaskPriority[]).map((p) => (
                      <button
                        key={p}
                        onClick={() => { setBulkMenu(null); bulkUpdate({ priority: p }) }}
                        className="flex items-center gap-2 w-full px-3 py-2 text-xs text-gray-700 hover:bg-gray-50"
                      >
                        <span className={cn('px-1.5 py-0.5 rounded font-medium', PRIORITY_CONFIG[p].color)}>{PRIORITY_CONFIG[p].label}</span>
                      </button>
                    ))}
                  </div>
                </>
              )}
            </div>

            <button
              onClick={bulkDelete}
              disabled={bulkWorking}
              className="flex items-center gap-1 text-xs px-2.5 py-1.5 bg-white border border-red-200 text-red-600 rounded-lg hover:bg-red-50 transition-colors disabled:opacity-50"
            >
              <Trash2 size={12} /> Delete
            </button>

            <button onClick={clearSelection} className="text-indigo-400 hover:text-indigo-600 transition-colors ml-1">
              <X size={15} />
            </button>
          </div>
        )}

        {/* Overdue section */}
        {overdueTasks.length > 0 && (
          <div className="mb-6">
            <div className="flex items-center gap-2 mb-2">
              <AlertTriangle size={13} className="text-red-500" />
              <p className="text-xs font-semibold text-red-600 uppercase tracking-wider">
                Overdue — {overdueTasks.length} task{overdueTasks.length !== 1 ? 's' : ''}
              </p>
            </div>
            <div className="space-y-1.5">
              {overdueTasks.map((task) => (
                <TaskRow
                  key={task.id}
                  task={task}
                  streams={streams}
                  selected={selected.has(task.id)}
                  anySelected={hasSelection}
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
            </div>
          </div>
        )}

        {/* Task list */}
        {filtered.length === 0 && overdueTasks.length === 0 ? (
          <div className="text-center py-16 text-gray-400 text-sm">No tasks match.</div>
        ) : filtered.length > 0 ? (
          <div className="space-y-1.5">
            {filtered.map((task) => (
              <TaskRow
                key={task.id}
                task={task}
                streams={streams}
                selected={selected.has(task.id)}
                anySelected={hasSelection}
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
          </div>
        ) : null}
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

function TaskRow({ task, streams, selected, anySelected, onSelect, menuOpen, onMenu, onCloseMenu, onToggle, onOpen, onEdit, onDelete }: {
  task: Task; streams: WorkStream[]; selected: boolean; anySelected: boolean
  onSelect: () => void; menuOpen: boolean; onMenu: () => void; onCloseMenu: () => void
  onToggle: () => void; onOpen: () => void; onEdit: () => void; onDelete: () => void
}) {
  const priority = PRIORITY_CONFIG[task.priority]
  const status = STATUS_CONFIG[task.status]
  const stream = streams.find((s) => s.id === task.stream_id)
  const overdue = isOverdue(task.due_date, task.status)

  return (
    <div className={cn(
      'group flex items-center gap-3 px-3 py-2.5 bg-white rounded-xl border transition-all',
      overdue ? 'border-red-100 hover:border-red-200' : 'border-gray-100 hover:border-gray-200',
      selected && 'border-indigo-200 bg-indigo-50/40',
      task.status === 'done' && !selected && 'opacity-50'
    )}>
      {/* Checkbox */}
      <button
        onClick={onSelect}
        className={cn(
          'flex-shrink-0 transition-all text-gray-300',
          selected ? 'text-indigo-500' : anySelected ? 'opacity-100' : 'opacity-0 group-hover:opacity-100',
          'hover:text-indigo-400'
        )}
      >
        {selected ? <CheckSquare size={15} /> : <Square size={15} />}
      </button>

      {/* Done toggle */}
      <button onClick={onToggle} className="flex-shrink-0 text-gray-300 hover:text-green-500 transition-colors">
        {task.status === 'done' ? <CheckCircle2 size={17} className="text-green-500" /> : <Circle size={17} />}
      </button>

      <button onClick={onOpen} className={cn('flex-1 min-w-0 text-sm text-gray-800 truncate text-left hover:text-indigo-600 transition-colors', task.status === 'done' && 'line-through text-gray-400')}>
        {task.title}
      </button>
      <div className="flex items-center gap-1.5 flex-shrink-0 overflow-hidden">
        {task.ai_score !== null && (
          <span className="hidden lg:flex text-xs text-indigo-400 items-center gap-0.5">
            <Sparkles size={10} />{task.ai_score}
          </span>
        )}
        <span className={cn('hidden md:inline text-xs px-1.5 py-0.5 rounded-full font-medium', status.color)}>{status.label}</span>
        <span className={cn('text-xs px-1.5 py-0.5 rounded font-medium flex-shrink-0', priority.color)}>{priority.label}</span>
        {stream && (
          <span className="hidden lg:flex text-xs text-gray-400 items-center gap-1 max-w-[90px]">
            <span className="w-1.5 h-1.5 rounded-full flex-shrink-0" style={{ backgroundColor: stream.color }} />
            <span className="truncate">{stream.name}</span>
          </span>
        )}
        {task.recurrence && task.recurrence !== 'none' && (
          <span className="hidden md:flex text-xs text-indigo-400 items-center gap-0.5" title={`Repeats ${task.recurrence}`}>
            <RefreshCw size={10} />
          </span>
        )}
        {task.due_date && (
          <span className={cn('hidden sm:flex text-xs items-center gap-1 flex-shrink-0', overdue ? 'text-red-500 font-medium' : 'text-gray-400')}>
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
