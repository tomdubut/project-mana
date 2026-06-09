import { createClient } from '@/lib/supabase/server'
import { CheckCircle2, Clock, AlertCircle, Target, FolderOpen, TrendingUp } from 'lucide-react'

async function getStats(userId: string) {
  const supabase = await createClient()
  const [tasks, projects, goals] = await Promise.all([
    supabase.from('tasks').select('status, priority, due_date').eq('user_id', userId),
    supabase.from('projects').select('id').eq('user_id', userId),
    supabase.from('goals').select('status').eq('user_id', userId),
  ])

  const allTasks = tasks.data ?? []
  const now = new Date().toISOString().slice(0, 10)

  return {
    totalTasks: allTasks.length,
    doneTasks: allTasks.filter((t) => t.status === 'done').length,
    inProgressTasks: allTasks.filter((t) => t.status === 'in_progress').length,
    overdueTasks: allTasks.filter(
      (t) => t.due_date && t.due_date < now && t.status !== 'done' && t.status !== 'cancelled'
    ).length,
    urgentTasks: allTasks.filter((t) => t.priority === 'urgent' && t.status !== 'done').length,
    totalProjects: (projects.data ?? []).length,
    activeGoals: (goals.data ?? []).filter((g) => g.status === 'active').length,
    completedGoals: (goals.data ?? []).filter((g) => g.status === 'completed').length,
  }
}

async function getRecentTasks(userId: string) {
  const supabase = await createClient()
  const { data } = await supabase
    .from('tasks')
    .select('id, title, status, priority, due_date, project:projects(name, color)')
    .eq('user_id', userId)
    .neq('status', 'done')
    .order('created_at', { ascending: false })
    .limit(5)
  return data ?? []
}

const PRIORITY_COLORS: Record<string, string> = {
  urgent: 'bg-red-100 text-red-700',
  high: 'bg-orange-100 text-orange-700',
  medium: 'bg-blue-100 text-blue-700',
  low: 'bg-slate-100 text-slate-600',
}

export default async function DashboardPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null

  const [stats, recentTasks] = await Promise.all([
    getStats(user.id),
    getRecentTasks(user.id),
  ])

  const completionRate = stats.totalTasks > 0
    ? Math.round((stats.doneTasks / stats.totalTasks) * 100)
    : 0

  return (
    <div className="max-w-5xl mx-auto">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
        <p className="text-gray-500 text-sm mt-1">Here&apos;s what&apos;s happening today</p>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <StatCard icon={<CheckCircle2 size={20} className="text-green-600" />} label="Completed" value={stats.doneTasks} bg="bg-green-50" />
        <StatCard icon={<Clock size={20} className="text-blue-600" />} label="In Progress" value={stats.inProgressTasks} bg="bg-blue-50" />
        <StatCard icon={<AlertCircle size={20} className="text-red-600" />} label="Overdue" value={stats.overdueTasks} bg="bg-red-50" />
        <StatCard icon={<TrendingUp size={20} className="text-indigo-600" />} label="Completion" value={`${completionRate}%`} bg="bg-indigo-50" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
        <div className="bg-white rounded-xl border border-gray-100 p-5">
          <div className="flex items-center gap-2 mb-1">
            <FolderOpen size={16} className="text-gray-400" />
            <span className="text-sm font-medium text-gray-600">Projects</span>
          </div>
          <p className="text-3xl font-bold text-gray-900">{stats.totalProjects}</p>
        </div>
        <div className="bg-white rounded-xl border border-gray-100 p-5">
          <div className="flex items-center gap-2 mb-1">
            <Target size={16} className="text-gray-400" />
            <span className="text-sm font-medium text-gray-600">Active Goals</span>
          </div>
          <p className="text-3xl font-bold text-gray-900">{stats.activeGoals}</p>
        </div>
        <div className="bg-white rounded-xl border border-gray-100 p-5">
          <div className="flex items-center gap-2 mb-1">
            <AlertCircle size={16} className="text-gray-400" />
            <span className="text-sm font-medium text-gray-600">Urgent Tasks</span>
          </div>
          <p className="text-3xl font-bold text-gray-900">{stats.urgentTasks}</p>
        </div>
      </div>

      <div className="bg-white rounded-xl border border-gray-100 p-6">
        <h2 className="text-sm font-semibold text-gray-700 mb-4">Recent open tasks</h2>
        {recentTasks.length === 0 ? (
          <p className="text-sm text-gray-400">No open tasks. Great job!</p>
        ) : (
          <ul className="space-y-3">
            {recentTasks.map((task: any) => (
              <li key={task.id} className="flex items-center gap-3">
                <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${PRIORITY_COLORS[task.priority]}`}>
                  {task.priority}
                </span>
                <span className="text-sm text-gray-800 flex-1 truncate">{task.title}</span>
                {task.project && (
                  <span className="text-xs text-gray-400 flex items-center gap-1">
                    <span className="w-2 h-2 rounded-full inline-block" style={{ backgroundColor: task.project.color }} />
                    {task.project.name}
                  </span>
                )}
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  )
}

function StatCard({ icon, label, value, bg }: { icon: React.ReactNode; label: string; value: string | number; bg: string }) {
  return (
    <div className="bg-white rounded-xl border border-gray-100 p-5">
      <div className={`w-9 h-9 ${bg} rounded-lg flex items-center justify-center mb-3`}>
        {icon}
      </div>
      <p className="text-2xl font-bold text-gray-900">{value}</p>
      <p className="text-xs text-gray-500 mt-0.5">{label}</p>
    </div>
  )
}
