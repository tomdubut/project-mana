import { type ClassValue, clsx } from 'clsx'
import { twMerge } from 'tailwind-merge'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export const PRIORITY_CONFIG = {
  low: { label: 'Low', color: 'bg-slate-100 text-slate-600', dot: 'bg-slate-400' },
  medium: { label: 'Medium', color: 'bg-blue-100 text-blue-700', dot: 'bg-blue-400' },
  high: { label: 'High', color: 'bg-orange-100 text-orange-700', dot: 'bg-orange-400' },
  urgent: { label: 'Urgent', color: 'bg-red-100 text-red-700', dot: 'bg-red-500' },
} as const

export const STATUS_CONFIG = {
  todo: { label: 'To Do', color: 'bg-gray-100 text-gray-600' },
  in_progress: { label: 'In Progress', color: 'bg-blue-100 text-blue-700' },
  done: { label: 'Done', color: 'bg-green-100 text-green-700' },
  cancelled: { label: 'Cancelled', color: 'bg-red-100 text-red-600' },
} as const

export const GOAL_STATUS_CONFIG = {
  active: { label: 'Active', color: 'bg-blue-100 text-blue-700' },
  completed: { label: 'Completed', color: 'bg-green-100 text-green-700' },
  paused: { label: 'Paused', color: 'bg-yellow-100 text-yellow-700' },
  abandoned: { label: 'Abandoned', color: 'bg-red-100 text-red-600' },
} as const

export const PROJECT_COLORS = [
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

export function isOverdue(dateStr: string | null) {
  if (!dateStr) return false
  return new Date(dateStr) < new Date()
}
