'use client'

import { useEffect, useState, useCallback } from 'react'
import { Plus, Target, Layers, MoreHorizontal, Pencil, Trash2, Calendar, ExternalLink } from 'lucide-react'
import { getStreams, createStream, updateStream, deleteStream } from '@/lib/queries/streams'
import { getGoals, createGoal, updateGoal, deleteGoal } from '@/lib/queries/goals'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Select } from '@/components/ui/select'
import { Modal } from '@/components/ui/modal'
import { cn, STREAM_COLORS, formatDate, daysUntil } from '@/lib/utils'
import type { WorkStream, Goal } from '@/types'
import Link from 'next/link'

export default function StrategyPage() {
  const [streams, setStreams] = useState<WorkStream[]>([])
  const [goals, setGoals] = useState<Goal[]>([])
  const [editStream, setEditStream] = useState<WorkStream | null>(null)
  const [showNewStream, setShowNewStream] = useState(false)
  const [editGoal, setEditGoal] = useState<Goal | null>(null)
  const [showNewGoal, setShowNewGoal] = useState(false)
  const [menuOpen, setMenuOpen] = useState<string | null>(null)

  const load = useCallback(async () => {
    const [s, g] = await Promise.all([getStreams(), getGoals()])
    setStreams(s)
    setGoals(g)
  }, [])

  useEffect(() => { load() }, [load])

  return (
    <div className="max-w-4xl mx-auto px-8 py-8">
      {/* Work Streams */}
      <section className="mb-10">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-bold text-gray-900 flex items-center gap-2">
            <Layers size={18} className="text-indigo-500" /> Work Streams
          </h2>
          <Button size="sm" onClick={() => setShowNewStream(true)}>
            <Plus size={14} /> New stream
          </Button>
        </div>

        {streams.length === 0 ? (
          <EmptyState icon={<Layers size={32} />} text="No work streams yet." action="Create your first stream" onClick={() => setShowNewStream(true)} />
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {streams.map((stream) => {
              const streamGoals = goals.filter((g) => g.stream_id === stream.id)
              const days = daysUntil(stream.deadline)
              return (
                <div key={stream.id} className="group bg-white rounded-xl border border-gray-100 hover:border-gray-200 hover:shadow-sm transition-all overflow-hidden">
                  <div className="h-1.5" style={{ backgroundColor: stream.color }} />
                  <div className="p-4">
                    <div className="flex items-start justify-between">
                      <div className="flex-1 min-w-0">
                        <h3 className="font-semibold text-gray-900 text-sm truncate">{stream.name}</h3>
                        {stream.description && <p className="text-xs text-gray-500 mt-0.5 line-clamp-2">{stream.description}</p>}
                      </div>
                      <RowMenu
                        id={stream.id}
                        open={menuOpen === stream.id}
                        onToggle={() => setMenuOpen(menuOpen === stream.id ? null : stream.id)}
                        onClose={() => setMenuOpen(null)}
                        onEdit={() => { setEditStream(stream); setMenuOpen(null) }}
                        onDelete={async () => {
                          if (!confirm('Delete this stream?')) return
                          await deleteStream(stream.id)
                          setMenuOpen(null)
                          load()
                        }}
                      />
                    </div>
                    <div className="mt-3 flex items-center gap-3 text-xs text-gray-400">
                      <span className={cn('px-1.5 py-0.5 rounded font-medium', stream.is_ongoing ? 'bg-green-50 text-green-600' : 'bg-blue-50 text-blue-600')}>
                        {stream.is_ongoing ? 'Ongoing' : 'Time-bound'}
                      </span>
                      {stream.deadline && (
                        <span className={cn('flex items-center gap-1', days !== null && days < 7 ? 'text-red-500' : '')}>
                          <Calendar size={11} /> {formatDate(stream.deadline)}
                          {days !== null && days >= 0 && ` (${days}d)`}
                        </span>
                      )}
                    </div>
                    <div className="mt-3 flex items-center justify-between">
                      <span className="text-xs text-gray-400">{streamGoals.length} goal{streamGoals.length !== 1 ? 's' : ''}</span>
                      <Link href={`/dashboard/tasks?stream=${stream.id}`} className="text-xs text-indigo-500 hover:underline flex items-center gap-1">
                        View tasks <ExternalLink size={10} />
                      </Link>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </section>

      {/* Goals */}
      <section>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-bold text-gray-900 flex items-center gap-2">
            <Target size={18} className="text-indigo-500" /> Goals
          </h2>
          <Button size="sm" onClick={() => setShowNewGoal(true)}>
            <Plus size={14} /> New goal
          </Button>
        </div>

        {goals.length === 0 ? (
          <EmptyState icon={<Target size={32} />} text="No goals yet." action="Set your first goal" onClick={() => setShowNewGoal(true)} />
        ) : (
          <div className="space-y-3">
            {goals.map((goal) => {
              const stream = streams.find((s) => s.id === goal.stream_id)
              return (
                <div key={goal.id} className="group bg-white rounded-xl border border-gray-100 hover:border-gray-200 transition-all p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <h3 className="font-semibold text-gray-900 text-sm">{goal.title}</h3>
                        {stream && (
                          <span className="text-xs px-1.5 py-0.5 rounded-full font-medium text-gray-500 bg-gray-100 flex items-center gap-1">
                            <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: stream.color }} />
                            {stream.name}
                          </span>
                        )}
                      </div>
                      {goal.description && <p className="text-xs text-gray-500 mb-2 line-clamp-1">{goal.description}</p>}

                      {/* Progress bar */}
                      <div className="flex items-center gap-3">
                        <div className="flex-1 bg-gray-100 rounded-full h-1.5">
                          <div
                            className="h-1.5 rounded-full transition-all"
                            style={{ width: `${goal.progress ?? 0}%`, backgroundColor: stream?.color ?? '#6366f1' }}
                          />
                        </div>
                        <span className="text-xs font-medium text-gray-500 w-10 text-right">
                          {goal.progress ?? 0}%
                        </span>
                        <span className="text-xs text-gray-400">
                          {goal.done_count}/{goal.task_count} tasks
                        </span>
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
                      onDelete={async () => {
                        if (!confirm('Delete this goal?')) return
                        await deleteGoal(goal.id)
                        setMenuOpen(null)
                        load()
                      }}
                    />
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </section>

      {/* Modals */}
      <Modal open={showNewStream} onClose={() => setShowNewStream(false)} title="New work stream">
        <StreamForm
          streams={streams}
          onSuccess={() => { setShowNewStream(false); load() }}
          onCancel={() => setShowNewStream(false)}
        />
      </Modal>
      <Modal open={!!editStream} onClose={() => setEditStream(null)} title="Edit work stream">
        {editStream && (
          <StreamForm
            stream={editStream}
            streams={streams}
            onSuccess={() => { setEditStream(null); load() }}
            onCancel={() => setEditStream(null)}
          />
        )}
      </Modal>
      <Modal open={showNewGoal} onClose={() => setShowNewGoal(false)} title="New goal">
        <GoalForm
          streams={streams}
          onSuccess={() => { setShowNewGoal(false); load() }}
          onCancel={() => setShowNewGoal(false)}
        />
      </Modal>
      <Modal open={!!editGoal} onClose={() => setEditGoal(null)} title="Edit goal">
        {editGoal && (
          <GoalForm
            goal={editGoal}
            streams={streams}
            onSuccess={() => { setEditGoal(null); load() }}
            onCancel={() => setEditGoal(null)}
          />
        )}
      </Modal>
    </div>
  )
}

// ── Stream Form ───────────────────────────────────────────
function StreamForm({ stream, streams: _, onSuccess, onCancel }: { stream?: WorkStream; streams: WorkStream[]; onSuccess: () => void; onCancel: () => void }) {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [form, setForm] = useState({
    name: stream?.name ?? '',
    description: stream?.description ?? '',
    color: stream?.color ?? STREAM_COLORS[0],
    is_ongoing: stream?.is_ongoing ?? true,
    deadline: stream?.deadline ?? '',
  })

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!form.name.trim()) return
    setError(''); setLoading(true)
    try {
      const payload = { name: form.name.trim(), description: form.description || null, color: form.color, is_ongoing: form.is_ongoing, deadline: form.is_ongoing ? null : form.deadline || null }
      if (stream) await updateStream(stream.id, payload)
      else await createStream(payload)
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

// ── Goal Form ─────────────────────────────────────────────
function GoalForm({ goal, streams, onSuccess, onCancel }: { goal?: Goal; streams: WorkStream[]; onSuccess: () => void; onCancel: () => void }) {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [form, setForm] = useState({
    title: goal?.title ?? '',
    description: goal?.description ?? '',
    stream_id: goal?.stream_id ?? '',
    target_date: goal?.target_date ?? '',
    archived: goal?.archived ?? false,
  })

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!form.title.trim()) return
    setError(''); setLoading(true)
    try {
      const payload = { title: form.title.trim(), description: form.description || null, stream_id: form.stream_id || null, target_date: form.target_date || null, archived: form.archived }
      if (goal) await updateGoal(goal.id, payload)
      else await createGoal(payload as Parameters<typeof createGoal>[0])
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
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Work Stream</label>
          <Select value={form.stream_id} onChange={(e) => setForm({ ...form, stream_id: e.target.value })}>
            <option value="">No stream</option>
            {streams.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
          </Select>
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Target date</label>
          <Input type="date" value={form.target_date} onChange={(e) => setForm({ ...form, target_date: e.target.value })} />
        </div>
      </div>
      {error && <p className="text-sm text-red-600">{error}</p>}
      <div className="flex justify-end gap-2 pt-1">
        <Button type="button" variant="secondary" onClick={onCancel}>Cancel</Button>
        <Button type="submit" disabled={loading}>{loading ? 'Saving…' : goal ? 'Update' : 'Create goal'}</Button>
      </div>
    </form>
  )
}

// ── Shared helpers ────────────────────────────────────────
function RowMenu({ id, open, onToggle, onClose, onEdit, onDelete }: {
  id: string; open: boolean; onToggle: () => void; onClose: () => void;
  onEdit: () => void; onDelete: () => void;
}) {
  return (
    <div className="relative flex-shrink-0">
      <button onClick={onToggle} className="opacity-0 group-hover:opacity-100 text-gray-400 hover:text-gray-700 p-1 rounded transition-all">
        <MoreHorizontal size={15} />
      </button>
      {open && (
        <>
          <div className="fixed inset-0 z-10" onClick={onClose} />
          <div className="absolute right-0 top-7 z-20 bg-white border border-gray-100 shadow-lg rounded-lg py-1 w-32">
            <button onClick={onEdit} className="flex items-center gap-2 w-full px-3 py-2 text-sm text-gray-700 hover:bg-gray-50"><Pencil size={12} /> Edit</button>
            <button onClick={onDelete} className="flex items-center gap-2 w-full px-3 py-2 text-sm text-red-600 hover:bg-red-50"><Trash2 size={12} /> Delete</button>
          </div>
        </>
      )}
    </div>
  )
}

function EmptyState({ icon, text, action, onClick }: { icon: React.ReactNode; text: string; action: string; onClick: () => void }) {
  return (
    <div className="text-center py-12 text-gray-400">
      <div className="opacity-20 mb-3 flex justify-center">{icon}</div>
      <p className="text-sm">{text}</p>
      <button onClick={onClick} className="mt-2 text-indigo-600 text-sm hover:underline">{action}</button>
    </div>
  )
}
