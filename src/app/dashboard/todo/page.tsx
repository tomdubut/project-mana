'use client'

import { useEffect, useState, useCallback } from 'react'
import { Sparkles, RefreshCw, CheckCircle2, Circle, Clock, AlertTriangle } from 'lucide-react'
import { getTasks, updateTask } from '@/lib/queries/tasks'
import { getStreams } from '@/lib/queries/streams'
import { Button } from '@/components/ui/button'
import { cn, PRIORITY_CONFIG, STATUS_CONFIG, formatDate, isOverdue } from '@/lib/utils'
import type { Task, WorkStream } from '@/types'

interface FocusItem {
  task: Task
  reason: string
}

export default function TodoPage() {
  const [focusItems, setFocusItems] = useState<FocusItem[]>([])
  const [allOpen, setAllOpen] = useState<Task[]>([])
  const [streams, setStreams] = useState<WorkStream[]>([])
  const [scoring, setScoring] = useState(false)
  const [scoreError, setScoreError] = useState('')
  const [loading, setLoading] = useState(true)

  const load = useCallback(async () => {
    const [tasks, s] = await Promise.all([
      getTasks({ openOnly: true }),
      getStreams(),
    ])
    setAllOpen(tasks)
    setStreams(s)

    // Build focus list from AI scores already stored
    const scored = tasks
      .filter((t) => t.ai_score !== null)
      .sort((a, b) => (b.ai_score ?? 0) - (a.ai_score ?? 0))
      .slice(0, 7)

    setFocusItems(scored.map((t) => ({ task: t, reason: t.ai_reason ?? '' })))
    setLoading(false)
  }, [])

  useEffect(() => { load() }, [load])

  async function runAiScore() {
    setScoring(true)
    setScoreError('')
    try {
      const res = await fetch('/api/internal/score', { method: 'POST' })
      const text = await res.text()
      if (!res.ok) {
        let msg = `HTTP ${res.status}`
        try { msg = JSON.parse(text).error ?? msg } catch {}
        setScoreError(msg)
        return
      }
    } catch (e: any) {
      setScoreError(e.message ?? 'Network error')
    }
    await load()
    setScoring(false)
  }

  async function toggleDone(task: Task) {
    const newStatus = task.status === 'done' ? 'todo' : 'done'
    await updateTask(task.id, { status: newStatus })
    await load()
  }

  if (loading) return <PageShell><div className="text-gray-400 text-sm">Loading…</div></PageShell>

  const unscored = allOpen.filter((t) => t.ai_score === null).length

  return (
    <PageShell>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-xl font-bold text-gray-900 flex items-center gap-2">
            <Sparkles size={20} className="text-indigo-500" /> Today's Focus
          </h1>
          <p className="text-sm text-gray-500 mt-0.5">AI-prioritized tasks for today</p>
        </div>
        <Button
          variant="secondary"
          size="sm"
          onClick={runAiScore}
          disabled={scoring}
          className="gap-1.5"
        >
          <RefreshCw size={13} className={scoring ? 'animate-spin' : ''} />
          {scoring ? 'Scoring…' : 'Re-score with AI'}
        </Button>
      </div>

      {scoreError && (
        <div className="mb-4 text-sm text-red-700 bg-red-50 border border-red-200 rounded-xl px-4 py-3">
          AI scoring failed: {scoreError}
        </div>
      )}

      {unscored > 0 && (
        <div className="mb-5 flex items-center gap-2 text-sm text-amber-700 bg-amber-50 border border-amber-100 rounded-xl px-4 py-3">
          <AlertTriangle size={15} />
          {unscored} task{unscored !== 1 ? 's have' : ' has'} no AI score yet — click &ldquo;Re-score with AI&rdquo; to prioritize.
        </div>
      )}

      {focusItems.length === 0 ? (
        <div className="text-center py-20 text-gray-400">
          <Sparkles size={36} className="mx-auto mb-3 opacity-20" />
          <p className="text-sm">No scored tasks yet.</p>
          <p className="text-xs mt-1">Click &ldquo;Re-score with AI&rdquo; after adding tasks.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {focusItems.map(({ task, reason }, i) => (
            <FocusCard
              key={task.id}
              rank={i + 1}
              task={task}
              reason={reason}
              streams={streams}
              onToggle={() => toggleDone(task)}
            />
          ))}
        </div>
      )}

      {allOpen.length > 0 && focusItems.length < allOpen.length && (
        <div className="mt-8">
          <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">
            Other open tasks ({allOpen.length - focusItems.length})
          </p>
          <div className="space-y-1.5">
            {allOpen
              .filter((t) => !focusItems.find((f) => f.task.id === t.id))
              .map((task) => (
                <SmallTaskRow key={task.id} task={task} onToggle={() => toggleDone(task)} />
              ))}
          </div>
        </div>
      )}
    </PageShell>
  )
}

function FocusCard({ rank, task, reason, streams, onToggle }: {
  rank: number; task: Task; reason: string; streams: WorkStream[]; onToggle: () => void
}) {
  const stream = streams.find((s) => s.id === task.stream_id)
  const priority = PRIORITY_CONFIG[task.priority]
  const overdue = isOverdue(task.due_date, task.status)

  return (
    <div className={cn(
      'bg-white rounded-xl border border-gray-100 p-4 flex gap-4 items-start hover:border-gray-200 transition-all',
      task.status === 'done' && 'opacity-50'
    )}>
      <div className="flex-shrink-0 flex flex-col items-center gap-1 pt-0.5">
        <span className="text-xs font-bold text-gray-300 w-5 text-center">#{rank}</span>
        <button onClick={onToggle} className="text-gray-300 hover:text-green-500 transition-colors">
          {task.status === 'done' ? <CheckCircle2 size={20} className="text-green-500" /> : <Circle size={20} />}
        </button>
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-start justify-between gap-2">
          <p className={cn('font-medium text-gray-900 text-sm', task.status === 'done' && 'line-through text-gray-400')}>
            {task.title}
          </p>
          {task.ai_score !== null && (
            <span className={cn(
              'flex-shrink-0 text-xs font-bold px-1.5 py-0.5 rounded-md',
              task.ai_score >= 8 ? 'bg-red-100 text-red-700' :
              task.ai_score >= 5 ? 'bg-orange-100 text-orange-700' :
              'bg-gray-100 text-gray-500'
            )}>
              {task.ai_score}/10
            </span>
          )}
        </div>
        {reason && (
          <p className="text-xs text-indigo-600 mt-1 flex items-start gap-1">
            <Sparkles size={11} className="mt-0.5 flex-shrink-0" /> {reason}
          </p>
        )}
        <div className="flex flex-wrap items-center gap-2 mt-2">
          <span className={cn('text-xs px-2 py-0.5 rounded-full font-medium', priority.color)}>
            {priority.label}
          </span>
          {stream && (
            <span className="text-xs text-gray-500 flex items-center gap-1">
              <span className="w-2 h-2 rounded-full" style={{ backgroundColor: stream.color }} />
              {stream.name}
            </span>
          )}
          {task.due_date && (
            <span className={cn('text-xs flex items-center gap-1', overdue ? 'text-red-500' : 'text-gray-400')}>
              <Clock size={10} /> {formatDate(task.due_date)}
            </span>
          )}
        </div>
      </div>
    </div>
  )
}

function SmallTaskRow({ task, onToggle }: { task: Task; onToggle: () => void }) {
  const priority = PRIORITY_CONFIG[task.priority]
  return (
    <div className="flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-white transition-colors group">
      <button onClick={onToggle} className="text-gray-300 hover:text-green-500 transition-colors flex-shrink-0">
        <Circle size={16} />
      </button>
      <span className="text-sm text-gray-700 flex-1 truncate">{task.title}</span>
      <span className={cn('text-xs px-1.5 py-0.5 rounded font-medium flex-shrink-0', priority.color)}>{priority.label}</span>
    </div>
  )
}

function PageShell({ children }: { children: React.ReactNode }) {
  return <div className="max-w-2xl mx-auto px-8 py-8">{children}</div>
}
