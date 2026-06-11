import { Sidebar } from '@/components/layout/sidebar'
import { WorkspaceProvider } from '@/lib/workspace-context'

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return (
    <WorkspaceProvider>
      <div className="flex min-h-screen bg-[#f8f9fb]">
        <Sidebar />
        <main className="md:ml-56 flex-1 min-h-screen pb-16 md:pb-0">{children}</main>
      </div>
    </WorkspaceProvider>
  )
}
