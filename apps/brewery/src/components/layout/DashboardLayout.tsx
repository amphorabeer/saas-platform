import { Sidebar } from './Sidebar'
import { Header } from './Header'

interface DashboardLayoutProps {
  children: React.ReactNode
  title: string
  breadcrumb?: string
  onNewBatch?: () => void
}

export function DashboardLayout({ children, title, breadcrumb, onNewBatch }: DashboardLayoutProps) {
  return (
    <div className="flex min-h-screen">
      <Sidebar />
      <main className="flex-1 ml-[260px] flex flex-col">
        <Header title={title} breadcrumb={breadcrumb || ''} onNewBatch={onNewBatch} />
        <div className="flex-1 p-8 overflow-y-auto">
          {children}
        </div>
      </main>
    </div>
  )
}











