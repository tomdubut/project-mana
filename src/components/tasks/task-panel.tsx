'use client'

import { useState, useEffect } from 'react'
import { X, Trash2, Sparkles } from 'lucide-react'
import { cn, PRIORITY_CONFIG, STATUS_CONFIG, formatDate } from '@/lib/utils'
import type { Task, WorkStream, Goal, TaskStatus, TaskPriority } from '@/types'

interface TaskPanelProps {
  task: Task | null
  streams: WorkStream[]
  goals: Goal[]
  onClose: () => void
  onUpdate: (id: string, updates: Partial<Task>) => Promise<void>
  onDelete: (id: string) => void
}

export function TaskPanel({ task, streams, goals, onClose, onUpdate, onDelete }: TaskPanelProps) {
  const [editing, setEditing] = useState(false)
  const [draft, setDraft] = useState({
    title: '',
    description: '',
    due_date: '',
    stream_id: '',
    goal_id: '',
  })

  useEffect(() => {
    if (task) {
      setDraft({
        title: task.title,
        description: task.description ?? '',
        due_date: task.due_date ?? '',
        stream_id: task.stream_id ?? '',
        goal_id: task.goal_id ?? '',
      })
      setEditing(false)
    }
  }, [task?.id])

  if (!task) return null

  const stream = streams.find((s) => s.id === task.stream_id)
  const goal = goals.find((g) => g.id === task.goal_id)

  async function handleSave() {
    if (!task) return
    await onUpdate(task.id, {
      title: draft.title.trim() || task.title,
      description: draft.description || null,
      due_date: draft.due_date || null,
      stream_id: draft.stream_id || null,
      goal_id: draft.goal_id || null,
    })
    setEditing(false)
  }

  function handleCancel() {
    if (!task) return
    setDraft({
      title: task.title,
      description: task.description ?? '',
      due_date: task.due_date ?? '',
      stream_id: task.stream_id ?? '',
      goal_id: task.goal_id ?? '',
    })
    setEditing(false)
  }

  return (
    <>
      {/* Mobile overlay */}
      <div
        className="fixed inset-0 z-20 bg-black/40 sm:hidden"
        onClick={onClose}
      />

      {/* Panel */}
      <div
        className={cn(
          'fixed right-0 top-0 h-full w-full sm:w-[420px] bg-white border-l border-gray-200 shadow-xl z-30',
          'flex flex-col transition-transform duration-300 ease-in-out',
          task ? 'translate-x-0' : 'translate-x-full'
        )}
      >
        {/* Header */}
        <div className="flex items-center gap-3 px-4 py-3 border-b border-gray-100">
          <div className="flex-1 min-w-0">
            {editing ? (
              <input
                value={draft.title}
                onChange={(e) => setDraft({ ...draft, title: e.target.value })}
                className="w-full text-base font-semibold text-gray-900 border-0 border-b border-indigo-300 focus:outline-none focus:border-indigo-500 bg-transparent py-0.5"
                autoFocus
              />
            ) : (
              <h2 className="text-base font-semibold text-gray-900 truncate">{task.title}</h2>
            )}
          </div>
          <div className="flex items-center gap-2 flex-shrink-0">
            {editing ? (
              <>
                <button
                  onClick={handleSave}
                  className="text-xs px-2.5 py-1 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors font-medium"
                >
                  Save
                </button>
                <button
                  onClick={handleCancel}
                  className="text-xs px-2.5 py-1 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors font-medium"
                >
                  Cancel
                </button>
              </>
            ) : (
              <button
                onClick={() => setEditing(true)}
                className="text-xs px-2.5 py-1 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors font-medium"
              >
                Edit
              </button>
            )}
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600 transition-colors p-1"
            >
              <X size={18} />
            </button>
          </div>
        </div>

        {/* Scrollable body */}
        <div className="flex-1 overflow-y-auto px-4 py-4 space-y-5">
          {/* Status row */}
          <div>
            <p className="text-xs font-medium text-gray-500 mb-2">Status</p>
            <div className="flex flex-wrap gap-1.5">
              {(Object.keys(STATUS_CONFIG) as TaskStatus[]).map((s) => {
                const conf = STATUS_CONFIG[s]
                const active = task.status === s
                return (
                  <button
                    key={s}
                    onClick={() => onUpdate(task.id, { status: s })}
                    className={cn(
                      'text-xs px-2.5 py-1 rounded-full font-medium transition-all border',
                      active
                        ? 'bg-indigo-600 text-white border-indigo-600'
                        : cn(conf.color, 'border-transparent hover:border-gray-300')
                    )}
                  >
                    {conf.label}
                  </button>
                )
              })}
            </div>
          </div>

          {/* Priority row */}
          <div>
            <p className="text-xs font-medium text-gray-500 mb-2">Priority</p>
            <div className="flex flex-wrap gap-1.5">
              {(Object.keys(PRIORITY_CONFIG) as TaskPriority[]).map((p) => {
                const conf = PRIORITY_CONFIG[p]
                const active = task.priority === p
                return (
                  <button
                    key={p}
                    onClick={() => onUpdate(task.id, { priority: p })}
                    className={cn(
                      'text-xs px-2.5 py-1 rounded-full font-medium transition-all border',
                      active
                        ? 'bg-indigo-600 text-white border-indigo-600'
                        : cn(conf.color, 'border-transparent hover:border-gray-300')
                    )}
                  >
                    {conf.label}
                  </button>
                )
              })}
            </div>
          </div>

          {/* Details */}
          <div className="space-y-3">
            <p className="text-xs font-medium text-gray-500">Details</p>

            {/* Due date */}
            <div className="flex items-center gap-3">
              <span className="text-xs text-gray-400 w-20 flex-shrink-0">Due date</span>
              {editing ? (
                <input
                  type="date"
                  value={draft.due_date}
                  onChange={(e) => setDraft({ ...draft, due_date: e.target.value })}
                  className="text-sm text-gray-800 border border-gray-200 rounded-lg px-2 py-1 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                />
              ) : (
                <span className="text-sm text-gray-700">{formatDate(task.due_date) ?? <span className="text-gray-400 italic">None</span>}</span>
              )}
            </div>

            {/* Stream */}
            <div className="flex items-center gap-3">
              <span className="text-xs text-gray-400 w-20 flex-shrink-0">Stream</span>
              {editing ? (
                <select
                  value={draft.stream_id}
                  onChange={(e) => setDraft({ ...draft, stream_id: e.target.value })}
                  className="text-sm text-gray-800 border border-gray-200 rounded-lg px-2 py-1 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                >
                  <option value="">No stream</option>
                  {streams.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
                </select>
              ) : stream ? (
                <span className="text-sm text-gray-700 flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ backgroundColor: stream.color }} />
                  {stream.name}
                </span>
              ) : (
                <span className="text-sm text-gray-400 italic">None</span>
              )}
            </div>

            {/* Goal */}
            <div className="flex items-center gap-3">
              <span className="text-xs text-gray-400 w-20 flex-shrink-0">Goal</span>
              {editing ? (
                <select
                  value={draft.goal_id}
                  onChange={(e) => setDraft({ ...draft, goal_id: e.target.value })}
                  className="text-sm text-gray-800 border border-gray-200 rounded-lg px-2 py-1 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                >
                  <option value="">No goal</option>
                  {goals.map((g) => <option key={g.id} value={g.id}>{g.title}</option>)}
                </select>
              ) : goal ? (
                <span className="text-sm text-gray-700">{goal.title}</span>
              ) : (
                <span className="text-sm text-gray-400 italic">None</span>
              )}
            </div>
          </div>

          {/* Description */}
          <div>
            <p className="text-xs font-medium text-gray-500 mb-2">Description</p>
            {editing ? (
              <textarea
                value={draft.description}
                onChange={(e) => setDraft({ ...draft, description: e.target.value })}
                placeholder="Add a description…"
                rows={4}
                className="w-full text-sm text-gray-800 border border-gray-200 rounded-xl px-3 py-2 focus:outline-none focus:ring-1 focus:ring-indigo-500 resize-none"
              />
            ) : task.description ? (
              <p className="text-sm text-gray-700 whitespace-pre-wrap">{task.description}</p>
            ) : (
              <p className="text-sm text-gray-400 italic">No description</p>
            )}
          </div>

          {/* AI section */}
          {task.ai_score !== null && (
            <div className="bg-indigo-50 border border-indigo-100 rounded-xl p-3 space-y-1.5">
              <div className="flex items-center gap-1.5">
                <Sparkles size={13} className="text-indigo-500" />
                <span className="text-xs font-medium text-indigo-700">AI Score</span>
                <span className="ml-auto text-xs font-bold text-indigo-700 bg-indigo-100 px-2 py-0.5 rounded-full">
                  {task.ai_score}
                </span>
              </div>
              {task.ai_reason && (
                <p className="text-xs text-indigo-600 leading-relaxed">{task.ai_reason}</p>
              )}
            </div>
          )}
        </div>

        {/* Footer: Delete */}
        <div className="px-4 py-3 border-t border-gray-100">
          <button
            onClick={() => { onDelete(task.id); onClose() }}
            className="flex items-center gap-2 text-sm text-red-600 hover:text-red-700 hover:bg-red-50 px-3 py-2 rounded-lg transition-colors w-full"
          >
            <Trash2 size={14} />
            Delete task
          </button>
        </div>
      </div>
    </>
  )
}
