export type TaskStatus     = 'todo' | 'in_progress' | 'done' | 'blocked'
export type TaskPriority   = 'high' | 'normal' | 'low'
export type TaskRecurrence = 'none' | 'daily' | 'weekly' | 'monthly'

export interface Project {
  id: string
  user_id: string
  title: string
  description: string | null
  target_date: string | null
  archived: boolean
  created_at: string
  updated_at: string
  // computed
  progress?: number
  task_count?: number
  done_count?: number
  streams?: WorkStream[]
}

export interface WorkStream {
  id: string
  user_id: string
  workspace_id: string | null
  goal_id: string | null
  name: string
  description: string | null
  color: string
  is_ongoing: boolean
  deadline: string | null
  archived: boolean
  created_at: string
  updated_at: string
  goal?: Project | null
}

export interface Task {
  id: string
  user_id: string
  workspace_id: string | null
  stream_id: string | null
  goal_id: string | null
  title: string
  description: string | null
  status: TaskStatus
  priority: TaskPriority
  due_date: string | null
  ai_score: number | null
  ai_reason: string | null
  recurrence: TaskRecurrence
  completed_at: string | null
  created_at: string
  updated_at: string
  stream?: WorkStream | null
  goal?: Project | null
}

export interface KnowledgePage {
  id: string
  user_id: string
  stream_id: string | null
  goal_id: string | null
  title: string
  content: string
  created_at: string
  updated_at: string
  stream?: WorkStream | null
  goal?: Project | null
}

export interface Workspace {
  id: string
  user_id: string
  name: string
  color: string
  created_at: string
  updated_at: string
}

export interface ApiToken {
  id: string
  user_id: string
  name: string
  last_used: string | null
  created_at: string
}
