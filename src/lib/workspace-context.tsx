'use client'

import { createContext, useContext, useEffect, useState, useCallback } from 'react'
import { getWorkspaces, createWorkspace } from '@/lib/queries/workspaces'
import type { Workspace } from '@/types'

const STORAGE_KEY = 'project-mana-workspace'

interface WorkspaceContextValue {
  workspaces: Workspace[]
  activeWorkspace: Workspace | null
  setActiveWorkspaceId: (id: string) => void
  refresh: () => Promise<void>
  createAndSwitch: (name: string, color: string) => Promise<void>
}

const WorkspaceContext = createContext<WorkspaceContextValue>({
  workspaces: [],
  activeWorkspace: null,
  setActiveWorkspaceId: () => {},
  refresh: async () => {},
  createAndSwitch: async () => {},
})

export function WorkspaceProvider({ children }: { children: React.ReactNode }) {
  const [workspaces, setWorkspaces] = useState<Workspace[]>([])
  const [activeId, setActiveId] = useState<string | null>(null)

  const refresh = useCallback(async () => {
    try {
      const list = await getWorkspaces()
      setWorkspaces(list)
      // Restore from localStorage or default to first
      const stored = localStorage.getItem(STORAGE_KEY)
      const valid = list.find((w) => w.id === stored) ?? list[0] ?? null
      setActiveId(valid?.id ?? null)
    } catch {}
  }, [])

  useEffect(() => { refresh() }, [refresh])

  function setActiveWorkspaceId(id: string) {
    setActiveId(id)
    localStorage.setItem(STORAGE_KEY, id)
  }

  async function createAndSwitch(name: string, color: string) {
    const w = await createWorkspace(name, color)
    await refresh()
    setActiveWorkspaceId(w.id)
  }

  const activeWorkspace = workspaces.find((w) => w.id === activeId) ?? null

  return (
    <WorkspaceContext.Provider value={{ workspaces, activeWorkspace, setActiveWorkspaceId, refresh, createAndSwitch }}>
      {children}
    </WorkspaceContext.Provider>
  )
}

export function useWorkspace() {
  return useContext(WorkspaceContext)
}
