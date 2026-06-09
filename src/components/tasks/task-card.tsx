'use client'

import { useState } from 'react'
import { MoreHorizontal, Calendar, CheckCircle2, Circle, Pencil, Trash2 } from 'lucide-react'
import { cn, PRIORITY_CONFIG, STATUS_CONFIG, formatDate, isOverdue } from '@/lib/utils'
import { updateTask, deleteTask } from '@/lib/queries/tasks'
import type { Task } from '@/types'

interface TaskCardProps {
  task: Task
  onEdit: (task: Task) => void
  onRefresh: () => void
}

export function TaskCard({ task, onEdit, onRefresh }: TaskCardProps) {
  const [menuOpen, setMenuOpen] = useState(false)
  const priority = PRIORITY_CONFIG[task.priority]
  const status = STATUS_CONFIG[task.status]
  const overdue = isOverdue(task.due_date) && task.status !== 'done' && task.status !== 'cancelled'

  async function toggleDone() {
    const newStatus = task.status === 'done' ? 'todo' : 'done'
    await updateTask(task.id, { status: newStatus })
    onRefresh()
  }

  async function handleDelete() {
    if (!confirm('Delete this task?')) return
    await deleteTask(task.id)
    onRefresh()
  }

  return (
    <div className={cn(
      'group flex items-start gap-3 p-4 bg-white rounded-xl border border-gray-100 hover:border-gray-200 hover:shadow-sm transition-all',
      task.status === 'done' && 'opacity-60'
    )}>
      <button onClick={toggleDone} className="mt-0.5 flex-shrink-0 text-gray-300 hover:text-indigo-600 transition-colors">
        {task.status === 'done'
          ? <CheckCircle2 size={18} className="text-green-500" />
          : <Circle size={18} />
        }
      </button>

      <div className="flex-1 min-w-0">
        <p className={cn(
          'text-sm font-medium text-gray-900',
          task.status === 'done' && 'line-through text-gray-400'
        )}>
          {task.title}
        </p>
        {task.description && (
          <p className="mt-0.5 text-xs text-gray-500 line-clamp-2">{task.description}</p>
        )}
        <div className="flex flex-wrap items-center gap-2 mt-2">
          <span className={cn('text-xs px-2 py-0.5 rounded-full font-medium', priority.color)}>
            <span className={cn('inline-block w-1.5 h-1.5 rounded-full mr-1', priority.dot)} />
            {priority.label}
          </span>
          <span className={cn('text-xs px-2 py-0.5 rounded-full font-medium', status.color)}>
            {status.label}
          </span>
          {(task as any).project && (
            <span className="text-xs px-2 py-0.5 rounded-full font-medium bg-gray-100 text-gray-600 flex items-center gap-1">
              <span
                className="inline-block w-1.5 h-1.5 rounded-full"
                style={{ backgroundColor: (task as any).project.color }}
              />
              {(task as any).project.name}
            </span>
          )}
          {task.due_date && (
            <span className={cn(
              'text-xs flex items-center gap-1',
              overdue ? 'text-red-500' : 'text-gray-400'
            )}>
              <Calendar size={11} />
              {formatDate(task.due_date)}
            </span>
          )}
        </div>
      </div>

      <div className="relative flex-shrink-0">
        <button
          onClick={() => setMenuOpen(!menuOpen)}
          className="opacity-0 group-hover:opacity-100 text-gray-400 hover:text-gray-700 transition-all p-1 rounded"
        >
          <MoreHorizontal size={16} />
        </button>
        {menuOpen && (
          <>
            <div className="fixed inset-0 z-10" onClick={() => setMenuOpen(false)} />
            <div className="absolute right-0 top-7 z-20 bg-white border border-gray-100 rounded-lg shadow-lg py-1 w-36">
              <button
                onClick={() => { onEdit(task); setMenuOpen(false) }}
                className="flex items-center gap-2 w-full px-3 py-2 text-sm text-gray-700 hover:bg-gray-50"
              >
                <Pencil size={13} /> Edit
              </button>
              <button
                onClick={() => { handleDelete(); setMenuOpen(false) }}
                className="flex items-center gap-2 w-full px-3 py-2 text-sm text-red-600 hover:bg-red-50"
              >
                <Trash2 size={13} /> Delete
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  )
}
