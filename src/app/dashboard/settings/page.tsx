'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Plus, Trash2, Copy, Check, Key, Pencil, X, Layers } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { useWorkspace } from '@/lib/workspace-context'
import { updateWorkspace, deleteWorkspace } from '@/lib/queries/workspaces'
import { cn, STREAM_COLORS } from '@/lib/utils'
import type { ApiToken, Workspace } from '@/types'

export default function SettingsPage() {
  const [user, setUser] = useState<{ email?: string; id?: string } | null>(null)
  const [tokens, setTokens] = useState<ApiToken[]>([])
  const [newTokenName, setNewTokenName] = useState('')
  const [createdToken, setCreatedToken] = useState<string | null>(null)
  const [creating, setCreating] = useState(false)
  const [copied, setCopied] = useState(false)

  const { workspaces, activeWorkspace, setActiveWorkspaceId, refresh: refreshWorkspaces, createAndSwitch } = useWorkspace()
  const [editingWsId, setEditingWsId] = useState<string | null>(null)
  const [editWsName, setEditWsName] = useState('')
  const [editWsColor, setEditWsColor] = useState(STREAM_COLORS[0])
  const [newWsName, setNewWsName] = useState('')
  const [newWsColor, setNewWsColor] = useState(STREAM_COLORS[0])
  const [creatingWs, setCreatingWs] = useState(false)

  useEffect(() => {
    const supabase = createClient()
    supabase.auth.getUser().then(({ data }) => setUser(data.user ?? null))
    loadTokens()
  }, [])

  async function loadTokens() {
    const res = await fetch('/api/v1/tokens')
    if (res.ok) setTokens(await res.json())
  }

  async function createToken(e: React.FormEvent) {
    e.preventDefault()
    if (!newTokenName.trim()) return
    setCreating(true)
    const res = await fetch('/api/v1/tokens', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ name: newTokenName.trim() }),
    })
    if (res.ok) {
      const data = await res.json()
      setCreatedToken(data.token)
      setNewTokenName('')
      loadTokens()
    }
    setCreating(false)
  }

  async function deleteToken(id: string) {
    if (!confirm('Revoke this token?')) return
    await fetch(`/api/v1/tokens/${id}`, { method: 'DELETE' })
    loadTokens()
  }

  async function copyToken() {
    if (!createdToken) return
    await navigator.clipboard.writeText(createdToken)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  function startEditWs(ws: Workspace) {
    setEditingWsId(ws.id)
    setEditWsName(ws.name)
    setEditWsColor(ws.color)
  }

  async function saveEditWs(id: string) {
    if (!editWsName.trim()) return
    await updateWorkspace(id, { name: editWsName.trim(), color: editWsColor })
    setEditingWsId(null)
    refreshWorkspaces()
  }

  async function handleDeleteWs(id: string) {
    if (workspaces.length <= 1) return
    if (!confirm('Delete this workspace? All its data (goals, tasks, streams, pages) will be deleted.')) return
    await deleteWorkspace(id)
    if (activeWorkspace?.id === id) {
      const next = workspaces.find((w) => w.id !== id)
      if (next) setActiveWorkspaceId(next.id)
    }
    refreshWorkspaces()
  }

  async function handleCreateWs(e: React.FormEvent) {
    e.preventDefault()
    if (!newWsName.trim()) return
    setCreatingWs(true)
    try {
      await createAndSwitch(newWsName.trim(), newWsColor)
      setNewWsName('')
      setNewWsColor(STREAM_COLORS[0])
    } catch {}
    setCreatingWs(false)
  }

  return (
    <div className="max-w-2xl mx-auto px-4 sm:px-8 py-8 space-y-8">
      <h1 className="text-xl font-bold text-gray-900">Settings</h1>

      {/* Account */}
      <section className="bg-white rounded-xl border border-gray-100 p-6">
        <h2 className="font-semibold text-gray-900 mb-4">Account</h2>
        <div className="space-y-3">
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1">Email</label>
            <p className="text-sm text-gray-800 bg-gray-50 rounded-lg px-3 py-2 border border-gray-200">{user?.email}</p>
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1">User ID</label>
            <p className="text-xs font-mono text-gray-400 bg-gray-50 rounded-lg px-3 py-2 border border-gray-200 break-all">{user?.id}</p>
          </div>
        </div>
      </section>

      {/* Workspaces */}
      <section className="bg-white rounded-xl border border-gray-100 p-6">
        <div className="flex items-center gap-2 mb-1">
          <Layers size={16} className="text-indigo-500" />
          <h2 className="font-semibold text-gray-900">Workspaces</h2>
        </div>
        <p className="text-xs text-gray-500 mb-5">Separate spaces for different areas of your life. Each workspace has its own goals, streams, tasks, and knowledge pages.</p>

        <div className="space-y-2 mb-4">
          {workspaces.map((ws) => (
            <div key={ws.id} className="flex items-center gap-3 px-3 py-2.5 bg-gray-50 rounded-lg border border-gray-200">
              {editingWsId === ws.id ? (
                <>
                  <div className="flex gap-1 flex-wrap flex-shrink-0">
                    {STREAM_COLORS.map((color) => (
                      <button
                        key={color}
                        type="button"
                        onClick={() => setEditWsColor(color)}
                        className={cn('w-4 h-4 rounded-full transition-transform', editWsColor === color && 'ring-2 ring-offset-1 ring-gray-400 scale-110')}
                        style={{ backgroundColor: color }}
                      />
                    ))}
                  </div>
                  <Input
                    value={editWsName}
                    onChange={(e) => setEditWsName(e.target.value)}
                    className="flex-1 text-sm py-1"
                    autoFocus
                    onKeyDown={(e) => { if (e.key === 'Enter') saveEditWs(ws.id); if (e.key === 'Escape') setEditingWsId(null) }}
                  />
                  <button onClick={() => saveEditWs(ws.id)} className="text-indigo-600 hover:text-indigo-700 p-1"><Check size={14} /></button>
                  <button onClick={() => setEditingWsId(null)} className="text-gray-400 hover:text-gray-600 p-1"><X size={14} /></button>
                </>
              ) : (
                <>
                  <span className="w-3 h-3 rounded-full flex-shrink-0" style={{ backgroundColor: ws.color }} />
                  <span className="flex-1 text-sm font-medium text-gray-800">{ws.name}</span>
                  {activeWorkspace?.id === ws.id && (
                    <span className="text-xs px-1.5 py-0.5 bg-indigo-50 text-indigo-600 rounded font-medium">Active</span>
                  )}
                  <button onClick={() => startEditWs(ws)} className="text-gray-400 hover:text-gray-600 p-1 transition-colors"><Pencil size={13} /></button>
                  <button
                    onClick={() => handleDeleteWs(ws.id)}
                    disabled={workspaces.length <= 1}
                    className="text-gray-400 hover:text-red-500 p-1 transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
                  ><Trash2 size={13} /></button>
                </>
              )}
            </div>
          ))}
        </div>

        <form onSubmit={handleCreateWs} className="space-y-2 border-t border-gray-100 pt-4">
          <p className="text-xs font-medium text-gray-500">New workspace</p>
          <div className="flex gap-1 flex-wrap">
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
          <div className="flex gap-2">
            <Input
              value={newWsName}
              onChange={(e) => setNewWsName(e.target.value)}
              placeholder="Workspace name"
              className="flex-1"
            />
            <Button type="submit" disabled={creatingWs || !newWsName.trim()} size="sm">
              <Plus size={14} /> {creatingWs ? 'Creating…' : 'Create'}
            </Button>
          </div>
        </form>
      </section>

      {/* API Tokens */}
      <section className="bg-white rounded-xl border border-gray-100 p-6">
        <div className="flex items-center gap-2 mb-1">
          <Key size={16} className="text-indigo-500" />
          <h2 className="font-semibold text-gray-900">API Tokens</h2>
        </div>
        <p className="text-xs text-gray-500 mb-5">
          Use these tokens to let Claude AI manage your tasks from external conversations.
          Pass as <code className="bg-gray-100 px-1 rounded text-gray-700">Authorization: Bearer &lt;token&gt;</code>
        </p>

        {/* Base URL info */}
        <div className="mb-5 bg-gray-50 rounded-lg border border-gray-200 p-3 text-xs">
          <p className="font-medium text-gray-700 mb-1">API Base URL</p>
          <code className="text-gray-600 break-all">{typeof window !== 'undefined' ? window.location.origin : ''}/api/v1</code>
          <p className="mt-2 font-medium text-gray-700 mb-1">Example</p>
          <code className="text-gray-600">POST /api/v1/tasks — create a task</code><br />
          <code className="text-gray-600">GET /api/v1/tasks?open_only=true — open tasks</code><br />
          <code className="text-gray-600">PATCH /api/v1/tasks/:id — update status/priority</code>
        </div>

        {/* Created token alert */}
        {createdToken && (
          <div className="mb-5 bg-amber-50 border border-amber-200 rounded-xl p-4">
            <p className="text-sm font-semibold text-amber-800 mb-2">Copy your token now — it won&apos;t be shown again</p>
            <div className="flex items-center gap-2">
              <code className="flex-1 text-xs bg-white border border-amber-200 rounded-lg px-3 py-2 font-mono text-amber-700 truncate">
                {createdToken}
              </code>
              <button onClick={copyToken} className="flex-shrink-0 p-2 rounded-lg bg-amber-100 hover:bg-amber-200 text-amber-700 transition-colors">
                {copied ? <Check size={15} /> : <Copy size={15} />}
              </button>
            </div>
            <button onClick={() => setCreatedToken(null)} className="mt-2 text-xs text-amber-600 hover:underline">Dismiss</button>
          </div>
        )}

        {/* Create form */}
        <form onSubmit={createToken} className="flex gap-2 mb-4">
          <Input
            value={newTokenName}
            onChange={(e) => setNewTokenName(e.target.value)}
            placeholder="Token name (e.g. Claude AI)"
            className="flex-1"
          />
          <Button type="submit" disabled={creating || !newTokenName.trim()} size="sm">
            <Plus size={14} /> Generate
          </Button>
        </form>

        {/* Token list */}
        {tokens.length === 0 ? (
          <p className="text-sm text-gray-400 text-center py-4">No tokens yet</p>
        ) : (
          <div className="space-y-2">
            {tokens.map((token) => (
              <div key={token.id} className="flex items-center justify-between px-3 py-2.5 bg-gray-50 rounded-lg border border-gray-200">
                <div>
                  <p className="text-sm font-medium text-gray-800">{token.name}</p>
                  <p className="text-xs text-gray-400">
                    Created {new Date(token.created_at).toLocaleDateString()}
                    {token.last_used && ` · Last used ${new Date(token.last_used).toLocaleDateString()}`}
                  </p>
                </div>
                <button
                  onClick={() => deleteToken(token.id)}
                  className="text-gray-400 hover:text-red-500 transition-colors p-1"
                >
                  <Trash2 size={15} />
                </button>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  )
}
