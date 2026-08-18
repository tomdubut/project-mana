'use client'

import { useEffect, useState, useCallback } from 'react'
import { Plus, Target, Layers, MoreHorizontal, Pencil, Trash2, Calendar, ExternalLink, ChevronDown, ChevronRight, Archive, ArchiveRestore } from 'lucide-react'
import { getGoals, createGoal, updateGoal, deleteGoal } from '@/lib/queries/goals'
import { getStreams, createStream, updateStream, deleteStream } from '@/lib/queries/streams'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Select } from '@/components/ui/select'
import { Modal } from '@/components/ui/modal'
import { cn, STREAM_COLORS, formatDate, daysUntil } from '@/lib/utils'
import { useWorkspace } from '@/lib/workspace-context'
import type { WorkStream, Goal } from '@/types'
import Link from 'next/link'

export default function StrategyPage() {
  const [goals, setGoals] = useState<Goal[]>([])
  const [streams, setStreams] = useState<WorkStream[]>([])
  const [editGoal, setEditGoal] = useState<Goal | null>(null)
  const [showNewGoal, setShowNewGoal] = useState(false)
  const [editStream, setEditStream] = useState<WorkStream | null>(null)
  const [showNewStream, setShowNewStream] = useState(false)
  const [newStreamGoalId, setNewStreamGoalId] = useState<string | null>(null)
  const [expandedGoals, setExpandedGoals] = useState<Set<string>>(new Set())
  const [menuOpen, setMenuOpen] = useState<string | null>(null)
  const [archivedStreams, setArchivedStreams] = useState<WorkStream[]>([])
  const [showArchived, setShowArchived] = useState(false)
  const [archivedGoals, setArchivedGoals] = useState<Goal[]>([])
  const [showArchivedGoals, setShowArchivedGoals] = useState(false)

  const { activeWorkspace } = useWorkspace()

  const load = useCallback(async () => {
    const [g, allGoals, s, archived] = await Promise.all([
      getGoals(activeWorkspace?.id),
      getGoals(activeWorkspace?.id, true),
      getStreams(false, activeWorkspace?.id),
      getStreams(true, activeWorkspace?.id),
    ])
    setGoals(g)
    setArchivedGoals(allGoals.filter((goal) => goal.archived))
    setStreams(s)
    setArchivedStreams(archived.filter((s) => s.archived))
    setExpandedGoals(new Set(g.map((goal) => goal.id)))
  }, [activeWorkspace?.id])

  useEffect(() => { load() }, [load])

  function toggleGoal(id: string) {
    setExpandedGoals((prev) => {
      const next = new Set(prev)
      next.has(id) ? next.delete(id) : next.add(id)
      return next
    })
  }

  function openNewStream(goalId: string | null = null) {
    setNewStreamGoalId(goalId)
    setShowNewStream(true)
  }

  // Streams not linked to any goal
  const orphanStreams = streams.filter((s) => !s.goal_id)

  return (
    <div className="max-w-3xl mx-auto px-4 sm:px-8 py-8">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between mb-6">
        <h1 className="text-xl font-bold text-gray-900">Strategy</h1>
        <div className="flex gap-2">
          <Button size="sm" variant="secondary" onClick={() => openNewStream(null)}>
            <Layers size={14} /> New stream
          </Button>
          <Button size="sm" onClick={() => setShowNewGoal(true)}>
            <Plus size={14} /> New goal
          </Button>
        </div>
      </div>

      {/* Goals with nested streams */}
      {goals.length === 0 && orphanStreams.length === 0 ? (
        <div className="text-center py-20 text-gray-400">
          <Target size={40} className="mx-auto mb-3 opacity-20" />
          <p className="text-sm">No goals yet.</p>
          <button onClick={() => setShowNewGoal(true)} className="mt-2 text-indigo-600 text-sm hover:underline">
            Set your first goal
          </button>
        </div>
      ) : (
        <div className="space-y-3">
          {goals.map((goal) => {
            const goalStreams = streams.filter((s) => s.goal_id === goal.id)
            const expanded = expandedGoals.has(goal.id)
            return (
              <div key={goal.id} className="bg-white rounded-xl border border-gray-100 overflow-hidden">
                {/* Goal row */}
                <div className="group flex items-start gap-3 p-4">
                  <button
                    onClick={() => toggleGoal(goal.id)}
                    className="mt-0.5 flex-shrink-0 text-gray-400 hover:text-gray-600 transition-colors"
                  >
                    {expanded ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
                  </button>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <Target size={15} className="text-indigo-500 flex-shrink-0" />
                      <h3 className="font-semibold text-gray-900 text-sm">{goal.title}</h3>
                    </div>
                    {goal.description && (
                      <p className="text-xs text-gray-500 mb-2 line-clamp-1">{goal.description}</p>
                    )}

                    {/* Progress */}
                    <div className="flex items-center gap-3">
                      <div className="flex-1 bg-gray-100 rounded-full h-1.5">
                        <div
                          className="h-1.5 rounded-full bg-indigo-500 transition-all"
                          style={{ width: `${goal.progress ?? 0}%` }}
                        />
                      </div>
                      <span className="text-xs font-medium text-gray-500 w-8 text-right">{goal.progress ?? 0}%</span>
                      <span className="text-xs text-gray-400">{goal.done_count}/{goal.task_count} tasks</span>
                      {goal.target_date && (
                        <span className="text-xs text-gray-400 flex items-center gap-1">
                          <Calendar size={10} /> {formatDate(goal.target_date)}
                        </span>
                      )}
                    </div>
                  </div>

                  <RowMenu
                    id={goal.id}
                    open={menuOpen === goal.id}
                    onToggle={() => setMenuOpen(menuOpen === goal.id ? null : goal.id)}
                    onClose={() => setMenuOpen(null)}
                    onEdit={() => { setEditGoal(goal); setMenuOpen(null) }}
                    onArchive={async () => { await updateGoal(goal.id, { archived: true }); setMenuOpen(null); load() }}
                    onDelete={async () => {
                      if (!confirm('Delete this goal? Streams linked to it will become standalone.')) return
                      await deleteGoal(goal.id)
                      setMenuOpen(null)
                      load()
                    }}
                  />
                </div>

                {/* Nested streams */}
                {expanded && (
                  <div className="border-t border-gray-50 bg-gray-50/50">
                    {goalStreams.map((stream) => (
                      <StreamRow
                        key={stream.id}
                        stream={stream}
                        menuOpen={menuOpen === stream.id}
                        onToggleMenu={() => setMenuOpen(menuOpen === stream.id ? null : stream.id)}
                        onCloseMenu={() => setMenuOpen(null)}
                        onEdit={() => { setEditStream(stream); setMenuOpen(null) }}
                        onDelete={async () => {
                          if (!confirm('Delete this stream?')) return
                          await deleteStream(stream.id)
                          setMenuOpen(null)
                          load()
                        }}
                      />
                    ))}
                    <button
                      onClick={() => openNewStream(goal.id)}
                      className="flex items-center gap-2 w-full px-6 py-2.5 text-xs text-gray-400 hover:text-indigo-600 hover:bg-gray-100 transition-colors"
                    >
                      <Plus size={12} /> Add stream to this goal
                    </button>
                  </div>
                )}
              </div>
            )
          })}

          {/* Standalone streams (no goal) */}
          {orphanStreams.length > 0 && (
            <div className="bg-white rounded-xl border border-gray-100 overflow-hidden">
              <div className="px-4 py-3 border-b border-gray-50">
                <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Standalone streams</p>
              </div>
              {orphanStreams.map((stream) => (
                <StreamRow
                  key={stream.id}
                  stream={stream}
                  menuOpen={menuOpen === stream.id}
                  onToggleMenu={() => setMenuOpen(menuOpen === stream.id ? null : stream.id)}
                  onCloseMenu={() => setMenuOpen(null)}
                  onEdit={() => { setEditStream(stream); setMenuOpen(null) }}
                  onDelete={async () => {
                    if (!confirm('Delete this stream?')) return
                    await deleteStream(stream.id)
                    setMenuOpen(null)
                    load()
                  }}
                />
              ))}
            </div>
          )}
        </div>
      )}

      {/* Archived streams */}
      {archivedStreams.length > 0 && (
        <div className="mt-8">
          <button
            onClick={() => setShowArchived(!showArchived)}
            className="flex items-center gap-2 text-xs text-gray-400 hover:text-gray-600 transition-colors mb-2"
          >
            {showArchived ? <ChevronDown size={13} /> : <ChevronRight size={13} />}
            <Archive size={13} />
            Archived streams ({archivedStreams.length})
          </button>
          {showArchived && (
            <div className="bg-white rounded-xl border border-gray-100 overflow-hidden">
              {archivedStreams.map((stream) => (
                <div key={stream.id} className="flex items-center gap-3 px-4 py-3 border-b border-gray-50 last:border-0 opacity-60 hover:opacity-100 transition-opacity">
                  <span className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ backgroundColor: stream.color }} />
                  <span className="text-sm text-gray-700 flex-1 truncate">{stream.name}</span>
                  {(stream as any).goal?.title && (
                    <span className="text-xs text-gray-400 truncate max-w-[120px]">{(stream as any).goal.title}</span>
                  )}
                  <button
                    onClick={async () => { await updateStream(stream.id, { archived: false }); load() }}
                    className="flex items-center gap-1 text-xs text-indigo-500 hover:text-indigo-700 px-2 py-1 rounded-lg hover:bg-indigo-50 transition-colors flex-shrink-0"
                    title="Unarchive"
                  >
                    <ArchiveRestore size={13} /> Unarchive
                  </button>
                  <button
                    onClick={async () => { if (!confirm('Delete this stream?')) return; await deleteStream(stream.id); load() }}
                    className="text-gray-300 hover:text-red-500 p-1 rounded transition-colors flex-shrink-0"
                    title="Delete"
                  >
                    <Trash2 size={13} />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Archived goals */}
      {archivedGoals.length > 0 && (
        <div className="mt-4">
          <button
            onClick={() => setShowArchivedGoals(!showArchivedGoals)}
            className="flex items-center gap-2 text-xs text-gray-400 hover:text-gray-600 transition-colors mb-2"
          >
            {showArchivedGoals ? <ChevronDown size={13} /> : <ChevronRight size={13} />}
            <Archive size={13} />
            Archived goals ({archivedGoals.length})
          </button>
          {showArchivedGoals && (
            <div className="bg-white rounded-xl border border-gray-100 overflow-hidden">
              {archivedGoals.map((goal) => (
                <div key={goal.id} className="flex items-center gap-3 px-4 py-3 border-b border-gray-50 last:border-0 opacity-60 hover:opacity-100 transition-opacity">
                  <Target size={14} className="text-indigo-300 flex-shrink-0" />
                  <span className="text-sm text-gray-700 flex-1 truncate">{goal.title}</span>
                  {goal.target_date && (
                    <span className="text-xs text-gray-400 flex-shrink-0">{formatDate(goal.target_date)}</span>
                  )}
                  <button
                    onClick={async () => { await updateGoal(goal.id, { archived: false }); load() }}
                    className="flex items-center gap-1 text-xs text-indigo-500 hover:text-indigo-700 px-2 py-1 rounded-lg hover:bg-indigo-50 transition-colors flex-shrink-0"
                    title="Unarchive"
                  >
                    <ArchiveRestore size={13} /> Unarchive
                  </button>
                  <button
                    onClick={async () => { if (!confirm('Delete this goal? Streams linked to it will become standalone.')) return; await deleteGoal(goal.id); load() }}
                    className="text-gray-300 hover:text-red-500 p-1 rounded transition-colors flex-shrink-0"
                    title="Delete"
                  >
                    <Trash2 size={13} />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Modals */}
      <Modal open={showNewGoal} onClose={() => setShowNewGoal(false)} title="New goal">
        <GoalForm
          workspaceId={activeWorkspace?.id}
          onSuccess={() => { setShowNewGoal(false); load() }}
          onCancel={() => setShowNewGoal(false)}
        />
      </Modal>
      <Modal open={!!editGoal} onClose={() => setEditGoal(null)} title="Edit goal">
        {editGoal && (
          <GoalForm
            goal={editGoal}
            workspaceId={activeWorkspace?.id}
            onSuccess={() => { setEditGoal(null); load() }}
            onCancel={() => setEditGoal(null)}
          />
        )}
      </Modal>
      <Modal open={showNewStream} onClose={() => setShowNewStream(false)} title="New work stream">
        <StreamForm
          goals={goals}
          defaultGoalId={newStreamGoalId}
          workspaceId={activeWorkspace?.id}
          onSuccess={() => { setShowNewStream(false); load() }}
          onCancel={() => setShowNewStream(false)}
        />
      </Modal>
      <Modal open={!!editStream} onClose={() => setEditStream(null)} title="Edit work stream">
        {editStream && (
          <StreamForm
            stream={editStream}
            goals={goals}
            workspaceId={activeWorkspace?.id}
            onSuccess={() => { setEditStream(null); load() }}
            onCancel={() => setEditStream(null)}
          />
        )}
      </Modal>
    </div>
  )
}

// ── Stream row ───────────────────────────────────────────────
function StreamRow({ stream, menuOpen, onToggleMenu, onCloseMenu, onEdit, onDelete }: {
  stream: WorkStream
  menuOpen: boolean; onToggleMenu: () => void; onCloseMenu: () => void
  onEdit: () => void; onDelete: () => void
}) {
  const days = daysUntil(stream.deadline)
  return (
    <div className="group flex items-center gap-3 px-6 py-3 hover:bg-gray-100/60 transition-colors border-b border-gray-50 last:border-0">
      <span className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ backgroundColor: stream.color }} />
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <Link href={`/dashboard/streams/${stream.id}`} className="text-sm font-medium text-gray-800 truncate hover:text-indigo-600 transition-colors">{stream.name}</Link>
          <span className={cn(
            'text-xs px-1.5 py-0.5 rounded font-medium flex-shrink-0',
            stream.is_ongoing ? 'bg-green-50 text-green-600' : 'bg-blue-50 text-blue-600'
          )}>
            {stream.is_ongoing ? 'Ongoing' : 'Time-bound'}
          </span>
          {stream.deadline && (
            <span className={cn('text-xs flex items-center gap-1 flex-shrink-0', days !== null && days < 7 ? 'text-red-500' : 'text-gray-400')}>
              <Calendar size={10} /> {formatDate(stream.deadline)}{days !== null && days >= 0 && ` (${days}d)`}
            </span>
          )}
        </div>
        {stream.description && <p className="text-xs text-gray-400 truncate mt-0.5">{stream.description}</p>}
      </div>
      <Link href={`/dashboard/streams/${stream.id}`} className="opacity-0 group-hover:opacity-100 text-xs text-indigo-500 hover:text-indigo-700 flex items-center gap-1 flex-shrink-0 transition-all">
        Open <ExternalLink size={10} />
      </Link>
      <RowMenu id={stream.id} open={menuOpen} onToggle={onToggleMenu} onClose={onCloseMenu} onEdit={onEdit} onDelete={onDelete} />
    </div>
  )
}

// ── Goal Form ───────────────────────────────────────────────
function GoalForm({ goal, workspaceId, onSuccess, onCancel }: { goal?: Goal; workspaceId?: string; onSuccess: () => void; onCancel: () => void }) {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [form, setForm] = useState({
    title: goal?.title ?? '',
    description: goal?.description ?? '',
    target_date: goal?.target_date ?? '',
  })

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!form.title.trim()) return
    setError(''); setLoading(true)
    try {
      const payload = { title: form.title.trim(), description: form.description || null, target_date: form.target_date || null }
      if (goal) await updateGoal(goal.id, payload)
      else await createGoal({ ...payload, workspace_id: workspaceId ?? null })
      onSuccess()
    } catch (err: any) { setError(err.message) } finally { setLoading(false) }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Title *</label>
        <Input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} autoFocus required />
      </div>
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
        <textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} rows={2}
          className="block w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500" />
      </div>
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Target date</label>
        <Input type="date" value={form.target_date} onChange={(e) => setForm({ ...form, target_date: e.target.value })} />
      </div>
      {error && <p className="text-sm text-red-600">{error}</p>}
      <div className="flex justify-end gap-2 pt-1">
        <Button type="button" variant="secondary" onClick={onCancel}>Cancel</Button>
        <Button type="submit" disabled={loading}>{loading ? 'Saving…' : goal ? 'Update' : 'Create goal'}</Button>
      </div>
    </form>
  )
}

// ── Stream Form ───────────────────────────────────────────────
function StreamForm({ stream, goals, defaultGoalId, workspaceId, onSuccess, onCancel }: {
  stream?: WorkStream; goals: Goal[]; defaultGoalId?: string | null; workspaceId?: string
  onSuccess: () => void; onCancel: () => void
}) {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [form, setForm] = useState({
    name: stream?.name ?? '',
    description: stream?.description ?? '',
    color: stream?.color ?? STREAM_COLORS[0],
    is_ongoing: stream?.is_ongoing ?? true,
    deadline: stream?.deadline ?? '',
    goal_id: stream?.goal_id ?? defaultGoalId ?? '',
  })

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!form.name.trim()) return
    setError(''); setLoading(true)
    try {
      const payload = {
        name: form.name.trim(),
        description: form.description || null,
        color: form.color,
        is_ongoing: form.is_ongoing,
        deadline: form.is_ongoing ? null : form.deadline || null,
        goal_id: form.goal_id || null,
      }
      if (stream) await updateStream(stream.id, payload)
      else await createStream({ ...payload, workspace_id: workspaceId ?? null })
      onSuccess()
    } catch (err: any) { setError(err.message) } finally { setLoading(false) }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Name *</label>
        <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} autoFocus required />
      </div>
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Goal</label>
        <Select value={form.goal_id} onChange={(e) => setForm({ ...form, goal_id: e.target.value })}>
          <option value="">No goal (standalone)</option>
          {goals.map((g) => <option key={g.id} value={g.id}>{g.title}</option>)}
        </Select>
      </div>
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
        <textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} rows={2}
          className="block w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500" />
      </div>
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">Color</label>
        <div className="flex gap-2 flex-wrap">
          {STREAM_COLORS.map((color) => (
            <button key={color} type="button" onClick={() => setForm({ ...form, color })}
              className={cn('w-7 h-7 rounded-full transition-transform', form.color === color && 'ring-2 ring-offset-2 ring-gray-400 scale-110')}
              style={{ backgroundColor: color }} />
          ))}
        </div>
      </div>
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Type</label>
        <Select value={form.is_ongoing ? 'ongoing' : 'timebound'} onChange={(e) => setForm({ ...form, is_ongoing: e.target.value === 'ongoing' })}>
          <option value="ongoing">Ongoing</option>
          <option value="timebound">Time-bound (has deadline)</option>
        </Select>
      </div>
      {!form.is_ongoing && (
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Deadline</label>
          <Input type="date" value={form.deadline} onChange={(e) => setForm({ ...form, deadline: e.target.value })} />
        </div>
      )}
      {error && <p className="text-sm text-red-600">{error}</p>}
      <div className="flex justify-end gap-2 pt-1">
        <Button type="button" variant="secondary" onClick={onCancel}>Cancel</Button>
        <Button type="submit" disabled={loading}>{loading ? 'Saving…' : stream ? 'Update' : 'Create stream'}</Button>
      </div>
    </form>
  )
}

// ── Shared ────────────────────────────────────────────────
function RowMenu({ id, open, onToggle, onClose, onEdit, onArchive, onDelete }: {
  id: string; open: boolean; onToggle: () => void; onClose: () => void
  onEdit: () => void; onArchive?: () => void; onDelete: () => void
}) {
  return (
    <div className="relative flex-shrink-0">
      <button onClick={onToggle} className="opacity-0 group-hover:opacity-100 text-gray-400 hover:text-gray-700 p-1 rounded transition-all">
        <MoreHorizontal size={15} />
      </button>
      {open && (
        <>
          <div className="fixed inset-0 z-10" onClick={onClose} />
          <div className="absolute right-0 top-7 z-20 bg-white border border-gray-100 shadow-lg rounded-lg py-1 w-36">
            <button onClick={onEdit} className="flex items-center gap-2 w-full px-3 py-2 text-sm text-gray-700 hover:bg-gray-50"><Pencil size={12} /> Edit</button>
            {onArchive && (
              <button onClick={onArchive} className="flex items-center gap-2 w-full px-3 py-2 text-sm text-amber-600 hover:bg-amber-50"><Archive size={12} /> Archive</button>
            )}
            <button onClick={onDelete} className="flex items-center gap-2 w-full px-3 py-2 text-sm text-red-600 hover:bg-red-50"><Trash2 size={12} /> Delete</button>
          </div>
        </>
      )}
    </div>
  )
}
