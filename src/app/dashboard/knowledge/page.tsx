'use client'

import { useEffect, useState, useCallback } from 'react'
import { Plus, BookOpen, FileText, Pencil, Trash2, X, Save, Clock, Target, Layers, Menu } from 'lucide-react'
import MDEditor from '@uiw/react-md-editor'
import { getPages, createPage, updatePage, deletePage } from '@/lib/queries/knowledge'
import { getStreams } from '@/lib/queries/streams'
import { getProjects } from '@/lib/queries/goals'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Select } from '@/components/ui/select'
import { cn, formatDate } from '@/lib/utils'
import { useWorkspace } from '@/lib/workspace-context'
import type { KnowledgePage, WorkStream, Project } from '@/types'
import { Breadcrumb } from '@/components/ui/breadcrumb'

export default function KnowledgePage() {
  const [pages, setPages] = useState<KnowledgePage[]>([])
  const [streams, setStreams] = useState<WorkStream[]>([])
  const [projects, setProjects] = useState<Project[]>([])
  const [selected, setSelected] = useState<KnowledgePage | null>(null)
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [editing, setEditing] = useState(false)
  const [showNew, setShowNew] = useState(false)
  const [filterStream, setFilterStream] = useState('')
  const [filterGoal, setFilterGoal] = useState('')
  const [saving, setSaving] = useState(false)
  const [draft, setDraft] = useState({ title: '', content: '', stream_id: '', goal_id: '' })

  const { activeWorkspace } = useWorkspace()

  const load = useCallback(async () => {
    const [p, s, g] = await Promise.all([
      getPages(undefined, activeWorkspace?.id),
      getStreams(false, activeWorkspace?.id),
      getProjects(activeWorkspace?.id),
    ])
    setPages(p)
    setStreams(s)
    setProjects(g)
  }, [activeWorkspace?.id])

  useEffect(() => { load() }, [load])

  function openPage(page: KnowledgePage) {
    setSelected(page)
    setDraft({ title: page.title, content: page.content, stream_id: page.stream_id ?? '', goal_id: page.goal_id ?? '' })
    setEditing(false)
    setSidebarOpen(false)
  }

  async function handleSave() {
    if (!selected) return
    setSaving(true)
    const updated = await updatePage(selected.id, {
      title: draft.title,
      content: draft.content,
      stream_id: draft.stream_id || null,
      goal_id: draft.goal_id || null,
    })
    setSelected(updated)
    setEditing(false)
    setSaving(false)
    load()
  }

  async function handleCreate(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    const fd = new FormData(e.currentTarget)
    const page = await createPage({
      title: (fd.get('title') as string).trim(),
      content: '',
      stream_id: (fd.get('stream_id') as string) || null,
      goal_id: (fd.get('goal_id') as string) || null,
      workspace_id: activeWorkspace?.id ?? null,
    })
    setShowNew(false)
    load()
    openPage(page)
  }

  async function handleDelete(id: string) {
    if (!confirm('Delete this page?')) return
    await deletePage(id)
    if (selected?.id === id) setSelected(null)
    load()
  }

  const filtered = pages.filter((p) => {
    if (filterStream && p.stream_id !== filterStream) return false
    if (filterGoal && p.goal_id !== filterGoal) return false
    return true
  })

  return (
    <div className="flex h-[calc(100dvh-4rem)] md:h-screen overflow-hidden relative">
      {/* Mobile sidebar overlay */}
      {sidebarOpen && (
        <div className="fixed inset-0 z-30 bg-black/30 md:hidden" onClick={() => setSidebarOpen(false)} />
      )}

      {/* Sidebar list */}
      <div className={cn(
        'flex-shrink-0 border-r border-gray-100 bg-white flex flex-col z-40 transition-transform duration-200',
        'fixed md:relative inset-y-0 left-0 w-72 md:w-64',
        sidebarOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'
      )}>
        <div className="p-4 border-b border-gray-100">
          <Breadcrumb
            items={[
              { label: activeWorkspace?.name ?? 'Workspace', color: activeWorkspace?.color },
              { label: 'Knowledge' },
            ]}
            className="mb-3"
          />
          <div className="flex items-center justify-between mb-3">
            <h2 className="font-semibold text-gray-900 text-sm flex items-center gap-1.5">
              <BookOpen size={15} /> Knowledge
            </h2>
            <button onClick={() => setShowNew(true)} className="text-indigo-600 hover:text-indigo-700 transition-colors">
              <Plus size={16} />
            </button>
          </div>
          <div className="space-y-1.5">
            <Select value={filterGoal} onChange={(e) => { setFilterGoal(e.target.value); setFilterStream('') }} className="text-xs">
              <option value="">All projects</option>
              {projects.map((g) => <option key={g.id} value={g.id}>{g.title}</option>)}
            </Select>
            <Select value={filterStream} onChange={(e) => { setFilterStream(e.target.value); setFilterGoal('') }} className="text-xs">
              <option value="">All streams</option>
              {streams.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
            </Select>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto py-2">
          {filtered.length === 0 ? (
            <div className="px-4 py-8 text-center text-gray-400 text-xs">
              <FileText size={24} className="mx-auto mb-2 opacity-30" />
              No pages yet
            </div>
          ) : (
            filtered.map((page) => {
              const stream = streams.find((s) => s.id === page.stream_id)
              const goal = projects.find((g) => g.id === page.goal_id)
              return (
                <button
                  key={page.id}
                  onClick={() => openPage(page)}
                  className={cn(
                    'w-full text-left px-4 py-3 hover:bg-gray-50 transition-colors group',
                    selected?.id === page.id && 'bg-indigo-50'
                  )}
                >
                  <div className="flex items-center justify-between">
                    <p className={cn('text-sm font-medium truncate', selected?.id === page.id ? 'text-indigo-700' : 'text-gray-800')}>
                      {page.title}
                    </p>
                    <button
                      onClick={(e) => { e.stopPropagation(); handleDelete(page.id) }}
                      className="opacity-0 group-hover:opacity-100 text-gray-400 hover:text-red-500 transition-all flex-shrink-0"
                    >
                      <Trash2 size={12} />
                    </button>
                  </div>
                  {goal && (
                    <span className="text-xs text-indigo-400 flex items-center gap-1 mt-0.5">
                      <Target size={10} /> {goal.title}
                    </span>
                  )}
                  {stream && !goal && (
                    <span className="text-xs text-gray-400 flex items-center gap-1 mt-0.5">
                      <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: stream.color }} />
                      {stream.name}
                    </span>
                  )}
                </button>
              )
            })
          )}
        </div>
      </div>

      {/* Editor / viewer */}
      <div className="flex-1 flex flex-col overflow-hidden min-w-0">
        {selected ? (
          <>
            {/* Header row */}
            <div className="flex flex-col px-4 sm:px-6 py-3 border-b border-gray-100 bg-white gap-2">
              <div className="flex items-center gap-2">
                {/* Mobile: hamburger to open sidebar */}
                <button onClick={() => setSidebarOpen(true)} className="md:hidden text-gray-400 hover:text-gray-700 p-1 -ml-1 flex-shrink-0">
                  <Menu size={18} />
                </button>
                {editing ? (
                  <Input
                    value={draft.title}
                    onChange={(e) => setDraft({ ...draft, title: e.target.value })}
                    className="text-base font-bold border-0 shadow-none px-0 focus:ring-0 text-gray-900 flex-1 min-w-0"
                  />
                ) : (
                  <h1 className="text-base font-bold text-gray-900 flex-1 min-w-0 truncate">{selected.title}</h1>
                )}
                <div className="flex items-center gap-1.5 flex-shrink-0">
                  {editing ? (
                    <>
                      <Button size="sm" onClick={handleSave} disabled={saving}>
                        <Save size={13} /> {saving ? 'Saving…' : 'Save'}
                      </Button>
                      <button onClick={() => { setEditing(false); setDraft({ title: selected.title, content: selected.content, stream_id: selected.stream_id ?? '', goal_id: selected.goal_id ?? '' }) }}
                        className="text-gray-400 hover:text-gray-600 transition-colors p-1">
                        <X size={16} />
                      </button>
                    </>
                  ) : (
                    <>
                      <div className="hidden sm:flex items-center gap-2 text-xs text-gray-400">
                        {selected.goal && <span className="flex items-center gap-1 text-indigo-500"><Target size={11} /> {selected.goal.title}</span>}
                        {selected.stream && <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full" style={{ backgroundColor: selected.stream.color }} />{selected.stream.name}</span>}
                        <span className="flex items-center gap-1"><Clock size={11} /> {formatDate(selected.updated_at)}</span>
                      </div>
                      <Button size="sm" variant="secondary" onClick={() => setEditing(true)}>
                        <Pencil size={13} /> Edit
                      </Button>
                    </>
                  )}
                </div>
              </div>
              {/* Editing: selects on second row (full width on mobile) */}
              {editing && (
                <div className="flex gap-2 flex-wrap">
                  <Select value={draft.goal_id} onChange={(e) => setDraft({ ...draft, goal_id: e.target.value, stream_id: '' })} className="text-xs flex-1 min-w-[120px]">
                    <option value="">No project</option>
                    {projects.map((g) => <option key={g.id} value={g.id}>{g.title}</option>)}
                  </Select>
                  <Select value={draft.stream_id} onChange={(e) => setDraft({ ...draft, stream_id: e.target.value, goal_id: '' })} className="text-xs flex-1 min-w-[120px]">
                    <option value="">No stream</option>
                    {streams.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
                  </Select>
                </div>
              )}
            </div>

            <div className="flex-1 overflow-y-auto px-4 sm:px-8 py-6">
              {editing ? (
                <div data-color-mode="light" className="flex-1">
                  <MDEditor
                    value={draft.content}
                    onChange={(val) => setDraft({ ...draft, content: val ?? '' })}
                    height={500}
                    preview="edit"
                  />
                </div>
              ) : (
                <div className="prose prose-sm max-w-none">
                  {selected.content ? (
                    <div data-color-mode="light">
                      <MDEditor.Markdown source={selected.content} className="text-sm text-gray-700 !bg-transparent" />
                    </div>
                  ) : (
                    <p className="text-gray-400 italic">No content yet. Click Edit to add.</p>
                  )}
                </div>
              )}
            </div>
          </>
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center text-gray-400">
            <button onClick={() => setSidebarOpen(true)} className="md:hidden mb-4 flex items-center gap-2 text-sm text-indigo-600 border border-indigo-200 rounded-xl px-4 py-2">
              <Menu size={15} /> Browse pages
            </button>
            <div className="text-center">
              <BookOpen size={40} className="mx-auto mb-3 opacity-20" />
              <p className="text-sm">Select a page to view</p>
              <button onClick={() => setShowNew(true)} className="mt-2 text-indigo-600 text-sm hover:underline">
                or create a new page
              </button>
            </div>
          </div>
        )}
      </div>

      {/* New page modal */}
      {showNew && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-sm p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-semibold text-gray-900">New page</h2>
              <button onClick={() => setShowNew(false)} className="text-gray-400 hover:text-gray-600"><X size={18} /></button>
            </div>
            <form onSubmit={handleCreate} className="space-y-3">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Title *</label>
                <Input name="title" placeholder="Page title" autoFocus required />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1 flex items-center gap-1">
                  <Target size={12} /> Project
                </label>
                <Select name="goal_id">
                  <option value="">No project</option>
                  {projects.map((g) => <option key={g.id} value={g.id}>{g.title}</option>)}
                </Select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1 flex items-center gap-1">
                  <Layers size={12} /> Work Stream
                </label>
                <Select name="stream_id">
                  <option value="">No stream</option>
                  {streams.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
                </Select>
              </div>
              <div className="flex justify-end gap-2 pt-1">
                <Button type="button" variant="secondary" onClick={() => setShowNew(false)}>Cancel</Button>
                <Button type="submit">Create</Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
