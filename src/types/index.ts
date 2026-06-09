export type Priority = 'low' | 'medium' | 'high' | 'urgent'
export type TaskStatus = 'todo' | 'in_progress' | 'done' | 'cancelled'
export type GoalStatus = 'active' | 'completed' | 'paused' | 'abandoned'

export interface Project {
  id: string
  user_id: string
  name: string
  description: string | null
  color: string
  created_at: string
  updated_at: string
}

export interface Goal {
  id: string
  user_id: string
  project_id: string | null
  title: string
  description: string | null
  status: GoalStatus
  target_date: string | null
  created_at: string
  updated_at: string
  project?: Project
}

export interface Task {
  id: string
  user_id: string
  project_id: string | null
  goal_id: string | null
  title: string
  description: string | null
  status: TaskStatus
  priority: Priority
  due_date: string | null
  completed_at: string | null
  created_at: string
  updated_at: string
  project?: Project
  goal?: Goal
}

export interface TaskWithRelations extends Omit<Task, 'project' | 'goal'> {
  project: Project | null
  goal: Goal | null
}
