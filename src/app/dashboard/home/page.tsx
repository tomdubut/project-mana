'use client'

import { useEffect, useState, useCallback } from 'react'
import { CheckCircle2, Circle, AlertTriangle, Clock, Layers, Target, Sparkles, TrendingUp } from 'lucide-react'
import Link from 'next/link'
import { getTasks, updateTask, deleteTask } from '@/lib/queries/tasks'
import { getStreams } from '@/lib/queries/streams'
import { cn, PRIORITY_CONFIG, formatDate, isOverdue } from '@/lib/utils'
import { useWorkspace } from '@/lib/workspace-context'
import { TaskPanel } from '@/components/tasks/task-panel'
import type { Task, WorkStream } from '@/types'
import { Breadcrumb } from '@/components/ui/breadcrumb'

export default function HomePage() {
  const [tasks, setTasks] = useState<Task[]>([])
  const [streams, setStreams] = useState<WorkStream[]>([])
  const [loading, setLoading] = useState(true)
  const [panelTask, setPanelTask] = useState<Task | null>(null)
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

  const open = tasks.filter((t) => t.status !== 'done')
  const overdue = open.filter((t) => isOverdue(t.due_date, t.status))
  const blocked = open.filter((t) => t.status === 'blocked')

  // Done this week
  const weekAgo = new Date()
  weekAgo.setDate(weekAgo.getDate() - 7)
  const doneThisWeek = tasks.filter(
    (t) => t.status === 'done' && t.completed_at && new Date(t.completed_at) >= weekAgo
  )

  // Top AI-scored tasks
  const focus = [...open]
    .filter((t) => t.ai_score !== null)
    .sort((a, b) => (b.ai_score ?? 0) - (a.ai_score ?? 0))
    .slice(0, 3)

  // Upcoming: due within 7 days, not overdue
  const today = new Date().toISOString().slice(0, 10)
  const in7 = new Date()
  in7.setDate(in7.getDate() + 7)
  const upcoming = open
    .filter((t) => t.due_date && t.due_date >= today && t.due_date <= in7.toISOString().slice(0, 10))
    .sort((a, b) => (a.due_date ?? '').localeCompare(b.due_date ?? ''))
    .slice(0, 5)

  // Stream health
  const streamHealth = streams.map((s) => {
    const st = tasks.filter((t) => t.stream_id === s.id)
    const done = st.filter((t) => t.status === 'done').length
    const total = st.length
    const bl = st.filter((t) => t.status === 'blocked').length
    const progress = total > 0 ? Math.round((done / total) * 100) : 0
    return { stream: s, total, done, blocked: bl, open: total - done, progress }
  }).filter((s) => s.total > 0)

  const greeting = () => {
    const h = new Date().getHours()
    if (h < 12) return 'Good morning'
    if (h < 18) return 'Good afternoon'
    return 'Good evening'
  }

  const dateStr = new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })

  async function toggleDone(task: Task) {
    await updateTask(task.id, { status: task.status === 'done' ? 'todo' : 'done' })
    load()
  }

  if (loading) return (
    <div className="max-w-4xl mx-auto px-4 sm:px-8 py-8 text-sm text-gray-400">Loading…</div>
  )

  return (
    <>
    <div className={cn('transition-all duration-300 ease-in-out', panelTask ? 'sm:mr-[420px]' : '')}>
    <div className="max-w-4xl mx-auto px-4 sm:px-8 py-8 space-y-8">

      {/* Header */}
      <div>
        <Breadcrumb items={[
          { label: activeWorkspace?.name ?? 'Workspace', color: activeWorkspace?.color },
          { label: 'Home' },
        ]} className="mb-2" />
        <h1 className="text-2xl font-bold text-gray-900">{greeting()}</h1>
        <p className="text-sm text-gray-400 mt-0.5">{dateStr}</p>
      </div>

      {/* Stats row */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <StatCard label="Open tasks" value={open.length} icon={<Circle size={15} className="text-blue-500" />} accent="blue" />
        <StatCard label="Overdue" value={overdue.length} icon={<AlertTriangle size={15} className="text-red-500" />} accent={overdue.length > 0 ? 'red' : 'gray'} />
        <StatCard label="Blocked" value={blocked.length} icon={<AlertTriangle size={15} className="text-orange-500" />} accent={blocked.length > 0 ? 'orange' : 'gray'} />
        <StatCard label="Done this week" value={doneThisWeek.length} icon={<CheckCircle2 size={15} className="text-green-500" />} accent="green" />
      </div>

      {/* Overdue banner */}
      {overdue.length > 0 && (
        <div className="bg-red-50 border border-red-100 rounded-xl px-4 py-3">
          <p className="text-sm font-semibold text-red-700 mb-2 flex items-center gap-2">
            <AlertTriangle size={14} /> {overdue.length} overdue task{overdue.length !== 1 ? 's' : ''}
          </p>
          <div className="space-y-1.5">
            {overdue.slice(0, 4).map((task) => (
              <TaskLine key={task.id} task={task} onToggle={() => toggleDone(task)} onOpen={() => setPanelTask(task)} showDate />
            ))}
            {overdue.length > 4 && (
              <Link href="/dashboard/tasks" className="text-xs text-red-500 hover:underline">
                +{overdue.length - 4} more
              </Link>
            )}
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">

        {/* Today's focus */}
        <section>
          <SectionHeader icon={<Sparkles size={14} className="text-indigo-500" />} label="Today's Focus" href="/dashboard/todo" />
          {focus.length === 0 ? (
            <Empty text="No scored tasks — run AI scoring from the To-Do page." />
          ) : (
            <div className="space-y-1.5">
              {focus.map((task, i) => (
                <div key={task.id} onClick={() => setPanelTask(task)} className="flex items-center gap-3 px-3 py-2.5 bg-white rounded-xl border border-gray-100 hover:border-gray-200 transition-all cursor-pointer">
                  <span className="text-xs font-bold text-gray-300 w-4 flex-shrink-0">#{i + 1}</span>
                  <button onClick={(e) => { e.stopPropagation(); toggleDone(task) }} className="flex-shrink-0 text-gray-300 hover:text-green-500 transition-colors">
                    <Circle size={16} />
                  </button>
                  <span className="text-sm text-gray-800 flex-1 truncate">{task.title}</span>
                  {task.ai_score !== null && (
                    <span className={cn(
                      'text-xs font-bold px-1.5 py-0.5 rounded flex-shrink-0',
                      task.ai_score >= 8 ? 'bg-red-100 text-red-700' :
                      task.ai_score >= 5 ? 'bg-orange-100 text-orange-700' :
                      'bg-gray-100 text-gray-500'
                    )}>{task.ai_score}</span>
                  )}
                </div>
              ))}
            </div>
          )}
        </section>

        {/* Upcoming deadlines */}
        <section>
          <SectionHeader icon={<Clock size={14} className="text-amber-500" />} label="Due soon" href="/dashboard/tasks" />
          {upcoming.length === 0 ? (
            <Empty text="Nothing due in the next 7 days." />
          ) : (
            <div className="space-y-1.5">
              {upcoming.map((task) => (
                <TaskLine key={task.id} task={task} onToggle={() => toggleDone(task)} onOpen={() => setPanelTask(task)} showDate />
              ))}
            </div>
          )}
        </section>

      </div>

      {/* Stream health */}
      {streamHealth.length > 0 && (
        <section>
          <SectionHeader icon={<Layers size={14} className="text-gray-400" />} label="Stream health" href="/dashboard/strategy" />
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {streamHealth.map(({ stream, progress, open, blocked }) => (
              <Link
                key={stream.id}
                href={`/dashboard/streams/${stream.id}`}
                className="flex items-center gap-3 px-4 py-3 bg-white rounded-xl border border-gray-100 hover:border-gray-200 transition-all group"
              >
                <span className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ backgroundColor: stream.color }} />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-800 truncate group-hover:text-indigo-600 transition-colors">{stream.name}</p>
                  <div className="flex items-center gap-2 mt-1">
                    <div className="flex-1 bg-gray-100 rounded-full h-1">
                      <div
                        className={cn('h-1 rounded-full transition-all', progress === 100 ? 'bg-green-500' : 'bg-indigo-500')}
                        style={{ width: `${progress}%` }}
                      />
                    </div>
                    <span className="text-xs text-gray-400 flex-shrink-0">{progress}%</span>
                  </div>
                </div>
                <div className="flex items-center gap-2 flex-shrink-0 text-xs">
                  <span className="text-gray-400">{open} open</span>
                  {blocked > 0 && (
                    <span className="text-orange-500 font-medium">{blocked} blocked</span>
                  )}
                </div>
              </Link>
            ))}
          </div>
        </section>
      )}

    </div>
    </div>
    <TaskPanel
      task={panelTask}
      streams={streams}
      onClose={() => setPanelTask(null)}
      onUpdate={async (id, updates) => { await updateTask(id, updates); setPanelTask((prev) => prev ? { ...prev, ...updates } : null); load() }}
      onDelete={async (id) => { await deleteTask(id); load(); setPanelTask(null) }}
    />
    </>
  )
}

function StatCard({ label, value, icon, accent }: {
  label: string; value: number; icon: React.ReactNode; accent: 'blue' | 'red' | 'orange' | 'green' | 'gray'
}) {
  const colors = {
    blue: 'text-blue-600', red: 'text-red-600', orange: 'text-orange-500',
    green: 'text-green-600', gray: 'text-gray-400',
  }
  return (
    <div className="bg-white rounded-xl border border-gray-100 px-4 py-3">
      <div className="flex items-center gap-1.5 mb-1">{icon}<p className="text-xs text-gray-400">{label}</p></div>
      <p className={cn('text-2xl font-bold', colors[accent])}>{value}</p>
    </div>
  )
}

function SectionHeader({ icon, label, href }: { icon: React.ReactNode; label: string; href: string }) {
  return (
    <div className="flex items-center justify-between mb-3">
      <h2 className="text-sm font-semibold text-gray-700 flex items-center gap-1.5">{icon}{label}</h2>
      <Link href={href} className="text-xs text-indigo-500 hover:text-indigo-700 transition-colors">View all</Link>
    </div>
  )
}

function TaskLine({ task, onToggle, onOpen, showDate }: { task: Task; onToggle: () => void; onOpen: () => void; showDate?: boolean }) {
  const priority = PRIORITY_CONFIG[task.priority]
  const overdue = isOverdue(task.due_date, task.status)
  return (
    <div onClick={onOpen} className="flex items-center gap-2.5 px-3 py-2 bg-white rounded-xl border border-gray-100 hover:border-gray-200 transition-all cursor-pointer">
      <button onClick={(e) => { e.stopPropagation(); onToggle() }} className="flex-shrink-0 text-gray-300 hover:text-green-500 transition-colors">
        <Circle size={15} />
      </button>
      <span className="text-sm text-gray-800 flex-1 truncate">{task.title}</span>
      <span className={cn('text-xs px-1.5 py-0.5 rounded font-medium flex-shrink-0', priority.color)}>{priority.label}</span>
      {showDate && task.due_date && (
        <span className={cn('text-xs flex-shrink-0 font-medium', overdue ? 'text-red-500' : 'text-gray-400')}>
          {formatDate(task.due_date)}
        </span>
      )}
    </div>
  )
}

function Empty({ text }: { text: string }) {
  return <p className="text-sm text-gray-400 italic py-3">{text}</p>
}
