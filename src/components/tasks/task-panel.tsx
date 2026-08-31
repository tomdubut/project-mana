'use client'

import { useState, useEffect, useRef } from 'react'
import { X, Trash2, Sparkles, RefreshCw } from 'lucide-react'
import { cn, PRIORITY_CONFIG, STATUS_CONFIG, formatDate } from '@/lib/utils'
import type { Task, WorkStream, TaskStatus, TaskPriority } from '@/types'

interface TaskPanelProps {
  task: Task | null
  streams: WorkStream[]
  onClose: () => void
  onUpdate: (id: string, updates: Partial<Task>) => Promise<void>
  onDelete: (id: string) => void
}

export function TaskPanel({ task, streams, onClose, onUpdate, onDelete }: TaskPanelProps) {
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [dueDate, setDueDate] = useState('')
  const [streamId, setStreamId] = useState('')
  const titleRef = useRef<HTMLInputElement>(null)
  const savedTitle = useRef('')

  useEffect(() => {
    if (task) {
      setTitle(task.title)
      setDescription(task.description ?? '')
      setDueDate(task.due_date ?? '')
      setStreamId(task.stream_id ?? '')
      savedTitle.current = task.title
    }
  }, [task?.id])

  if (!task) return null

  const stream = streams.find((s) => s.id === task.stream_id)

  function saveTitle() {
    const trimmed = title.trim()
    if (!trimmed) { setTitle(savedTitle.current); return }
    if (trimmed === savedTitle.current) return
    savedTitle.current = trimmed
    onUpdate(task!.id, { title: trimmed })
  }

  function saveDescription(val: string) {
    if (val === (task!.description ?? '')) return
    onUpdate(task!.id, { description: val || null })
  }

  function saveDueDate(val: string) {
    if (val === (task!.due_date ?? '')) return
    onUpdate(task!.id, { due_date: val || null })
  }

  function saveStream(val: string) {
    if (val === (task!.stream_id ?? '')) return
    onUpdate(task!.id, { stream_id: val || null })
  }

  return (
    <>
      {/* Mobile overlay */}
      <div className="fixed inset-0 z-20 bg-black/40 sm:hidden" onClick={onClose} />

      {/* Panel */}
      <div className={cn(
        'fixed right-0 top-0 h-full w-full sm:w-[420px] bg-white border-l border-gray-200 shadow-xl z-30',
        'flex flex-col transition-transform duration-300 ease-in-out',
        task ? 'translate-x-0' : 'translate-x-full'
      )}>
        {/* Header — editable title */}
        <div className="flex items-center gap-2 px-4 py-3 border-b border-gray-100">
          <input
            ref={titleRef}
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            onBlur={saveTitle}
            onKeyDown={(e) => { if (e.key === 'Enter') titleRef.current?.blur() }}
            className="flex-1 min-w-0 text-base font-semibold text-gray-900 bg-transparent border-0 focus:outline-none focus:border-b-2 focus:border-indigo-400 py-0.5 truncate"
            placeholder="Task title"
          />
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 transition-colors p-1 flex-shrink-0">
            <X size={18} />
          </button>
        </div>

        {/* Scrollable body */}
        <div className="flex-1 overflow-y-auto px-4 py-4 space-y-5">

          {/* Status */}
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
                        ? cn(conf.color, 'border-current ring-2 ring-offset-1 ring-current/30')
                        : 'bg-gray-100 text-gray-400 border-transparent hover:bg-gray-200 hover:text-gray-600'
                    )}
                  >
                    {conf.label}
                  </button>
                )
              })}
            </div>
          </div>

          {/* Priority */}
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
                        ? cn(conf.color, 'border-current ring-2 ring-offset-1 ring-current/30')
                        : 'bg-gray-100 text-gray-400 border-transparent hover:bg-gray-200 hover:text-gray-600'
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
              <input
                type="date"
                value={dueDate}
                onChange={(e) => setDueDate(e.target.value)}
                onBlur={(e) => saveDueDate(e.target.value)}
                className="text-sm text-gray-800 border border-gray-200 rounded-lg px-2 py-1 focus:outline-none focus:ring-1 focus:ring-indigo-500"
              />
              {dueDate && (
                <button
                  onClick={() => { setDueDate(''); saveDueDate('') }}
                  className="text-xs text-gray-300 hover:text-gray-500"
                >
                  <X size={12} />
                </button>
              )}
            </div>

            {/* Stream */}
            <div className="flex items-center gap-3">
              <span className="text-xs text-gray-400 w-20 flex-shrink-0">Stream</span>
              <select
                value={streamId}
                onChange={(e) => { setStreamId(e.target.value); saveStream(e.target.value) }}
                className="text-sm text-gray-800 border border-gray-200 rounded-lg px-2 py-1 focus:outline-none focus:ring-1 focus:ring-indigo-500"
              >
                <option value="">No stream</option>
                {streams.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
              </select>
            </div>

            {/* Recurrence */}
            {task.recurrence && task.recurrence !== 'none' && (
              <div className="flex items-center gap-3">
                <span className="text-xs text-gray-400 w-20 flex-shrink-0">Repeat</span>
                <span className="flex items-center gap-1 text-xs text-indigo-500 font-medium">
                  <RefreshCw size={11} /> {task.recurrence}
                </span>
              </div>
            )}
          </div>

          {/* Description */}
          <div>
            <p className="text-xs font-medium text-gray-500 mb-2">Description</p>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              onBlur={(e) => saveDescription(e.target.value)}
              placeholder="Add a description…"
              rows={4}
              className="w-full text-sm text-gray-800 border border-gray-200 rounded-xl px-3 py-2 focus:outline-none focus:ring-1 focus:ring-indigo-500 resize-none placeholder-gray-300"
            />
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

        {/* Footer */}
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
