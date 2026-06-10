'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Plus, Trash2, Copy, Check, Key, Eye, EyeOff } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import type { ApiToken } from '@/types'

export default function SettingsPage() {
  const [user, setUser] = useState<{ email?: string; id?: string } | null>(null)
  const [tokens, setTokens] = useState<ApiToken[]>([])
  const [newTokenName, setNewTokenName] = useState('')
  const [createdToken, setCreatedToken] = useState<string | null>(null)
  const [creating, setCreating] = useState(false)
  const [copied, setCopied] = useState(false)

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
