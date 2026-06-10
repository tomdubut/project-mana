'use client'

import Link from 'next/link'
import { usePathname, useSearchParams, useRouter } from 'next/navigation'
import { ListTodo, CheckSquare, BarChart2, BookOpen, Settings, LogOut, Zap, Plus, ChevronDown, ChevronRight, Layers } from 'lucide-react'
import { cn } from '@/lib/utils'
import { createClient } from '@/lib/supabase/client'
import { useEffect, useState } from 'react'
import type { WorkStream } from '@/types'
import { getStreams } from '@/lib/queries/streams'

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

  useEffect(() => {
    getStreams().then(setStreams).catch(() => {})
  }, [pathname]) // refresh when navigating (new stream created elsewhere)

  async function handleSignOut() {
    const supabase = createClient()
    await supabase.auth.signOut()
    router.push('/login')
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
    </>
  )
}
