'use client'

import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { ListTodo, CheckSquare, BookOpen, Settings, LogOut, Zap, Plus, ChevronDown, ChevronRight, Check, Home, Target, FolderOpen, Layers } from 'lucide-react'
import { cn, STREAM_COLORS, isOverdue } from '@/lib/utils'
import { createClient } from '@/lib/supabase/client'
import { useEffect, useState } from 'react'
import type { WorkStream, Project } from '@/types'
import { getStreams } from '@/lib/queries/streams'
import { getProjects } from '@/lib/queries/goals'
import { getTasks } from '@/lib/queries/tasks'
import { useWorkspace } from '@/lib/workspace-context'

const VIEWS = [
  { key: 'home',      label: 'Home',        icon: Home       },
  { key: 'todo',      label: 'To-Do List',  icon: ListTodo   },
  { key: 'tasks',     label: 'Tasks',       icon: CheckSquare },
  { key: 'knowledge', label: 'Knowledge',   icon: BookOpen   },
]

export function Sidebar() {
  const pathname = usePathname()
  const router = useRouter()
  const [streams, setStreams] = useState<WorkStream[]>([])
  const [projects, setProjects] = useState<Project[]>([])
  const [taskCounts, setTaskCounts] = useState<Record<string, number>>({})
  const [overdueCount, setOverdueCount] = useState(0)
  const [expandedProjects, setExpandedProjects] = useState<Set<string>>(new Set())
  const [projectsOpen, setProjectsOpen] = useState(true)
  const [wsMenuOpen, setWsMenuOpen] = useState(false)
  const [mobileWsOpen, setMobileWsOpen] = useState(false)
  const [mobileProjectsOpen, setMobileProjectsOpen] = useState(false)
  const [mobileExpandedProjects, setMobileExpandedProjects] = useState<Set<string>>(new Set())
  const [showNewWs, setShowNewWs] = useState(false)
  const [newWsName, setNewWsName] = useState('')
  const [newWsColor, setNewWsColor] = useState(STREAM_COLORS[0])
  const [creating, setCreating] = useState(false)

  const { workspaces, activeWorkspace, setActiveWorkspaceId, createAndSwitch } = useWorkspace()

  useEffect(() => {
    Promise.all([
      getProjects(activeWorkspace?.id),
      getStreams(false, activeWorkspace?.id),
      getTasks({ openOnly: true, workspaceId: activeWorkspace?.id }),
    ]).then(([p, s, t]) => {
      setProjects(p)
      setStreams(s)
      const counts: Record<string, number> = {}
      for (const task of t) {
        if (task.stream_id) counts[task.stream_id] = (counts[task.stream_id] ?? 0) + 1
      }
      setTaskCounts(counts)
      setOverdueCount(t.filter((task) => isOverdue(task.due_date, task.status)).length)

      // Auto-expand the project whose stream or page is currently active
      const activeStreamId = pathname.match(/\/streams\/([^/]+)/)?.[1]
      const activeProjectId = pathname.match(/\/projects\/([^/]+)/)?.[1]
      if (activeStreamId) {
        const stream = s.find((st) => st.id === activeStreamId)
        if (stream?.goal_id) setExpandedProjects((prev) => new Set([...prev, stream.goal_id!]))
      }
      if (activeProjectId) {
        setExpandedProjects((prev) => new Set([...prev, activeProjectId]))
      }
    }).catch(() => {})
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

  function toggleProject(projectId: string) {
    setExpandedProjects((prev) => {
      const next = new Set(prev)
      if (next.has(projectId)) next.delete(projectId)
      else next.add(projectId)
      return next
    })
  }

  const currentView = VIEWS.find((v) => pathname.endsWith(v.key))?.key ?? 'home'

  // Streams with no project
  const unassignedStreams = streams.filter((s) => !s.goal_id)

  const MOBILE_NAV = [
    { key: 'home',  label: 'Home',  icon: Home        },
    { key: 'todo',  label: 'To-Do', icon: ListTodo    },
    { key: 'tasks', label: 'Tasks', icon: CheckSquare },
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
            <span className="w-3 h-3 rounded-full flex-shrink-0" style={{ backgroundColor: activeWorkspace?.color ?? '#6366f1' }} />
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
                      <button type="button" onClick={() => setShowNewWs(false)} className="flex-1 text-xs py-1 rounded-lg border border-gray-200 text-gray-500 hover:bg-gray-50">Cancel</button>
                      <button type="submit" disabled={creating || !newWsName.trim()} className="flex-1 text-xs py-1 rounded-lg bg-indigo-600 text-white hover:bg-indigo-700 disabled:opacity-50">{creating ? 'Creating…' : 'Create'}</button>
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
      <nav className="px-2 py-3 space-y-0.5 border-b border-gray-100">
        {VIEWS.map(({ key, label, icon: Icon }) => (
          <Link
            key={key}
            href={`/dashboard/${key}`}
            className={cn(
              'flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm font-medium transition-colors',
              currentView === key ? 'bg-indigo-50 text-indigo-700' : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
            )}
          >
            <Icon size={16} />
            <span className="flex-1">{label}</span>
            {key === 'tasks' && overdueCount > 0 && (
              <span className="text-xs font-bold bg-red-500 text-white px-1.5 py-0.5 rounded-full leading-none">{overdueCount}</span>
            )}
          </Link>
        ))}
      </nav>

      {/* Projects + Streams */}
      <div className="flex-1 overflow-y-auto px-2 py-2">
        <div className="flex items-center justify-between px-3 py-1.5 mb-1">
          <button
            onClick={() => setProjectsOpen(!projectsOpen)}
            className="flex items-center gap-1.5 text-xs font-semibold text-gray-400 uppercase tracking-wider hover:text-gray-600 transition-colors"
          >
            {projectsOpen ? <ChevronDown size={12} /> : <ChevronRight size={12} />}
            Projects
          </button>
          <Link href="/dashboard/strategy" className="text-gray-300 hover:text-indigo-500 transition-colors" title="Manage projects">
            <Plus size={13} />
          </Link>
        </div>

        {projectsOpen && (
          <div className="space-y-0.5">
            {projects.map((project) => {
              const projectStreams = streams.filter((s) => s.goal_id === project.id)
              const isExpanded = expandedProjects.has(project.id)
              const isActiveProject = pathname.includes(`/projects/${project.id}`)

              return (
                <div key={project.id}>
                  {/* Project row */}
                  <div className={cn(
                    'flex items-center gap-1 rounded-lg transition-colors group',
                    isActiveProject ? 'bg-indigo-50' : 'hover:bg-gray-50'
                  )}>
                    <button
                      onClick={() => toggleProject(project.id)}
                      className="flex-shrink-0 p-1.5 text-gray-300 hover:text-gray-500 transition-colors"
                    >
                      {projectStreams.length > 0
                        ? (isExpanded ? <ChevronDown size={12} /> : <ChevronRight size={12} />)
                        : <span className="w-3 h-3 block" />
                      }
                    </button>
                    <Link
                      href={`/dashboard/projects/${project.id}`}
                      className={cn(
                        'flex items-center gap-2 flex-1 min-w-0 py-1.5 pr-2 text-sm font-medium transition-colors',
                        isActiveProject ? 'text-indigo-700' : 'text-gray-700 hover:text-gray-900'
                      )}
                    >
                      <Target size={13} className={cn('flex-shrink-0', isActiveProject ? 'text-indigo-500' : 'text-gray-400')} />
                      <span className="truncate">{project.title}</span>
                    </Link>
                    {project.task_count !== undefined && project.task_count > 0 && (
                      <span className="text-xs text-gray-400 flex-shrink-0 pr-2">{project.task_count}</span>
                    )}
                  </div>

                  {/* Nested streams */}
                  {isExpanded && projectStreams.length > 0 && (
                    <div className="ml-4 space-y-0.5 mb-1">
                      {projectStreams.map((s) => {
                        const isActive = pathname.includes(`/streams/${s.id}`)
                        const count = taskCounts[s.id] ?? 0
                        return (
                          <Link
                            key={s.id}
                            href={`/dashboard/streams/${s.id}`}
                            className={cn(
                              'flex items-center gap-2 pl-3 pr-2 py-1.5 rounded-lg text-sm transition-colors',
                              isActive ? 'bg-indigo-50 text-indigo-700' : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
                            )}
                          >
                            <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ backgroundColor: s.color }} />
                            <span className="truncate flex-1 text-xs">{s.name}</span>
                            {count > 0 && (
                              <span className={cn('text-xs px-1.5 py-0.5 rounded-full font-medium flex-shrink-0', isActive ? 'bg-indigo-100 text-indigo-600' : 'bg-gray-100 text-gray-500')}>
                                {count}
                              </span>
                            )}
                          </Link>
                        )
                      })}
                    </div>
                  )}
                </div>
              )
            })}

            {/* Unassigned streams */}
            {unassignedStreams.length > 0 && (
              <div className="mt-1">
                <p className="px-3 pt-1 pb-0.5 text-xs text-gray-300 font-medium flex items-center gap-1.5">
                  <FolderOpen size={10} /> Other streams
                </p>
                <div className="space-y-0.5">
                  {unassignedStreams.map((s) => {
                    const isActive = pathname.includes(`/streams/${s.id}`)
                    const count = taskCounts[s.id] ?? 0
                    return (
                      <Link
                        key={s.id}
                        href={`/dashboard/streams/${s.id}`}
                        className={cn(
                          'flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm transition-colors',
                          isActive ? 'bg-indigo-50 text-indigo-700' : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
                        )}
                      >
                        <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ backgroundColor: s.color }} />
                        <span className="truncate flex-1 text-xs">{s.name}</span>
                        {count > 0 && (
                          <span className={cn('text-xs px-1.5 py-0.5 rounded-full font-medium flex-shrink-0', isActive ? 'bg-indigo-100 text-indigo-600' : 'bg-gray-100 text-gray-500')}>
                            {count}
                          </span>
                        )}
                      </Link>
                    )
                  })}
                </div>
              </div>
            )}

            {projects.length === 0 && unassignedStreams.length === 0 && (
              <p className="px-3 py-2 text-xs text-gray-400 italic">No projects yet</p>
            )}
          </div>
        )}
      </div>

      {/* Bottom */}
      <div className="px-2 py-3 border-t border-gray-100 space-y-0.5">
        <Link
          href="/dashboard/settings"
          className={cn(
            'flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm font-medium transition-colors',
            pathname.endsWith('settings') ? 'bg-indigo-50 text-indigo-700' : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
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
    <nav className="fixed bottom-0 left-0 right-0 z-50 bg-white border-t border-gray-200 flex md:hidden pb-safe">
      {MOBILE_NAV.map(({ key, label, icon: Icon }) => (
        <Link
          key={key}
          href={`/dashboard/${key}`}
          className={cn(
            'flex-1 flex flex-col items-center justify-center py-2 gap-1 text-xs font-medium transition-colors',
            currentView === key ? 'text-indigo-600' : 'text-gray-500 hover:text-gray-900'
          )}
        >
          <div className="relative">
            <Icon size={20} />
            {key === 'tasks' && overdueCount > 0 && (
              <span className="absolute -top-1 -right-2 text-[10px] font-bold bg-red-500 text-white px-1 rounded-full leading-tight">{overdueCount}</span>
            )}
          </div>
          {label}
        </Link>
      ))}
      {/* Projects */}
      <button
        onClick={() => { setMobileProjectsOpen(true) }}
        className={cn(
          'flex-1 flex flex-col items-center justify-center py-2 gap-1 text-xs font-medium transition-colors',
          pathname.includes('/projects') ? 'text-indigo-600' : 'text-gray-500 hover:text-gray-900'
        )}
      >
        <Layers size={20} />
        Projects
      </button>
      {/* Workspace */}
      <button
        onClick={() => { setMobileWsOpen(true); setShowNewWs(false) }}
        className="flex-1 flex flex-col items-center justify-center py-2 gap-1 text-xs font-medium text-gray-500 hover:text-gray-900 transition-colors"
      >
        <span className="w-5 h-5 rounded-full border-2 border-gray-300" style={{ backgroundColor: activeWorkspace?.color ?? '#6366f1' }} />
        <span className="truncate max-w-[52px]">{activeWorkspace?.name ?? 'WS'}</span>
      </button>
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

    {/* Mobile projects bottom sheet */}
    {mobileProjectsOpen && (
      <>
        <div className="fixed inset-0 z-50 bg-black/40 md:hidden" onClick={() => setMobileProjectsOpen(false)} />
        <div className="fixed bottom-0 left-0 right-0 z-50 bg-white rounded-t-2xl shadow-2xl md:hidden max-h-[80vh] flex flex-col">
          <div className="flex items-center justify-between px-4 pt-4 pb-2 border-b border-gray-100 flex-shrink-0">
            <span className="text-sm font-semibold text-gray-900">Projects</span>
            <button onClick={() => setMobileProjectsOpen(false)} className="text-gray-400 hover:text-gray-600 p-1">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
            </button>
          </div>
          <div className="overflow-y-auto flex-1 px-2 py-2 space-y-0.5">
            {projects.length === 0 && (
              <p className="px-3 py-4 text-sm text-gray-400 text-center italic">No projects yet</p>
            )}
            {projects.map((project) => {
              const projectStreams = streams.filter((s) => s.goal_id === project.id)
              const isExpanded = mobileExpandedProjects.has(project.id)
              return (
                <div key={project.id}>
                  <div className="flex items-center gap-1 rounded-xl hover:bg-gray-50">
                    <button
                      onClick={() => setMobileExpandedProjects((prev) => {
                        const next = new Set(prev)
                        if (next.has(project.id)) next.delete(project.id)
                        else next.add(project.id)
                        return next
                      })}
                      className="flex-shrink-0 p-2 text-gray-300"
                    >
                      {projectStreams.length > 0
                        ? (isExpanded ? <ChevronDown size={14} /> : <ChevronRight size={14} />)
                        : <span className="w-3.5 h-3.5 block" />}
                    </button>
                    <Link
                      href={`/dashboard/projects/${project.id}`}
                      onClick={() => setMobileProjectsOpen(false)}
                      className="flex items-center gap-2 flex-1 min-w-0 py-2.5 pr-2 text-sm font-medium text-gray-800"
                    >
                      <Target size={14} className="text-indigo-400 flex-shrink-0" />
                      <span className="truncate">{project.title}</span>
                    </Link>
                    {project.task_count !== undefined && project.task_count > 0 && (
                      <span className="text-xs text-gray-400 flex-shrink-0 pr-3">{project.task_count}</span>
                    )}
                  </div>
                  {isExpanded && projectStreams.map((s) => {
                    const count = taskCounts[s.id] ?? 0
                    return (
                      <Link
                        key={s.id}
                        href={`/dashboard/streams/${s.id}`}
                        onClick={() => setMobileProjectsOpen(false)}
                        className="flex items-center gap-2 pl-10 pr-3 py-2.5 rounded-xl hover:bg-gray-50 text-sm text-gray-600"
                      >
                        <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ backgroundColor: s.color }} />
                        <span className="truncate flex-1">{s.name}</span>
                        {count > 0 && <span className="text-xs bg-gray-100 text-gray-500 px-1.5 py-0.5 rounded-full">{count}</span>}
                      </Link>
                    )
                  })}
                </div>
              )
            })}
            {unassignedStreams.length > 0 && (
              <div className="mt-2 border-t border-gray-50 pt-2">
                <p className="px-3 pb-1 text-xs text-gray-400 font-medium">Other streams</p>
                {unassignedStreams.map((s) => {
                  const count = taskCounts[s.id] ?? 0
                  return (
                    <Link
                      key={s.id}
                      href={`/dashboard/streams/${s.id}`}
                      onClick={() => setMobileProjectsOpen(false)}
                      className="flex items-center gap-2 px-3 py-2.5 rounded-xl hover:bg-gray-50 text-sm text-gray-600"
                    >
                      <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ backgroundColor: s.color }} />
                      <span className="truncate flex-1">{s.name}</span>
                      {count > 0 && <span className="text-xs bg-gray-100 text-gray-500 px-1.5 py-0.5 rounded-full">{count}</span>}
                    </Link>
                  )
                })}
              </div>
            )}
          </div>
          <div className="px-4 py-3 border-t border-gray-100 flex-shrink-0">
            <Link
              href="/dashboard/strategy"
              onClick={() => setMobileProjectsOpen(false)}
              className="flex items-center justify-center gap-2 w-full py-2.5 text-sm text-indigo-600 font-medium rounded-xl border border-indigo-100 hover:bg-indigo-50 transition-colors"
            >
              <Plus size={14} /> New project
            </Link>
          </div>
        </div>
      </>
    )}
    </>
  )
}
