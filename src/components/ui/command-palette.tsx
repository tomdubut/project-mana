'use client'

import { useEffect, useState, useRef, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { Search, Target, Layers, CheckSquare, BookOpen, X, ArrowRight } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { cn } from '@/lib/utils'
import { useWorkspace } from '@/lib/workspace-context'

interface Result {
  id: string
  type: 'task' | 'project' | 'stream' | 'page'
  title: string
  subtitle?: string
  href: string
  color?: string
}

const TYPE_CONFIG = {
  project: { icon: Target,      label: 'Project',  color: 'text-indigo-500' },
  stream:  { icon: Layers,      label: 'Stream',   color: 'text-blue-500'   },
  task:    { icon: CheckSquare, label: 'Task',     color: 'text-gray-400'   },
  page:    { icon: BookOpen,    label: 'Page',     color: 'text-emerald-500'},
}

export function CommandPalette({ open, onClose }: { open: boolean; onClose: () => void }) {
  const router = useRouter()
  const { activeWorkspace } = useWorkspace()
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<Result[]>([])
  const [loading, setLoading] = useState(false)
  const [active, setActive] = useState(0)
  const inputRef = useRef<HTMLInputElement>(null)
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    if (open) {
      setQuery('')
      setResults([])
      setActive(0)
      setTimeout(() => inputRef.current?.focus(), 50)
    }
  }, [open])

  const search = useCallback(async (q: string) => {
    if (!q.trim()) { setResults([]); return }
    setLoading(true)
    const supabase = createClient()
    const wsId = activeWorkspace?.id

    const [tasks, projects, streams, pages] = await Promise.all([
      (() => {
        let tq = supabase.from('tasks').select('id,title,status,stream:work_streams(name)')
          .ilike('title', `%${q}%`).neq('status', 'done').limit(5)
        if (wsId) tq = tq.eq('workspace_id', wsId)
        return tq
      })(),
      supabase.from('goals').select('id,title')
        .ilike('title', `%${q}%`)
        .eq('archived', false)
        .limit(4),
      supabase.from('work_streams').select('id,name,color')
        .ilike('name', `%${q}%`)
        .eq('archived', false)
        .limit(4),
      supabase.from('knowledge_pages').select('id,title')
        .ilike('title', `%${q}%`)
        .limit(4),
    ])

    const combined: Result[] = [
      ...(projects.data ?? []).map((g: any) => ({
        id: g.id, type: 'project' as const,
        title: g.title, href: `/dashboard/projects/${g.id}`,
      })),
      ...(streams.data ?? []).map((s: any) => ({
        id: s.id, type: 'stream' as const,
        title: s.name, href: `/dashboard/streams/${s.id}`, color: s.color,
      })),
      ...(tasks.data ?? []).map((t: any) => ({
        id: t.id, type: 'task' as const,
        title: t.title, subtitle: t.stream?.name,
        href: `/dashboard/tasks`,
      })),
      ...(pages.data ?? []).map((p: any) => ({
        id: p.id, type: 'page' as const,
        title: p.title, href: `/dashboard/knowledge?page=${p.id}`,
      })),
    ]
    setResults(combined)
    setActive(0)
    setLoading(false)
  }, [activeWorkspace?.id])

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(() => search(query), 200)
    return () => { if (debounceRef.current) clearTimeout(debounceRef.current) }
  }, [query, search])

  function navigate(result: Result) {
    router.push(result.href)
    onClose()
  }

  function handleKey(e: React.KeyboardEvent) {
    if (e.key === 'ArrowDown') { e.preventDefault(); setActive((a) => Math.min(a + 1, results.length - 1)) }
    if (e.key === 'ArrowUp')   { e.preventDefault(); setActive((a) => Math.max(a - 1, 0)) }
    if (e.key === 'Enter' && results[active]) navigate(results[active])
    if (e.key === 'Escape') onClose()
  }

  if (!open) return null

  return (
    <div className="fixed inset-0 z-[100] flex items-start justify-center pt-[15vh] px-4" onClick={onClose}>
      <div
        className="w-full max-w-lg bg-white rounded-2xl shadow-2xl border border-gray-100 overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Input */}
        <div className="flex items-center gap-3 px-4 py-3.5 border-b border-gray-100">
          <Search size={17} className="text-gray-400 flex-shrink-0" />
          <input
            ref={inputRef}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={handleKey}
            placeholder="Search tasks, projects, streams, pages…"
            className="flex-1 text-sm text-gray-900 placeholder-gray-400 outline-none bg-transparent"
          />
          {query && (
            <button onClick={() => setQuery('')} className="text-gray-300 hover:text-gray-500 flex-shrink-0">
              <X size={15} />
            </button>
          )}
          <kbd className="hidden sm:block text-[10px] text-gray-300 border border-gray-200 rounded px-1.5 py-0.5 font-mono">ESC</kbd>
        </div>

        {/* Results */}
        {query && (
          <div className="max-h-[60vh] overflow-y-auto py-2">
            {loading && (
              <p className="text-xs text-gray-400 text-center py-6">Searching…</p>
            )}
            {!loading && results.length === 0 && (
              <p className="text-xs text-gray-400 text-center py-6">No results for "{query}"</p>
            )}
            {!loading && results.length > 0 && (() => {
              const types: Result['type'][] = ['project', 'stream', 'task', 'page']
              return types.map((type) => {
                const group = results.filter((r) => r.type === type)
                if (group.length === 0) return null
                const conf = TYPE_CONFIG[type]
                return (
                  <div key={type} className="mb-1">
                    <p className="px-4 py-1 text-[10px] font-semibold text-gray-400 uppercase tracking-wider">{conf.label}s</p>
                    {group.map((result) => {
                      const idx = results.indexOf(result)
                      const Icon = conf.icon
                      return (
                        <button
                          key={result.id}
                          onClick={() => navigate(result)}
                          onMouseEnter={() => setActive(idx)}
                          className={cn(
                            'w-full flex items-center gap-3 px-4 py-2.5 text-left transition-colors',
                            active === idx ? 'bg-indigo-50' : 'hover:bg-gray-50'
                          )}
                        >
                          {type === 'stream' && result.color ? (
                            <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ backgroundColor: result.color }} />
                          ) : (
                            <Icon size={14} className={cn('flex-shrink-0', conf.color)} />
                          )}
                          <span className="flex-1 min-w-0">
                            <span className="text-sm text-gray-800 truncate block">{result.title}</span>
                            {result.subtitle && (
                              <span className="text-xs text-gray-400">{result.subtitle}</span>
                            )}
                          </span>
                          {active === idx && <ArrowRight size={13} className="text-indigo-400 flex-shrink-0" />}
                        </button>
                      )
                    })}
                  </div>
                )
              })
            })()}
          </div>
        )}

        {!query && (
          <div className="px-4 py-5 text-center text-xs text-gray-400">
            Type to search across all your work
          </div>
        )}
      </div>
    </div>
  )
}
