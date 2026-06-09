import { createClient } from '@/lib/supabase/server'

export default async function SettingsPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  return (
    <div className="max-w-xl mx-auto">
      <h1 className="text-2xl font-bold text-gray-900 mb-6">Settings</h1>
      <div className="bg-white rounded-xl border border-gray-100 p-6 space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
          <p className="text-sm text-gray-600 bg-gray-50 rounded-lg px-3 py-2 border border-gray-200">
            {user?.email}
          </p>
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">User ID</label>
          <p className="text-xs text-gray-400 font-mono bg-gray-50 rounded-lg px-3 py-2 border border-gray-200 break-all">
            {user?.id}
          </p>
        </div>
      </div>
    </div>
  )
}
