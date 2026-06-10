import { type ClassValue, clsx } from 'clsx'
import { twMerge } from 'tailwind-merge'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export const PRIORITY_CONFIG = {
  high:   { label: 'High',   color: 'bg-red-100 text-red-700',      dot: 'bg-red-500'    },
  normal: { label: 'Normal', color: 'bg-blue-100 text-blue-700',    dot: 'bg-blue-400'   },
  low:    { label: 'Low',    color: 'bg-gray-100 text-gray-500',    dot: 'bg-gray-300'   },
} as const

export const STATUS_CONFIG = {
  todo:        { label: 'To Do',       color: 'bg-gray-100 text-gray-600'    },
  in_progress: { label: 'In Progress', color: 'bg-blue-100 text-blue-700'    },
  done:        { label: 'Done',        color: 'bg-green-100 text-green-700'  },
  blocked:     { label: 'Blocked',     color: 'bg-orange-100 text-orange-700' },
} as const

export const STREAM_COLORS = [
  '#6366f1', '#8b5cf6', '#ec4899', '#ef4444',
  '#f97316', '#eab308', '#22c55e', '#14b8a6',
  '#06b6d4', '#3b82f6',
]

export function formatDate(dateStr: string | null) {
  if (!dateStr) return null
  return new Date(dateStr).toLocaleDateString('en-US', {
    month: 'short', day: 'numeric', year: 'numeric',
  })
}

export function isOverdue(dateStr: string | null, status: string) {
  if (!dateStr) return false
  if (status === 'done' || status === 'cancelled') return false
  return dateStr < new Date().toISOString().slice(0, 10)
}

export function daysUntil(dateStr: string | null): number | null {
  if (!dateStr) return null
  const diff = new Date(dateStr).getTime() - Date.now()
  return Math.ceil(diff / 86_400_000)
}
