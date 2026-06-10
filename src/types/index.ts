export type TaskStatus   = 'todo' | 'in_progress' | 'done' | 'blocked'
export type TaskPriority = 'high' | 'normal' | 'low'

export interface WorkStream {
  id: string
  user_id: string
  name: string
  description: string | null
  color: string
  is_ongoing: boolean
  deadline: string | null
  archived: boolean
  created_at: string
  updated_at: string
}

export interface Goal {
  id: string
  user_id: string
  stream_id: string | null
  title: string
  description: string | null
  target_date: string | null
  archived: boolean
  created_at: string
  updated_at: string
  // computed
  progress?: number
  stream?: WorkStream | null
  task_count?: number
  done_count?: number
}

export interface Task {
  id: string
  user_id: string
  stream_id: string | null
  goal_id: string | null
  title: string
  description: string | null
  status: TaskStatus
  priority: TaskPriority
  due_date: string | null
  ai_score: number | null
  ai_reason: string | null
  completed_at: string | null
  created_at: string
  updated_at: string
  stream?: WorkStream | null
  goal?: Goal | null
}

export interface KnowledgePage {
  id: string
  user_id: string
  stream_id: string | null
  title: string
  content: string
  created_at: string
  updated_at: string
  stream?: WorkStream | null
}

export interface ApiToken {
  id: string
  user_id: string
  name: string
  last_used: string | null
  created_at: string
}
