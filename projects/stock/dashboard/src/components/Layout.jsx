import { Outlet } from 'react-router-dom'
import { useState } from 'react'
import Sidebar from './Sidebar'
import { Toaster } from '@/components/ui/toaster'
import { cn } from '@/lib/utils'

export default function Layout() {
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false)

  return (
    <div className="min-h-screen bg-background">
      {/* Skip to main content link for keyboard users */}
      <a href="#main-content" className="skip-link">
        Skip to main content
      </a>

      <Sidebar
        collapsed={sidebarCollapsed}
        onCollapsedChange={setSidebarCollapsed}
      />

      <main
        id="main-content"
        className={cn(
          "min-h-screen transition-all duration-300",
          sidebarCollapsed ? "ml-16" : "ml-60"
        )}
        role="main"
        tabIndex={-1}
      >
        <div className="p-6">
          <Outlet />
        </div>
      </main>

      <Toaster />
    </div>
  )
}
