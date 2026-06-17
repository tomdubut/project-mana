'use client'

import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { ListTodo, CheckSquare, BarChart2, BookOpen, Settings, LogOut, Zap, Plus, ChevronDown, ChevronRight, Layers, Check } from 'lucide-react'
import { cn, STREAM_COLORS } from '@/lib/utils'
import { createClient } from '@/lib/supabase/client'
import { useEffect, useState } from 'react'
import type { WorkStream } from '@/types'
import { getStreams } from '@/lib/queries/streams'
import { useWorkspace } from '@/lib/workspace-context'

const VIEWS = [
  { key: 'todo',     label: 'To-Do List',  icon: ListTodo  },
  { key: 'tasks',    label: 'Tasks',        icon: CheckSquare },
  { key: 'strategy', label: 'Strategy',     icon: BarChart2 },
  { key: 'knowledge',label: 'Knowledge',    icon: BookOpen  },
]

export function Sidebar() {
  const pathname = usePathname()
  const router = useRouter()
  const [streams, setStreams] = useState<WorkStream[]>([])
  const [streamsOpen, setStreamsOpen] = useState(true)
  const [wsMenuOpen, setWsMenuOpen] = useState(false)
  const [mobileWsOpen, setMobileWsOpen] = useState(false)
  const [showNewWs, setShowNewWs] = useState(false)
  const [newWsName, setNewWsName] = useState('')
  const [newWsColor, setNewWsColor] = useState(STREAM_COLORS[0])
  const [creating, setCreating] = useState(false)

  const { workspaces, activeWorkspace, setActiveWorkspaceId, createAndSwitch } = useWorkspace()

  useEffect(() => {
    getStreams(false, activeWorkspace?.id).then(setStreams).catch(() => {})
  }, [pathname, activeWorkspace?.id])

  async function handleSignOut() {
    const supabase = createClient()
    await supabase.auth.signOut()
    router.push('/login')
  }

  async function handleCreateWorkspace(e: React.FormEvent) {
    e.preventDefault()
    if (!newWsName.trim()) return
    setCreating(true)
    try {
      await createAndSwitch(newWsName.trim(), newWsColor)
      setNewWsName('')
      setNewWsColor(STREAM_COLORS[0])
      setShowNewWs(false)
      setWsMenuOpen(false)
    } catch {}
    setCreating(false)
  }

  const currentView = VIEWS.find((v) => pathname.endsWith(v.key))?.key ?? 'todo'

  const MOBILE_NAV = [
    { key: 'todo',     label: 'To-Do',    icon: ListTodo    },
    { key: 'tasks',    label: 'Tasks',    icon: CheckSquare },
    { key: 'strategy', label: 'Strategy', icon: BarChart2   },
    { key: 'knowledge',label: 'Knowledge',icon: BookOpen    },
  ]

  return (
    <>
    <aside className="hidden md:flex fixed left-0 top-0 h-screen w-56 bg-white border-r border-gray-100 flex-col z-40">
      {/* Logo */}
      <div className="px-4 py-4 border-b border-gray-100">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 bg-indigo-600 rounded-lg flex items-center justify-center">
            <Zap size={14} className="text-white" />
          </div>
          <span className="font-bold text-gray-900 text-sm tracking-tight">ProjectMana</span>
        </div>
      </div>

      {/* Workspace switcher */}
      <div className="px-2 py-2 border-b border-gray-100 relative">
        <button
          onClick={() => { setWsMenuOpen(!wsMenuOpen); setShowNewWs(false) }}
          className="flex items-center justify-between w-full px-3 py-2 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors"
        >
          <div className="flex items-center gap-2 min-w-0">
            <span
              className="w-3 h-3 rounded-full flex-shrink-0"
              style={{ backgroundColor: activeWorkspace?.color ?? '#6366f1' }}
            />
            <span className="truncate">{activeWorkspace?.name ?? 'No workspace'}</span>
          </div>
          <ChevronDown size={14} className={cn('flex-shrink-0 text-gray-400 transition-transform', wsMenuOpen && 'rotate-180')} />
        </button>

        {wsMenuOpen && (
          <>
            <div className="fixed inset-0 z-10" onClick={() => { setWsMenuOpen(false); setShowNewWs(false) }} />
            <div className="absolute left-2 right-2 top-full mt-1 z-20 bg-white border border-gray-100 shadow-lg rounded-xl py-1 overflow-hidden">
              {workspaces.map((ws) => (
                <button
                  key={ws.id}
                  onClick={() => { setActiveWorkspaceId(ws.id); setWsMenuOpen(false) }}
                  className="flex items-center gap-2 w-full px-3 py-2 text-sm text-gray-700 hover:bg-gray-50 transition-colors"
                >
                  <span className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ backgroundColor: ws.color }} />
                  <span className="flex-1 text-left truncate">{ws.name}</span>
                  {activeWorkspace?.id === ws.id && <Check size={13} className="text-indigo-600 flex-shrink-0" />}
                </button>
              ))}
              <div className="border-t border-gray-50 mt-1 pt-1">
                {showNewWs ? (
                  <form onSubmit={handleCreateWorkspace} className="px-3 py-2 space-y-2">
                    <input
                      autoFocus
                      value={newWsName}
                      onChange={(e) => setNewWsName(e.target.value)}
                      placeholder="Workspace name"
                      className="w-full text-xs border border-gray-200 rounded-lg px-2 py-1.5 focus:outline-none focus:border-indigo-400"
                    />
                    <div className="flex gap-1.5 flex-wrap">
                      {STREAM_COLORS.map((color) => (
                        <button
                          key={color}
                          type="button"
                          onClick={() => setNewWsColor(color)}
                          className={cn('w-5 h-5 rounded-full transition-transform', newWsColor === color && 'ring-2 ring-offset-1 ring-gray-400 scale-110')}
                          style={{ backgroundColor: color }}
                        />
                      ))}
                    </div>
                    <div className="flex gap-1.5">
                      <button
                        type="button"
                        onClick={() => setShowNewWs(false)}
                        className="flex-1 text-xs py-1 rounded-lg border border-gray-200 text-gray-500 hover:bg-gray-50"
                      >
                        Cancel
                      </button>
                      <button
                        type="submit"
                        disabled={creating || !newWsName.trim()}
                        className="flex-1 text-xs py-1 rounded-lg bg-indigo-600 text-white hover:bg-indigo-700 disabled:opacity-50"
                      >
                        {creating ? 'Creating…' : 'Create'}
                      </button>
                    </div>
                  </form>
                ) : (
                  <button
                    onClick={() => setShowNewWs(true)}
                    className="flex items-center gap-2 w-full px-3 py-2 text-xs text-gray-400 hover:text-indigo-600 hover:bg-gray-50 transition-colors"
                  >
                    <Plus size={12} /> New workspace
                  </button>
                )}
              </div>
            </div>
          </>
        )}
      </div>

      {/* Main nav */}
      <nav className="px-2 py-3 space-y-0.5">
        {VIEWS.map(({ key, label, icon: Icon }) => (
          <Link
            key={key}
            href={`/dashboard/${key}`}
            className={cn(
              'flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm font-medium transition-colors',
              currentView === key
                ? 'bg-indigo-50 text-indigo-700'
                : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
            )}
          >
            <Icon size={16} />
            {label}
          </Link>
        ))}
      </nav>

      {/* Work Streams */}
      <div className="flex-1 overflow-y-auto px-2 pb-2">
        <button
          onClick={() => setStreamsOpen(!streamsOpen)}
          className="flex items-center justify-between w-full px-3 py-1.5 text-xs font-semibold text-gray-400 uppercase tracking-wider hover:text-gray-600 transition-colors"
        >
          <span className="flex items-center gap-1.5"><Layers size={12} /> Streams</span>
          {streamsOpen ? <ChevronDown size={12} /> : <ChevronRight size={12} />}
        </button>

        {streamsOpen && (
          <div className="space-y-0.5 mt-1">
            {streams.map((s) => (
              <Link
                key={s.id}
                href={`/dashboard/tasks?stream=${s.id}`}
                className="flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm text-gray-600 hover:bg-gray-50 hover:text-gray-900 transition-colors"
              >
                <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ backgroundColor: s.color }} />
                <span className="truncate">{s.name}</span>
              </Link>
            ))}
            <Link
              href="/dashboard/strategy"
              className="flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs text-gray-400 hover:text-indigo-600 transition-colors"
            >
              <Plus size={12} /> New stream
            </Link>
          </div>
        )}
      </div>

      {/* Bottom */}
      <div className="px-2 py-3 border-t border-gray-100 space-y-0.5">
        <Link
          href="/dashboard/settings"
          className={cn(
            'flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm font-medium transition-colors',
            pathname.endsWith('settings')
              ? 'bg-indigo-50 text-indigo-700'
              : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
          )}
        >
          <Settings size={16} /> Settings
        </Link>
        <button
          onClick={handleSignOut}
          className="flex items-center gap-2.5 w-full px-3 py-2 rounded-lg text-sm font-medium text-gray-600 hover:bg-gray-50 hover:text-gray-900 transition-colors"
        >
          <LogOut size={16} /> Sign out
        </button>
      </div>
    </aside>

    {/* Mobile bottom nav */}
    <nav className="fixed bottom-0 left-0 right-0 z-50 bg-white border-t border-gray-200 flex md:hidden">
      {MOBILE_NAV.map(({ key, label, icon: Icon }) => (
        <Link
          key={key}
          href={`/dashboard/${key}`}
          className={cn(
            'flex-1 flex flex-col items-center justify-center py-2 gap-1 text-xs font-medium transition-colors',
            currentView === key
              ? 'text-indigo-600'
              : 'text-gray-500 hover:text-gray-900'
          )}
        >
          <Icon size={20} />
          {label}
        </Link>
      ))}
      <button
        onClick={() => { setMobileWsOpen(true); setShowNewWs(false) }}
        className="flex-1 flex flex-col items-center justify-center py-2 gap-1 text-xs font-medium text-gray-500 hover:text-gray-900 transition-colors"
      >
        <span
          className="w-5 h-5 rounded-full border-2 border-gray-300"
          style={{ backgroundColor: activeWorkspace?.color ?? '#6366f1' }}
        />
        <span className="truncate max-w-[52px]">{activeWorkspace?.name ?? 'WS'}</span>
      </button>
      <Link
        href="/dashboard/settings"
        className={cn(
          'flex-1 flex flex-col items-center justify-center py-2 gap-1 text-xs font-medium transition-colors',
          pathname.endsWith('settings')
            ? 'text-indigo-600'
            : 'text-gray-500 hover:text-gray-900'
        )}
      >
        <Settings size={20} />
        Settings
      </Link>
    </nav>

    {/* Mobile workspace bottom sheet */}
    {mobileWsOpen && (
      <>
        <div className="fixed inset-0 z-50 bg-black/40 md:hidden" onClick={() => { setMobileWsOpen(false); setShowNewWs(false) }} />
        <div className="fixed bottom-0 left-0 right-0 z-50 bg-white rounded-t-2xl shadow-2xl md:hidden">
          <div className="flex items-center justify-between px-4 pt-4 pb-2 border-b border-gray-100">
            <span className="text-sm font-semibold text-gray-900">Switch Workspace</span>
            <button onClick={() => { setMobileWsOpen(false); setShowNewWs(false) }} className="text-gray-400 hover:text-gray-600 p-1">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
            </button>
          </div>
          <div className="px-2 py-2 space-y-0.5 max-h-64 overflow-y-auto">
            {workspaces.map((ws) => (
              <button
                key={ws.id}
                onClick={() => { setActiveWorkspaceId(ws.id); setMobileWsOpen(false) }}
                className="flex items-center gap-3 w-full px-3 py-3 rounded-xl text-sm text-gray-700 hover:bg-gray-50 transition-colors"
              >
                <span className="w-3 h-3 rounded-full flex-shrink-0" style={{ backgroundColor: ws.color }} />
                <span className="flex-1 text-left font-medium">{ws.name}</span>
                {activeWorkspace?.id === ws.id && <Check size={15} className="text-indigo-600 flex-shrink-0" />}
              </button>
            ))}
          </div>
          <div className="px-2 pb-4 pt-1 border-t border-gray-50">
            {showNewWs ? (
              <form onSubmit={handleCreateWorkspace} className="px-3 py-2 space-y-2">
                <input
                  autoFocus
                  value={newWsName}
                  onChange={(e) => setNewWsName(e.target.value)}
                  placeholder="Workspace name"
                  className="w-full text-sm border border-gray-200 rounded-xl px-3 py-2 focus:outline-none focus:border-indigo-400"
                />
                <div className="flex gap-2 flex-wrap">
                  {STREAM_COLORS.map((color) => (
                    <button
                      key={color}
                      type="button"
                      onClick={() => setNewWsColor(color)}
                      className={cn('w-6 h-6 rounded-full transition-transform', newWsColor === color && 'ring-2 ring-offset-1 ring-gray-400 scale-110')}
                      style={{ backgroundColor: color }}
                    />
                  ))}
                </div>
                <div className="flex gap-2">
                  <button type="button" onClick={() => setShowNewWs(false)} className="flex-1 py-2 text-sm rounded-xl border border-gray-200 text-gray-500">Cancel</button>
                  <button type="submit" disabled={creating || !newWsName.trim()} className="flex-1 py-2 text-sm rounded-xl bg-indigo-600 text-white disabled:opacity-50">{creating ? 'Creating…' : 'Create'}</button>
                </div>
              </form>
            ) : (
              <button
                onClick={() => setShowNewWs(true)}
                className="flex items-center gap-2 w-full px-3 py-3 text-sm text-gray-400 hover:text-indigo-600 hover:bg-gray-50 rounded-xl transition-colors"
              >
                <Plus size={14} /> New workspace
              </button>
            )}
          </div>
        </div>
      </>
    )}
    </>
  )
}
