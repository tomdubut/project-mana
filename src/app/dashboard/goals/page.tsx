'use client'

import { useEffect, useState, useCallback } from 'react'
import { Plus, Target, MoreHorizontal, Pencil, Trash2, Calendar } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Modal } from '@/components/ui/modal'
import { GoalForm } from '@/components/goals/goal-form'
import { getGoals, deleteGoal } from '@/lib/queries/goals'
import { getProjects } from '@/lib/queries/projects'
import { GOAL_STATUS_CONFIG, formatDate } from '@/lib/utils'
import { cn } from '@/lib/utils'
import type { Goal, Project } from '@/types'

export default function GoalsPage() {
  const [goals, setGoals] = useState<Goal[]>([])
  const [projects, setProjects] = useState<Project[]>([])
  const [editGoal, setEditGoal] = useState<Goal | null>(null)
  const [showCreate, setShowCreate] = useState(false)
  const [menuOpen, setMenuOpen] = useState<string | null>(null)

  const load = useCallback(async () => {
    const [g, p] = await Promise.all([getGoals(), getProjects()])
    setGoals(g)
    setProjects(p)
  }, [])

  useEffect(() => { load() }, [load])

  async function handleDelete(id: string) {
    if (!confirm('Delete this goal?')) return
    await deleteGoal(id)
    load()
  }

  return (
    <div className="max-w-3xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Goals</h1>
          <p className="text-sm text-gray-500 mt-0.5">{goals.length} goal{goals.length !== 1 ? 's' : ''}</p>
        </div>
        <Button onClick={() => setShowCreate(true)}>
          <Plus size={16} /> New goal
        </Button>
      </div>

      {goals.length === 0 ? (
        <div className="text-center py-16 text-gray-400">
          <Target size={40} className="mx-auto mb-3 opacity-30" />
          <p className="text-sm">No goals yet</p>
          <button onClick={() => setShowCreate(true)} className="mt-2 text-indigo-600 text-sm hover:underline">
            Set your first goal
          </button>
        </div>
      ) : (
        <div className="space-y-3">
          {goals.map((goal) => {
            const statusConf = GOAL_STATUS_CONFIG[goal.status]
            return (
              <div
                key={goal.id}
                className={cn(
                  'group bg-white rounded-xl border border-gray-100 hover:border-gray-200 hover:shadow-sm transition-all p-5',
                  goal.status === 'abandoned' && 'opacity-60'
                )}
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-start gap-3 flex-1 min-w-0">
                    <div className="w-8 h-8 rounded-lg bg-indigo-50 flex items-center justify-center flex-shrink-0 mt-0.5">
                      <Target size={15} className="text-indigo-600" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <h3 className="font-semibold text-gray-900 text-sm">{goal.title}</h3>
                      {goal.description && (
                        <p className="text-xs text-gray-500 mt-0.5 line-clamp-2">{goal.description}</p>
                      )}
                      <div className="flex flex-wrap items-center gap-2 mt-2">
                        <span className={cn('text-xs px-2 py-0.5 rounded-full font-medium', statusConf.color)}>
                          {statusConf.label}
                        </span>
                        {(goal as any).project && (
                          <span className="text-xs px-2 py-0.5 rounded-full bg-gray-100 text-gray-600 flex items-center gap-1">
                            <span
                              className="w-1.5 h-1.5 rounded-full inline-block"
                              style={{ backgroundColor: (goal as any).project.color }}
                            />
                            {(goal as any).project.name}
                          </span>
                        )}
                        {goal.target_date && (
                          <span className="text-xs text-gray-400 flex items-center gap-1">
                            <Calendar size={11} />
                            {formatDate(goal.target_date)}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="relative flex-shrink-0">
                    <button
                      onClick={() => setMenuOpen(menuOpen === goal.id ? null : goal.id)}
                      className="opacity-0 group-hover:opacity-100 text-gray-400 hover:text-gray-700 p-1 rounded transition-all"
                    >
                      <MoreHorizontal size={16} />
                    </button>
                    {menuOpen === goal.id && (
                      <>
                        <div className="fixed inset-0 z-10" onClick={() => setMenuOpen(null)} />
                        <div className="absolute right-0 top-7 z-20 bg-white border border-gray-100 rounded-lg shadow-lg py-1 w-36">
                          <button
                            onClick={() => { setEditGoal(goal); setMenuOpen(null) }}
                            className="flex items-center gap-2 w-full px-3 py-2 text-sm text-gray-700 hover:bg-gray-50"
                          >
                            <Pencil size={13} /> Edit
                          </button>
                          <button
                            onClick={() => { handleDelete(goal.id); setMenuOpen(null) }}
                            className="flex items-center gap-2 w-full px-3 py-2 text-sm text-red-600 hover:bg-red-50"
                          >
                            <Trash2 size={13} /> Delete
                          </button>
                        </div>
                      </>
                    )}
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      )}

      <Modal open={showCreate} onClose={() => setShowCreate(false)} title="New goal">
        <GoalForm
          projects={projects}
          onSuccess={() => { setShowCreate(false); load() }}
          onCancel={() => setShowCreate(false)}
        />
      </Modal>

      <Modal open={!!editGoal} onClose={() => setEditGoal(null)} title="Edit goal">
        {editGoal && (
          <GoalForm
            goal={editGoal}
            projects={projects}
            onSuccess={() => { setEditGoal(null); load() }}
            onCancel={() => setEditGoal(null)}
          />
        )}
      </Modal>
    </div>
  )
}
