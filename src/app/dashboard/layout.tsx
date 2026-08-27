import { Sidebar } from '@/components/layout/sidebar'
import { WorkspaceProvider } from '@/lib/workspace-context'

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return (
    <WorkspaceProvider>
      <div className="flex min-h-screen bg-[#f8f9fb] overflow-x-hidden">
        <Sidebar />
        <main className="md:ml-56 flex-1 min-h-screen pb-[calc(4rem+env(safe-area-inset-bottom,0px))] md:pb-0 min-w-0">{children}</main>
      </div>
    </WorkspaceProvider>
  )
}
