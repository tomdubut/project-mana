'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Zap } from 'lucide-react'
import Link from 'next/link'

export default function SignupPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [success, setSuccess] = useState(false)
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    setLoading(true)
    const supabase = createClient()
    const { error } = await supabase.auth.signUp({ email, password })
    if (error) {
      setError(error.message)
      setLoading(false)
    } else {
      setSuccess(true)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
      <div className="w-full max-w-sm">
        <div className="flex justify-center mb-8">
          <div className="flex items-center gap-2">
            <div className="w-9 h-9 bg-indigo-600 rounded-xl flex items-center justify-center">
              <Zap size={18} className="text-white" />
            </div>
            <span className="font-bold text-xl text-gray-900">ProjectMana</span>
          </div>
        </div>
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-8">
          {success ? (
            <div className="text-center">
              <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <span className="text-green-600 text-xl">✓</span>
              </div>
              <h2 className="font-semibold text-gray-900 mb-2">Check your email</h2>
              <p className="text-sm text-gray-500">
                We sent a confirmation link to <strong>{email}</strong>. Click it to activate your account.
              </p>
              <Link href="/login" className="mt-4 inline-block text-sm text-indigo-600 hover:underline">
                Back to sign in
              </Link>
            </div>
          ) : (
            <>
              <h1 className="text-xl font-semibold text-gray-900 mb-6">Create account</h1>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
                  <Input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="you@example.com"
                    required
                    autoFocus
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Password</label>
                  <Input
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="At least 8 characters"
                    minLength={8}
                    required
                  />
                </div>
                {error && <p className="text-sm text-red-600">{error}</p>}
                <Button type="submit" className="w-full" disabled={loading}>
                  {loading ? 'Creating account…' : 'Create account'}
                </Button>
              </form>
              <p className="mt-4 text-center text-sm text-gray-500">
                Have an account?{' '}
                <Link href="/login" className="text-indigo-600 hover:underline font-medium">
                  Sign in
                </Link>
              </p>
            </>
          )}
        </div>
      </div>
    </div>
  )
}
