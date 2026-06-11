'use client'

import { useEffect, useState, useCallback } from 'react'
import { Plus, BookOpen, FileText, Pencil, Trash2, X, Save, Clock } from 'lucide-react'
import MDEditor from '@uiw/react-md-editor'
import { getPages, createPage, updatePage, deletePage } from '@/lib/queries/knowledge'
import { getStreams } from '@/lib/queries/streams'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Select } from '@/components/ui/select'
import { cn, formatDate } from '@/lib/utils'
import type { KnowledgePage, WorkStream } from '@/types'

export default function KnowledgePage() {
  const [pages, setPages] = useState<KnowledgePage[]>([])
  const [streams, setStreams] = useState<WorkStream[]>([])
  const [selected, setSelected] = useState<KnowledgePage | null>(null)
  const [editing, setEditing] = useState(false)
  const [showNew, setShowNew] = useState(false)
  const [filterStream, setFilterStream] = useState('')
  const [saving, setSaving] = useState(false)
  const [draft, setDraft] = useState({ title: '', content: '', stream_id: '' })

  const load = useCallback(async () => {
    const [p, s] = await Promise.all([getPages(), getStreams()])
    setPages(p)
    setStreams(s)
  }, [])

  useEffect(() => { load() }, [load])

  function openPage(page: KnowledgePage) {
    setSelected(page)
    setDraft({ title: page.title, content: page.content, stream_id: page.stream_id ?? '' })
    setEditing(false)
  }

  async function handleSave() {
    if (!selected) return
    setSaving(true)
    const updated = await updatePage(selected.id, {
      title: draft.title,
      content: draft.content,
      stream_id: draft.stream_id || null,
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

  const filtered = pages.filter((p) => !filterStream || p.stream_id === filterStream)

  return (
    <div className="flex h-screen overflow-hidden">
      {/* Sidebar list */}
      <div className="w-64 border-r border-gray-100 bg-white flex flex-col flex-shrink-0">
        <div className="p-4 border-b border-gray-100">
          <div className="flex items-center justify-between mb-3">
            <h2 className="font-semibold text-gray-900 text-sm flex items-center gap-1.5">
              <BookOpen size={15} /> Knowledge
            </h2>
            <button onClick={() => setShowNew(true)} className="text-indigo-600 hover:text-indigo-700 transition-colors">
              <Plus size={16} />
            </button>
          </div>
          <Select value={filterStream} onChange={(e) => setFilterStream(e.target.value)} className="text-xs">
            <option value="">All streams</option>
            {streams.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
          </Select>
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
                  {stream && (
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
      <div className="flex-1 flex flex-col overflow-hidden">
        {selected ? (
          <>
            <div className="flex items-center justify-between px-4 sm:px-8 py-4 border-b border-gray-100 bg-white">
              {editing ? (
                <Input
                  value={draft.title}
                  onChange={(e) => setDraft({ ...draft, title: e.target.value })}
                  className="text-lg font-bold border-0 shadow-none px-0 focus:ring-0 text-gray-900 flex-1"
                />
              ) : (
                <h1 className="text-lg font-bold text-gray-900 flex-1">{selected.title}</h1>
              )}
              <div className="flex items-center gap-2 ml-4">
                {editing ? (
                  <>
                    <Select
                      value={draft.stream_id}
                      onChange={(e) => setDraft({ ...draft, stream_id: e.target.value })}
                      className="text-xs w-36"
                    >
                      <option value="">No stream</option>
                      {streams.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
                    </Select>
                    <Button size="sm" onClick={handleSave} disabled={saving}>
                      <Save size={13} /> {saving ? 'Saving…' : 'Save'}
                    </Button>
                    <button onClick={() => { setEditing(false); setDraft({ title: selected.title, content: selected.content, stream_id: selected.stream_id ?? '' }) }}
                      className="text-gray-400 hover:text-gray-600 transition-colors">
                      <X size={18} />
                    </button>
                  </>
                ) : (
                  <>
                    <span className="text-xs text-gray-400 flex items-center gap-1">
                      <Clock size={11} /> {formatDate(selected.updated_at)}
                    </span>
                    <Button size="sm" variant="secondary" onClick={() => setEditing(true)}>
                      <Pencil size={13} /> Edit
                    </Button>
                  </>
                )}
              </div>
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
          <div className="flex-1 flex items-center justify-center text-gray-400">
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
                <label className="block text-sm font-medium text-gray-700 mb-1">Work Stream</label>
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
