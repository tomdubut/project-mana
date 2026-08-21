'use client'

import { useEffect, useState, useCallback } from 'react'
import { Plus, Target, Layers, MoreHorizontal, Pencil, Trash2, Calendar, ExternalLink, ChevronDown, ChevronRight, Archive, ArchiveRestore } from 'lucide-react'
import { getProjects, createProject, updateProject, deleteProject } from '@/lib/queries/goals'
import { getStreams, createStream, updateStream, deleteStream } from '@/lib/queries/streams'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Select } from '@/components/ui/select'
import { Modal } from '@/components/ui/modal'
import { cn, STREAM_COLORS, formatDate, daysUntil } from '@/lib/utils'
import { useWorkspace } from '@/lib/workspace-context'
import type { WorkStream, Project } from '@/types'
import Link from 'next/link'
import { Breadcrumb } from '@/components/ui/breadcrumb'

export default function StrategyPage() {
  const [projects, setProjects] = useState<Project[]>([])
  const [streams, setStreams] = useState<WorkStream[]>([])
  const [editProject, setEditProject] = useState<Project | null>(null)
  const [showNewProject, setShowNewProject] = useState(false)
  const [editStream, setEditStream] = useState<WorkStream | null>(null)
  const [showNewStream, setShowNewStream] = useState(false)
  const [newStreamProjectId, setNewStreamProjectId] = useState<string | null>(null)
  const [expandedProjects, setExpandedProjects] = useState<Set<string>>(new Set())
  const [menuOpen, setMenuOpen] = useState<string | null>(null)
  const [archivedStreams, setArchivedStreams] = useState<WorkStream[]>([])
  const [showArchived, setShowArchived] = useState(false)
  const [archivedProjects, setArchivedProjects] = useState<Project[]>([])
  const [showArchivedProjects, setShowArchivedProjects] = useState(false)

  const { activeWorkspace } = useWorkspace()

  const load = useCallback(async () => {
    const [g, allProjects, s, archived] = await Promise.all([
      getProjects(activeWorkspace?.id),
      getProjects(activeWorkspace?.id, true),
      getStreams(false, activeWorkspace?.id),
      getStreams(true, activeWorkspace?.id),
    ])
    setProjects(g)
    setArchivedProjects(allProjects.filter((project) => project.archived))
    setStreams(s)
    setArchivedStreams(archived.filter((s) => s.archived))
    setExpandedProjects(new Set(g.map((project) => project.id)))
  }, [activeWorkspace?.id])

  useEffect(() => { load() }, [load])

  function toggleProject(id: string) {
    setExpandedProjects((prev) => {
      const next = new Set(prev)
      next.has(id) ? next.delete(id) : next.add(id)
      return next
    })
  }

  function openNewStream(projectId: string | null = null) {
    setNewStreamProjectId(projectId)
    setShowNewStream(true)
  }

  // Streams not linked to any project
  const orphanStreams = streams.filter((s) => !s.goal_id)

  return (
    <div className="max-w-3xl mx-auto px-4 sm:px-8 py-8">
      <Breadcrumb items={[
        { label: activeWorkspace?.name ?? 'Workspace', color: activeWorkspace?.color },
        { label: 'Strategy' },
      ]} />
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between mb-6">
        <h1 className="text-xl font-bold text-gray-900">Strategy</h1>
        <div className="flex gap-2">
          <Button size="sm" variant="secondary" onClick={() => openNewStream(null)}>
            <Layers size={14} /> New stream
          </Button>
          <Button size="sm" onClick={() => setShowNewProject(true)}>
            <Plus size={14} /> New project
          </Button>
        </div>
      </div>

      {/* Projects with nested streams */}
      {projects.length === 0 && orphanStreams.length === 0 ? (
        <div className="text-center py-20 text-gray-400">
          <Target size={40} className="mx-auto mb-3 opacity-20" />
          <p className="text-sm">No projects yet.</p>
          <button onClick={() => setShowNewProject(true)} className="mt-2 text-indigo-600 text-sm hover:underline">
            Set your first project
          </button>
        </div>
      ) : (
        <div className="space-y-3">
          {projects.map((project) => {
            const goalStreams = streams.filter((s) => s.goal_id === project.id)
            const expanded = expandedProjects.has(project.id)
            return (
              <div key={project.id} className="bg-white rounded-xl border border-gray-100 overflow-hidden">
                {/* Project row */}
                <div className="group flex items-start gap-3 p-4">
                  <button
                    onClick={() => toggleProject(project.id)}
                    className="mt-0.5 flex-shrink-0 text-gray-400 hover:text-gray-600 transition-colors"
                  >
                    {expanded ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
                  </button>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <Target size={15} className="text-indigo-500 flex-shrink-0" />
                      <h3 className="font-semibold text-gray-900 text-sm">{project.title}</h3>
                    </div>
                    {project.description && (
                      <p className="text-xs text-gray-500 mb-2 line-clamp-1">{project.description}</p>
                    )}

                    {/* Progress */}
                    <div className="flex items-center gap-3">
                      <div className="flex-1 bg-gray-100 rounded-full h-1.5">
                        <div
                          className="h-1.5 rounded-full bg-indigo-500 transition-all"
                          style={{ width: `${project.progress ?? 0}%` }}
                        />
                      </div>
                      <span className="text-xs font-medium text-gray-500 w-8 text-right">{project.progress ?? 0}%</span>
                      <span className="text-xs text-gray-400">{project.done_count}/{project.task_count} tasks</span>
                      {project.target_date && (
                        <span className="text-xs text-gray-400 flex items-center gap-1">
                          <Calendar size={10} /> {formatDate(project.target_date)}
                        </span>
                      )}
                    </div>
                  </div>

                  <RowMenu
                    id={project.id}
                    open={menuOpen === project.id}
                    onToggle={() => setMenuOpen(menuOpen === project.id ? null : project.id)}
                    onClose={() => setMenuOpen(null)}
                    onEdit={() => { setEditProject(project); setMenuOpen(null) }}
                    onArchive={async () => {
                      const goalStreams = streams.filter((s) => s.goal_id === project.id)
                      await Promise.all([
                        updateProject(project.id, { archived: true }),
                        ...goalStreams.map((s) => updateStream(s.id, { archived: true })),
                      ])
                      setMenuOpen(null)
                      load()
                    }}
                    onDelete={async () => {
                      if (!confirm('Delete this project? Streams linked to it will become standalone.')) return
                      await deleteProject(project.id)
                      setMenuOpen(null)
                      load()
                    }}
                  />
                </div>

                {/* Nested streams */}
                {expanded && (
                  <div className="border-t border-gray-50 bg-gray-50/50">
                    {goalStreams.map((stream) => (
                      <StreamRow
                        key={stream.id}
                        stream={stream}
                        menuOpen={menuOpen === stream.id}
                        onToggleMenu={() => setMenuOpen(menuOpen === stream.id ? null : stream.id)}
                        onCloseMenu={() => setMenuOpen(null)}
                        onEdit={() => { setEditStream(stream); setMenuOpen(null) }}
                        onDelete={async () => {
                          if (!confirm('Delete this stream?')) return
                          await deleteStream(stream.id)
                          setMenuOpen(null)
                          load()
                        }}
                      />
                    ))}
                    <button
                      onClick={() => openNewStream(project.id)}
                      className="flex items-center gap-2 w-full px-6 py-2.5 text-xs text-gray-400 hover:text-indigo-600 hover:bg-gray-100 transition-colors"
                    >
                      <Plus size={12} /> Add stream to this project
                    </button>
                  </div>
                )}
              </div>
            )
          })}

          {/* Standalone streams (no goal) */}
          {orphanStreams.length > 0 && (
            <div className="bg-white rounded-xl border border-gray-100 overflow-hidden">
              <div className="px-4 py-3 border-b border-gray-50">
                <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Standalone streams</p>
              </div>
              {orphanStreams.map((stream) => (
                <StreamRow
                  key={stream.id}
                  stream={stream}
                  menuOpen={menuOpen === stream.id}
                  onToggleMenu={() => setMenuOpen(menuOpen === stream.id ? null : stream.id)}
                  onCloseMenu={() => setMenuOpen(null)}
                  onEdit={() => { setEditStream(stream); setMenuOpen(null) }}
                  onDelete={async () => {
                    if (!confirm('Delete this stream?')) return
                    await deleteStream(stream.id)
                    setMenuOpen(null)
                    load()
                  }}
                />
              ))}
            </div>
          )}
        </div>
      )}

      {/* Archived streams */}
      {archivedStreams.length > 0 && (
        <div className="mt-8">
          <button
            onClick={() => setShowArchived(!showArchived)}
            className="flex items-center gap-2 text-xs text-gray-400 hover:text-gray-600 transition-colors mb-2"
          >
            {showArchived ? <ChevronDown size={13} /> : <ChevronRight size={13} />}
            <Archive size={13} />
            Archived streams ({archivedStreams.length})
          </button>
          {showArchived && (
            <div className="bg-white rounded-xl border border-gray-100 overflow-hidden">
              {archivedStreams.map((stream) => (
                <div key={stream.id} className="flex items-center gap-3 px-4 py-3 border-b border-gray-50 last:border-0 opacity-60 hover:opacity-100 transition-opacity">
                  <span className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ backgroundColor: stream.color }} />
                  <span className="text-sm text-gray-700 flex-1 truncate">{stream.name}</span>
                  {(stream as any).goal?.title && (
                    <span className="text-xs text-gray-400 truncate max-w-[120px]">{(stream as any).goal.title}</span>
                  )}
                  <button
                    onClick={async () => { await updateStream(stream.id, { archived: false }); load() }}
                    className="flex items-center gap-1 text-xs text-indigo-500 hover:text-indigo-700 px-2 py-1 rounded-lg hover:bg-indigo-50 transition-colors flex-shrink-0"
                    title="Unarchive"
                  >
                    <ArchiveRestore size={13} /> Unarchive
                  </button>
                  <button
                    onClick={async () => { if (!confirm('Delete this stream?')) return; await deleteStream(stream.id); load() }}
                    className="text-gray-300 hover:text-red-500 p-1 rounded transition-colors flex-shrink-0"
                    title="Delete"
                  >
                    <Trash2 size={13} />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Archived projects */}
      {archivedProjects.length > 0 && (
        <div className="mt-4">
          <button
            onClick={() => setShowArchivedProjects(!showArchivedProjects)}
            className="flex items-center gap-2 text-xs text-gray-400 hover:text-gray-600 transition-colors mb-2"
          >
            {showArchivedProjects ? <ChevronDown size={13} /> : <ChevronRight size={13} />}
            <Archive size={13} />
            Archived projects ({archivedProjects.length})
          </button>
          {showArchivedProjects && (
            <div className="bg-white rounded-xl border border-gray-100 overflow-hidden">
              {archivedProjects.map((project) => (
                <div key={project.id} className="flex items-center gap-3 px-4 py-3 border-b border-gray-50 last:border-0 opacity-60 hover:opacity-100 transition-opacity">
                  <Target size={14} className="text-indigo-300 flex-shrink-0" />
                  <span className="text-sm text-gray-700 flex-1 truncate">{project.title}</span>
                  {project.target_date && (
                    <span className="text-xs text-gray-400 flex-shrink-0">{formatDate(project.target_date)}</span>
                  )}
                  <button
                    onClick={async () => { await updateProject(project.id, { archived: false }); load() }}
                    className="flex items-center gap-1 text-xs text-indigo-500 hover:text-indigo-700 px-2 py-1 rounded-lg hover:bg-indigo-50 transition-colors flex-shrink-0"
                    title="Unarchive"
                  >
                    <ArchiveRestore size={13} /> Unarchive
                  </button>
                  <button
                    onClick={async () => { if (!confirm('Delete this project? Streams linked to it will become standalone.')) return; await deleteProject(project.id); load() }}
                    className="text-gray-300 hover:text-red-500 p-1 rounded transition-colors flex-shrink-0"
                    title="Delete"
                  >
                    <Trash2 size={13} />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Modals */}
      <Modal open={showNewProject} onClose={() => setShowNewProject(false)} title="New project">
        <ProjectForm
          workspaceId={activeWorkspace?.id}
          onSuccess={() => { setShowNewProject(false); load() }}
          onCancel={() => setShowNewProject(false)}
        />
      </Modal>
      <Modal open={!!editProject} onClose={() => setEditProject(null)} title="Edit project">
        {editProject && (
          <ProjectForm
            project={editProject}
            workspaceId={activeWorkspace?.id}
            onSuccess={() => { setEditProject(null); load() }}
            onCancel={() => setEditProject(null)}
          />
        )}
      </Modal>
      <Modal open={showNewStream} onClose={() => setShowNewStream(false)} title="New work stream">
        <StreamForm
          projects={projects}
          defaultProjectId={newStreamProjectId}
          workspaceId={activeWorkspace?.id}
          onSuccess={() => { setShowNewStream(false); load() }}
          onCancel={() => setShowNewStream(false)}
        />
      </Modal>
      <Modal open={!!editStream} onClose={() => setEditStream(null)} title="Edit work stream">
        {editStream && (
          <StreamForm
            stream={editStream}
            projects={projects}
            workspaceId={activeWorkspace?.id}
            onSuccess={() => { setEditStream(null); load() }}
            onCancel={() => setEditStream(null)}
          />
        )}
      </Modal>
    </div>
  )
}

// ── Stream row ──────────────────────────────────────────────
function StreamRow({ stream, menuOpen, onToggleMenu, onCloseMenu, onEdit, onDelete }: {
  stream: WorkStream
  menuOpen: boolean; onToggleMenu: () => void; onCloseMenu: () => void
  onEdit: () => void; onDelete: () => void
}) {
  const days = daysUntil(stream.deadline)
  return (
    <div className="group flex items-center gap-3 px-6 py-3 hover:bg-gray-100/60 transition-colors border-b border-gray-50 last:border-0">
      <span className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ backgroundColor: stream.color }} />
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <Link href={`/dashboard/streams/${stream.id}`} className="text-sm font-medium text-gray-800 truncate hover:text-indigo-600 transition-colors">{stream.name}</Link>
          <span className={cn(
            'text-xs px-1.5 py-0.5 rounded font-medium flex-shrink-0',
            stream.is_ongoing ? 'bg-green-50 text-green-600' : 'bg-blue-50 text-blue-600'
          )}>
            {stream.is_ongoing ? 'Ongoing' : 'Time-bound'}
          </span>
          {stream.deadline && (
            <span className={cn('text-xs flex items-center gap-1 flex-shrink-0', days !== null && days < 7 ? 'text-red-500' : 'text-gray-400')}>
              <Calendar size={10} /> {formatDate(stream.deadline)}{days !== null && days >= 0 && ` (${days}d)`}
            </span>
          )}
        </div>
        {stream.description && <p className="text-xs text-gray-400 truncate mt-0.5">{stream.description}</p>}
      </div>
      <Link href={`/dashboard/streams/${stream.id}`} className="opacity-0 group-hover:opacity-100 text-xs text-indigo-500 hover:text-indigo-700 flex items-center gap-1 flex-shrink-0 transition-all">
        Open <ExternalLink size={10} />
      </Link>
      <RowMenu id={stream.id} open={menuOpen} onToggle={onToggleMenu} onClose={onCloseMenu} onEdit={onEdit} onDelete={onDelete} />
    </div>
  )
}

// ── Project Form ─────────────────────────────────────────────
function ProjectForm({ project, workspaceId, onSuccess, onCancel }: { project?: Project; workspaceId?: string; onSuccess: () => void; onCancel: () => void }) {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [form, setForm] = useState({
    title: project?.title ?? '',
    description: project?.description ?? '',
    target_date: project?.target_date ?? '',
  })

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!form.title.trim()) return
    setError(''); setLoading(true)
    try {
      const payload = { title: form.title.trim(), description: form.description || null, target_date: form.target_date || null }
      if (project) await updateProject(project.id, payload)
      else await createProject({ ...payload, workspace_id: workspaceId ?? null })
      onSuccess()
    } catch (err: any) { setError(err.message) } finally { setLoading(false) }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Title *</label>
        <Input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} autoFocus required />
      </div>
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
        <textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} rows={2}
          className="block w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500" />
      </div>
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Target date</label>
        <Input type="date" value={form.target_date} onChange={(e) => setForm({ ...form, target_date: e.target.value })} />
      </div>
      {error && <p className="text-sm text-red-600">{error}</p>}
      <div className="flex justify-end gap-2 pt-1">
        <Button type="button" variant="secondary" onClick={onCancel}>Cancel</Button>
        <Button type="submit" disabled={loading}>{loading ? 'Saving…' : project ? 'Update' : 'Create project'}</Button>
      </div>
    </form>
  )
}

// ── Stream Form ─────────────────────────────────────────────
function StreamForm({ stream, projects, defaultProjectId, workspaceId, onSuccess, onCancel }: {
  stream?: WorkStream; projects: Project[]; defaultProjectId?: string | null; workspaceId?: string
  onSuccess: () => void; onCancel: () => void
}) {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [form, setForm] = useState({
    name: stream?.name ?? '',
    description: stream?.description ?? '',
    color: stream?.color ?? STREAM_COLORS[0],
    is_ongoing: stream?.is_ongoing ?? true,
    deadline: stream?.deadline ?? '',
    goal_id: stream?.goal_id ?? defaultProjectId ?? '',
  })

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!form.name.trim()) return
    setError(''); setLoading(true)
    try {
      const payload = {
        name: form.name.trim(),
        description: form.description || null,
        color: form.color,
        is_ongoing: form.is_ongoing,
        deadline: form.is_ongoing ? null : form.deadline || null,
        goal_id: form.goal_id || null,
      }
      if (stream) await updateStream(stream.id, payload)
      else await createStream({ ...payload, workspace_id: workspaceId ?? null })
      onSuccess()
    } catch (err: any) { setError(err.message) } finally { setLoading(false) }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Name *</label>
        <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} autoFocus required />
      </div>
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Project</label>
        <Select value={form.goal_id} onChange={(e) => setForm({ ...form, goal_id: e.target.value })}>
          <option value="">No project (standalone)</option>
          {projects.map((g) => <option key={g.id} value={g.id}>{g.title}</option>)}
        </Select>
      </div>
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
        <textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} rows={2}
          className="block w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500" />
      </div>
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">Color</label>
        <div className="flex gap-2 flex-wrap">
          {STREAM_COLORS.map((color) => (
            <button key={color} type="button" onClick={() => setForm({ ...form, color })}
              className={cn('w-7 h-7 rounded-full transition-transform', form.color === color && 'ring-2 ring-offset-2 ring-gray-400 scale-110')}
              style={{ backgroundColor: color }} />
          ))}
        </div>
      </div>
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Type</label>
        <Select value={form.is_ongoing ? 'ongoing' : 'timebound'} onChange={(e) => setForm({ ...form, is_ongoing: e.target.value === 'ongoing' })}>
          <option value="ongoing">Ongoing</option>
          <option value="timebound">Time-bound (has deadline)</option>
        </Select>
      </div>
      {!form.is_ongoing && (
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Deadline</label>
          <Input type="date" value={form.deadline} onChange={(e) => setForm({ ...form, deadline: e.target.value })} />
        </div>
      )}
      {error && <p className="text-sm text-red-600">{error}</p>}
      <div className="flex justify-end gap-2 pt-1">
        <Button type="button" variant="secondary" onClick={onCancel}>Cancel</Button>
        <Button type="submit" disabled={loading}>{loading ? 'Saving…' : stream ? 'Update' : 'Create stream'}</Button>
      </div>
    </form>
  )
}

// ── Shared ────────────────────────────────────────────────
function RowMenu({ id, open, onToggle, onClose, onEdit, onArchive, onDelete }: {
  id: string; open: boolean; onToggle: () => void; onClose: () => void
  onEdit: () => void; onArchive?: () => void; onDelete: () => void
}) {
  return (
    <div className="relative flex-shrink-0">
      <button onClick={onToggle} className="opacity-0 group-hover:opacity-100 text-gray-400 hover:text-gray-700 p-1 rounded transition-all">
        <MoreHorizontal size={15} />
      </button>
      {open && (
        <>
          <div className="fixed inset-0 z-10" onClick={onClose} />
          <div className="absolute right-0 top-7 z-20 bg-white border border-gray-100 shadow-lg rounded-lg py-1 w-36">
            <button onClick={onEdit} className="flex items-center gap-2 w-full px-3 py-2 text-sm text-gray-700 hover:bg-gray-50"><Pencil size={12} /> Edit</button>
            {onArchive && (
              <button onClick={onArchive} className="flex items-center gap-2 w-full px-3 py-2 text-sm text-amber-600 hover:bg-amber-50"><Archive size={12} /> Archive</button>
            )}
            <button onClick={onDelete} className="flex items-center gap-2 w-full px-3 py-2 text-sm text-red-600 hover:bg-red-50"><Trash2 size={12} /> Delete</button>
          </div>
        </>
      )}
    </div>
  )
}
