'use client'

import { useState, useRef, useEffect, useCallback } from 'react'
import { MessageSquare, X, Send, Loader2, Sparkles, CheckCircle2 } from 'lucide-react'
import { cn } from '@/lib/utils'

interface Message {
  role: 'user' | 'assistant'
  content: string
  toolActions?: { name: string; result?: string }[]
}

const TOOL_LABELS: Record<string, string> = {
  get_context: 'Reading workspace data',
  list_workspaces: 'Listing workspaces',
  list_tasks: 'Listing tasks',
  create_task: 'Creating task',
  update_task: 'Updating task',
  delete_task: 'Deleting task',
  list_projects: 'Listing projects',
  create_project: 'Creating project',
  update_project: 'Updating project',
  delete_project: 'Deleting project',
  list_streams: 'Listing streams',
  create_stream: 'Creating stream',
  update_stream: 'Updating stream',
  delete_stream: 'Deleting stream',
  list_pages: 'Listing pages',
  create_page: 'Creating page',
  update_page: 'Updating page',
  delete_page: 'Deleting page',
}

function ToolChip({ name, done }: { name: string; done: boolean }) {
  return (
    <span className={cn(
      'inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full font-medium transition-colors',
      done ? 'bg-green-50 text-green-700' : 'bg-indigo-50 text-indigo-600 animate-pulse'
    )}>
      {done ? <CheckCircle2 size={10} /> : <Loader2 size={10} className="animate-spin" />}
      {TOOL_LABELS[name] ?? name}
    </span>
  )
}

function MessageBubble({ msg }: { msg: Message }) {
  const isUser = msg.role === 'user'
  return (
    <div className={cn('flex flex-col gap-1', isUser ? 'items-end' : 'items-start')}>
      {msg.toolActions && msg.toolActions.length > 0 && (
        <div className="flex flex-wrap gap-1 max-w-[85%]">
          {msg.toolActions.map((a, i) => (
            <ToolChip key={i} name={a.name} done={!!a.result} />
          ))}
        </div>
      )}
      {msg.content && (
        <div className={cn(
          'max-w-[85%] rounded-2xl px-3 py-2 text-sm whitespace-pre-wrap break-words',
          isUser
            ? 'bg-indigo-600 text-white rounded-tr-sm'
            : 'bg-white border border-gray-100 text-gray-800 rounded-tl-sm shadow-sm'
        )}>
          {msg.content}
        </div>
      )}
    </div>
  )
}

export function ChatPanel({ open, onClose }: { open: boolean; onClose: () => void }) {
  const [messages, setMessages] = useState<Message[]>([])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const bottomRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLTextAreaElement>(null)

  useEffect(() => {
    if (open) inputRef.current?.focus()
  }, [open])

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  const send = useCallback(async () => {
    const text = input.trim()
    if (!text || loading) return

    const userMsg: Message = { role: 'user', content: text }
    const newMessages = [...messages, userMsg]
    setMessages(newMessages)
    setInput('')
    setLoading(true)

    // placeholder for streaming assistant reply
    const assistantIdx = newMessages.length
    setMessages((prev) => [...prev, { role: 'assistant', content: '', toolActions: [] }])

    try {
      const res = await fetch('/api/internal/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          messages: newMessages.map((m) => ({ role: m.role, content: m.content })),
        }),
      })

      if (!res.ok || !res.body) {
        const err = await res.text()
        setMessages((prev) => {
          const next = [...prev]
          next[assistantIdx] = { role: 'assistant', content: `Error: ${err}` }
          return next
        })
        return
      }

      const reader = res.body.getReader()
      const decoder = new TextDecoder()
      let buf = ''

      while (true) {
        const { value, done } = await reader.read()
        if (done) break
        buf += decoder.decode(value, { stream: true })
        const lines = buf.split('\n')
        buf = lines.pop() ?? ''

        for (const line of lines) {
          if (!line.startsWith('data: ')) continue
          const payload = line.slice(6)
          if (payload === '[DONE]') continue
          try {
            const event = JSON.parse(payload)
            if (event.type === 'text') {
              setMessages((prev) => {
                const next = [...prev]
                next[assistantIdx] = { ...next[assistantIdx], content: next[assistantIdx].content + event.text }
                return next
              })
            } else if (event.type === 'tool_start') {
              setMessages((prev) => {
                const next = [...prev]
                const msg = { ...next[assistantIdx] }
                msg.toolActions = [...(msg.toolActions ?? []), { name: event.name }]
                next[assistantIdx] = msg
                return next
              })
            } else if (event.type === 'tool_done') {
              setMessages((prev) => {
                const next = [...prev]
                const msg = { ...next[assistantIdx] }
                msg.toolActions = (msg.toolActions ?? []).map((a) =>
                  a.name === event.name && !a.result ? { ...a, result: event.result } : a
                )
                next[assistantIdx] = msg
                return next
              })
            }
          } catch {}
        }
      }
    } catch (err: any) {
      setMessages((prev) => {
        const next = [...prev]
        next[assistantIdx] = { role: 'assistant', content: `Network error: ${err.message}` }
        return next
      })
    } finally {
      setLoading(false)
    }
  }, [input, loading, messages])

  function onKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      send()
    }
  }

  return (
    <>
      {/* Backdrop on mobile */}
      {open && <div className="fixed inset-0 z-30 bg-black/40 sm:hidden" onClick={onClose} />}

      {/* Panel */}
      <div className={cn(
        'fixed right-0 bottom-0 z-40 flex flex-col',
        'w-full sm:w-[380px] h-[85vh] sm:h-[600px] sm:bottom-20 sm:right-4 sm:rounded-2xl',
        'bg-white border border-gray-200 shadow-2xl',
        'transition-all duration-300 ease-in-out',
        open ? 'opacity-100 translate-y-0 pointer-events-auto' : 'opacity-0 translate-y-4 pointer-events-none'
      )}>
        {/* Header */}
        <div className="flex items-center gap-2 px-4 py-3 border-b border-gray-100 flex-shrink-0">
          <Sparkles size={16} className="text-indigo-500" />
          <span className="font-semibold text-sm text-gray-800 flex-1">AI Assistant</span>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 transition-colors p-1">
            <X size={16} />
          </button>
        </div>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto px-4 py-4 space-y-3 min-h-0">
          {messages.length === 0 && (
            <div className="flex flex-col items-center justify-center h-full text-center text-gray-400 gap-3">
              <Sparkles size={32} className="opacity-20" />
              <div>
                <p className="text-sm font-medium text-gray-500">Ask me anything</p>
                <p className="text-xs mt-1">Create tasks, projects, streams, or pages</p>
              </div>
              <div className="flex flex-col gap-1.5 mt-2 w-full max-w-[240px]">
                {[
                  'Create a task: Fix the login bug',
                  'Show my open tasks',
                  'Create project "Website Redesign"',
                ].map((s) => (
                  <button
                    key={s}
                    onClick={() => setInput(s)}
                    className="text-xs text-left px-3 py-2 rounded-xl bg-gray-50 hover:bg-indigo-50 hover:text-indigo-700 text-gray-600 transition-colors"
                  >
                    {s}
                  </button>
                ))}
              </div>
            </div>
          )}
          {messages.map((msg, i) => (
            <MessageBubble key={i} msg={msg} />
          ))}
          <div ref={bottomRef} />
        </div>

        {/* Input */}
        <div className="px-3 pb-3 pt-2 border-t border-gray-100 flex-shrink-0">
          <div className="flex items-end gap-2 bg-gray-50 rounded-xl px-3 py-2">
            <textarea
              ref={inputRef}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={onKeyDown}
              disabled={loading}
              rows={1}
              placeholder="Ask me to create a task, project…"
              className="flex-1 bg-transparent text-sm text-gray-800 placeholder:text-gray-400 resize-none focus:outline-none min-h-[20px] max-h-[100px] overflow-y-auto"
              style={{ fieldSizing: 'content' } as React.CSSProperties}
            />
            <button
              onClick={send}
              disabled={!input.trim() || loading}
              className="flex-shrink-0 w-7 h-7 rounded-lg bg-indigo-600 text-white flex items-center justify-center hover:bg-indigo-700 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
            >
              {loading ? <Loader2 size={13} className="animate-spin" /> : <Send size={13} />}
            </button>
          </div>
          <p className="text-[10px] text-gray-400 mt-1 text-center">Enter to send · Shift+Enter for new line</p>
        </div>
      </div>
    </>
  )
}

export function ChatFAB({ onClick, active }: { onClick: () => void; active: boolean }) {
  return (
    <button
      onClick={onClick}
      className={cn(
        'fixed bottom-[calc(4.5rem+env(safe-area-inset-bottom,0px))] right-4 md:bottom-6',
        'z-30 w-12 h-12 rounded-full shadow-lg flex items-center justify-center transition-all',
        active
          ? 'bg-indigo-700 text-white scale-95'
          : 'bg-indigo-600 text-white hover:bg-indigo-700 hover:scale-105'
      )}
      aria-label="AI Chat"
    >
      {active ? <X size={20} /> : <MessageSquare size={20} />}
    </button>
  )
}
