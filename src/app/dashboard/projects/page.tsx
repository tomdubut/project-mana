'use client'

import { useEffect, useState, useCallback } from 'react'
import { Plus, FolderOpen, MoreHorizontal, Pencil, Trash2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Modal } from '@/components/ui/modal'
import { ProjectForm } from '@/components/projects/project-form'
import { getProjects, deleteProject } from '@/lib/queries/projects'
import type { Project } from '@/types'

export default function ProjectsPage() {
  const [projects, setProjects] = useState<Project[]>([])
  const [editProject, setEditProject] = useState<Project | null>(null)
  const [showCreate, setShowCreate] = useState(false)
  const [menuOpen, setMenuOpen] = useState<string | null>(null)

  const load = useCallback(async () => {
    setProjects(await getProjects())
  }, [])

  useEffect(() => { load() }, [load])

  async function handleDelete(id: string) {
    if (!confirm('Delete this project? Tasks linked to it will lose their project.')) return
    await deleteProject(id)
    load()
  }

  return (
    <div className="max-w-3xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Projects</h1>
          <p className="text-sm text-gray-500 mt-0.5">{projects.length} project{projects.length !== 1 ? 's' : ''}</p>
        </div>
        <Button onClick={() => setShowCreate(true)}>
          <Plus size={16} /> New project
        </Button>
      </div>

      {projects.length === 0 ? (
        <div className="text-center py-16 text-gray-400">
          <FolderOpen size={40} className="mx-auto mb-3 opacity-30" />
          <p className="text-sm">No projects yet</p>
          <button onClick={() => setShowCreate(true)} className="mt-2 text-indigo-600 text-sm hover:underline">
            Create your first project
          </button>
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2">
          {projects.map((project) => (
            <div
              key={project.id}
              className="group bg-white rounded-xl border border-gray-100 hover:border-gray-200 hover:shadow-sm transition-all p-5"
            >
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-3">
                  <div
                    className="w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0"
                    style={{ backgroundColor: project.color + '20' }}
                  >
                    <FolderOpen size={17} style={{ color: project.color }} />
                  </div>
                  <div>
                    <h3 className="font-semibold text-gray-900 text-sm">{project.name}</h3>
                    {project.description && (
                      <p className="text-xs text-gray-500 mt-0.5 line-clamp-2">{project.description}</p>
                    )}
                  </div>
                </div>
                <div className="relative">
                  <button
                    onClick={() => setMenuOpen(menuOpen === project.id ? null : project.id)}
                    className="opacity-0 group-hover:opacity-100 text-gray-400 hover:text-gray-700 p-1 rounded transition-all"
                  >
                    <MoreHorizontal size={16} />
                  </button>
                  {menuOpen === project.id && (
                    <>
                      <div className="fixed inset-0 z-10" onClick={() => setMenuOpen(null)} />
                      <div className="absolute right-0 top-7 z-20 bg-white border border-gray-100 rounded-lg shadow-lg py-1 w-36">
                        <button
                          onClick={() => { setEditProject(project); setMenuOpen(null) }}
                          className="flex items-center gap-2 w-full px-3 py-2 text-sm text-gray-700 hover:bg-gray-50"
                        >
                          <Pencil size={13} /> Edit
                        </button>
                        <button
                          onClick={() => { handleDelete(project.id); setMenuOpen(null) }}
                          className="flex items-center gap-2 w-full px-3 py-2 text-sm text-red-600 hover:bg-red-50"
                        >
                          <Trash2 size={13} /> Delete
                        </button>
                      </div>
                    </>
                  )}
                </div>
              </div>
              <div className="mt-3 h-1 rounded-full" style={{ backgroundColor: project.color }} />
            </div>
          ))}
        </div>
      )}

      <Modal open={showCreate} onClose={() => setShowCreate(false)} title="New project">
        <ProjectForm
          onSuccess={() => { setShowCreate(false); load() }}
          onCancel={() => setShowCreate(false)}
        />
      </Modal>

      <Modal open={!!editProject} onClose={() => setEditProject(null)} title="Edit project">
        {editProject && (
          <ProjectForm
            project={editProject}
            onSuccess={() => { setEditProject(null); load() }}
            onCancel={() => setEditProject(null)}
          />
        )}
      </Modal>
    </div>
  )
}
