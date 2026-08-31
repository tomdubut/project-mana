'use client'

import { useState, useEffect, useRef } from 'react'
import { X, Trash2, Sparkles, RefreshCw, Pencil } from 'lucide-react'
import { cn, PRIORITY_CONFIG, STATUS_CONFIG, formatDate } from '@/lib/utils'
import type { Task, WorkStream, TaskStatus, TaskPriority } from '@/types'

interface TaskPanelProps {
  task: Task | null
  streams: WorkStream[]
  onClose: () => void
  onUpdate: (id: string, updates: Partial<Task>) => Promise<void>
  onDelete: (id: string) => void
}

function ClickToEdit({ value, onSave, placeholder = 'Click to edit', multiline = false }: {
  value: string
  onSave: (val: string) => void
  placeholder?: string
  multiline?: boolean
}) {
  const [editing, setEditing] = useState(false)
  const [draft, setDraft] = useState(value)
  const ref = useRef<HTMLInputElement & HTMLTextAreaElement>(null)

  useEffect(() => { setDraft(value) }, [value])
  useEffect(() => { if (editing) ref.current?.focus() }, [editing])

  function commit() {
    setEditing(false)
    onSave(draft)
  }

  if (editing) {
    const shared = {
      value: draft,
      onChange: (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => setDraft(e.target.value),
      onBlur: commit,
      onKeyDown: (e: React.KeyboardEvent) => {
        if (e.key === 'Escape') { setDraft(value); setEditing(false) }
        if (!multiline && e.key === 'Enter') commit()
      },
      className: 'w-full text-sm text-gray-900 border border-indigo-300 rounded-lg px-2 py-1.5 focus:outline-none focus:ring-1 focus:ring-indigo-500 bg-white resize-none',
    }
    return multiline
      ? <textarea ref={ref as any} {...shared} rows={4} />
      : <input ref={ref as any} {...shared} />
  }

  return (
    <button
      onClick={() => setEditing(true)}
      className="w-full text-left text-sm group flex items-start gap-1.5"
    >
      {value ? (
        <span className="text-gray-800 flex-1 whitespace-pre-wrap">{value}</span>
      ) : (
        <span className="text-gray-300 italic flex-1">{placeholder}</span>
      )}
      <Pencil size={11} className="text-gray-300 group-hover:text-indigo-400 transition-colors flex-shrink-0 mt-0.5" />
    </button>
  )
}

export function TaskPanel({ task, streams, onClose, onUpdate, onDelete }: TaskPanelProps) {
  const [editingTitle, setEditingTitle] = useState(false)
  const [titleDraft, setTitleDraft] = useState('')
  const titleRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (task) {
      setTitleDraft(task.title)
      setEditingTitle(false)
    }
  }, [task?.id])

  useEffect(() => { if (editingTitle) titleRef.current?.focus() }, [editingTitle])

  if (!task) return null

  const stream = streams.find((s) => s.id === task.stream_id)

  function saveTitle() {
    const trimmed = titleDraft.trim()
    setEditingTitle(false)
    if (!trimmed || trimmed === task!.title) { setTitleDraft(task!.title); return }
    onUpdate(task!.id, { title: trimmed })
  }

  return (
    <>
      <div className="fixed inset-0 z-20 bg-black/40 sm:hidden" onClick={onClose} />

      <div key={task.id} className={cn(
        'fixed right-0 top-0 h-full w-full sm:w-[420px] bg-white border-l border-gray-200 shadow-xl z-30',
        'flex flex-col transition-transform duration-300 ease-in-out',
        task ? 'translate-x-0' : 'translate-x-full'
      )}>
        {/* Header — click title to edit */}
        <div className="flex items-center gap-2 px-4 py-3 border-b border-gray-100">
          <div className="flex-1 min-w-0">
            {editingTitle ? (
              <input
                ref={titleRef}
                value={titleDraft}
                onChange={(e) => setTitleDraft(e.target.value)}
                onBlur={saveTitle}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') saveTitle()
                  if (e.key === 'Escape') { setTitleDraft(task.title); setEditingTitle(false) }
                }}
                className="w-full text-base font-semibold text-gray-900 border-0 border-b-2 border-indigo-400 focus:outline-none bg-transparent py-0.5"
              />
            ) : (
              <button
                onClick={() => setEditingTitle(true)}
                className="text-left w-full group flex items-center gap-1.5"
              >
                <h2 className="text-base font-semibold text-gray-900 truncate flex-1">{task.title}</h2>
                <Pencil size={12} className="text-gray-300 group-hover:text-indigo-400 transition-colors flex-shrink-0" />
              </button>
            )}
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 transition-colors p-1 flex-shrink-0">
            <X size={18} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-4 py-4 space-y-5">

          {/* Status */}
          <div>
            <p className="text-xs font-medium text-gray-500 mb-2">Status</p>
            <div className="flex flex-wrap gap-1.5">
              {(Object.keys(STATUS_CONFIG) as TaskStatus[]).map((s) => {
                const conf = STATUS_CONFIG[s]
                const active = task.status === s
                return (
                  <button key={s} onClick={() => onUpdate(task.id, { status: s })}
                    className={cn(
                      'text-xs px-2.5 py-1 rounded-full font-medium transition-all border',
                      active ? cn(conf.color, 'border-current ring-2 ring-offset-1 ring-current/30')
                             : 'bg-gray-100 text-gray-400 border-transparent hover:bg-gray-200 hover:text-gray-600'
                    )}>
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
                  <button key={p} onClick={() => onUpdate(task.id, { priority: p })}
                    className={cn(
                      'text-xs px-2.5 py-1 rounded-full font-medium transition-all border',
                      active ? cn(conf.color, 'border-current ring-2 ring-offset-1 ring-current/30')
                             : 'bg-gray-100 text-gray-400 border-transparent hover:bg-gray-200 hover:text-gray-600'
                    )}>
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
            <ClickToEditDate
              value={task.due_date ?? ''}
              onSave={(val) => onUpdate(task.id, { due_date: val || null })}
            />

            {/* Stream */}
            <ClickToEditStream
              value={task.stream_id ?? ''}
              streams={streams}
              onSave={(val) => onUpdate(task.id, { stream_id: val || null })}
            />

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
            <ClickToEdit
              value={task.description ?? ''}
              placeholder="Click to add a description…"
              multiline
              onSave={(val) => onUpdate(task.id, { description: val || null })}
            />
          </div>

          {/* AI */}
          {task.ai_score !== null && (
            <div className="bg-indigo-50 border border-indigo-100 rounded-xl p-3 space-y-1.5">
              <div className="flex items-center gap-1.5">
                <Sparkles size={13} className="text-indigo-500" />
                <span className="text-xs font-medium text-indigo-700">AI Score</span>
                <span className="ml-auto text-xs font-bold text-indigo-700 bg-indigo-100 px-2 py-0.5 rounded-full">{task.ai_score}</span>
              </div>
              {task.ai_reason && <p className="text-xs text-indigo-600 leading-relaxed">{task.ai_reason}</p>}
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

function ClickToEditDate({ value, onSave }: { value: string; onSave: (val: string) => void }) {
  const [editing, setEditing] = useState(false)
  const [draft, setDraft] = useState(value)
  const ref = useRef<HTMLInputElement>(null)

  useEffect(() => { setDraft(value) }, [value])
  useEffect(() => { if (editing) ref.current?.focus() }, [editing])

  function commit(val: string) { setEditing(false); onSave(val) }

  return (
    <div className="flex items-center gap-3">
      <span className="text-xs text-gray-400 w-20 flex-shrink-0">Due date</span>
      {editing ? (
        <input
          ref={ref}
          type="date"
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onBlur={(e) => commit(e.target.value)}
          className="text-sm text-gray-800 border border-indigo-300 rounded-lg px-2 py-1 focus:outline-none focus:ring-1 focus:ring-indigo-500"
        />
      ) : (
        <button onClick={() => setEditing(true)} className="flex items-center gap-1.5 group">
          <span className={cn('text-sm', value ? 'text-gray-800' : 'text-gray-300 italic')}>
            {value ? formatDate(value) : 'Click to set'}
          </span>
          <Pencil size={11} className="text-gray-300 group-hover:text-indigo-400 transition-colors" />
        </button>
      )}
    </div>
  )
}

function ClickToEditStream({ value, streams, onSave }: { value: string; streams: WorkStream[]; onSave: (val: string) => void }) {
  const [editing, setEditing] = useState(false)
  const ref = useRef<HTMLSelectElement>(null)
  const stream = streams.find((s) => s.id === value)

  useEffect(() => { if (editing) ref.current?.focus() }, [editing])

  return (
    <div className="flex items-center gap-3">
      <span className="text-xs text-gray-400 w-20 flex-shrink-0">Stream</span>
      {editing ? (
        <select
          ref={ref}
          defaultValue={value}
          onChange={(e) => { onSave(e.target.value); setEditing(false) }}
          onBlur={() => setEditing(false)}
          className="text-sm text-gray-800 border border-indigo-300 rounded-lg px-2 py-1 focus:outline-none focus:ring-1 focus:ring-indigo-500"
        >
          <option value="">No stream</option>
          {streams.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
        </select>
      ) : (
        <button onClick={() => setEditing(true)} className="flex items-center gap-1.5 group">
          {stream ? (
            <span className="flex items-center gap-1.5 text-sm text-gray-800">
              <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ backgroundColor: stream.color }} />
              {stream.name}
            </span>
          ) : (
            <span className="text-sm text-gray-300 italic">Click to set</span>
          )}
          <Pencil size={11} className="text-gray-300 group-hover:text-indigo-400 transition-colors" />
        </button>
      )}
    </div>
  )
}
