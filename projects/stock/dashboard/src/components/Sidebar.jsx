import { NavLink } from 'react-router-dom'
import { cn } from '@/lib/utils'
import {
  LayoutDashboard,
  Briefcase,
  FileText,
  Zap,
  Settings,
  TrendingUp,
  ChevronLeft,
  ChevronRight,
  Shield,
  RefreshCw,
  BarChart3,
  Bell,
  Database,
  LineChart,
} from 'lucide-react'
import { Button } from '@/components/ui/button'

const navSections = [
  {
    title: 'Trading',
    items: [
      { to: '/', icon: LayoutDashboard, label: 'Dashboard', shortcut: 'g d' },
      { to: '/performance', icon: LineChart, label: 'Performance', shortcut: 'g f' },
      { to: '/positions', icon: Briefcase, label: 'Positions', shortcut: 'g p' },
      { to: '/orders', icon: FileText, label: 'Orders', shortcut: 'g o' },
      { to: '/signals', icon: Zap, label: 'Signals', shortcut: 'g s' },
    ]
  },
  {
    title: 'Risk & Safety',
    items: [
      { to: '/risk', icon: Shield, label: 'Risk', shortcut: 'g r' },
      { to: '/reconciliation', icon: RefreshCw, label: 'Reconciliation', shortcut: 'g c' },
    ]
  },
  {
    title: 'Monitoring',
    items: [
      { to: '/reports', icon: BarChart3, label: 'Reports', shortcut: 'g e' },
      { to: '/alerts', icon: Bell, label: 'Alerts', shortcut: 'g a' },
      { to: '/data-quality', icon: Database, label: 'Data Quality', shortcut: 'g q' },
    ]
  },
  {
    title: 'System',
    items: [
      { to: '/settings', icon: Settings, label: 'Settings', shortcut: 'g ,' },
    ]
  }
]

export default function Sidebar({ collapsed = false, onCollapsedChange }) {
  const toggleCollapsed = () => {
    onCollapsedChange?.(!collapsed)
  }

  return (
    <aside
      className={cn(
        "fixed left-0 top-0 z-40 h-screen border-r border-border bg-card transition-all duration-300",
        collapsed ? "w-16" : "w-60"
      )}
      role="navigation"
      aria-label="Main navigation"
    >
      {/* Header */}
      <div className={cn(
        "flex h-16 items-center border-b border-border px-4",
        collapsed ? "justify-center" : "justify-between"
      )}>
        <div className={cn(
          "flex items-center gap-3 text-primary",
          collapsed && "justify-center"
        )}>
          <TrendingUp className="h-7 w-7 flex-shrink-0" aria-hidden="true" />
          {!collapsed && (
            <span className="text-lg font-semibold text-foreground">
              Stock Trading
            </span>
          )}
        </div>
        {onCollapsedChange && (
          <Button
            variant="ghost"
            size="icon"
            className={cn(
              "h-8 w-8 text-muted-foreground hover:text-foreground",
              collapsed && "absolute -right-3 top-6 z-50 rounded-full border border-border bg-card shadow-sm"
            )}
            onClick={toggleCollapsed}
            aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
          >
            {collapsed ? (
              <ChevronRight className="h-4 w-4" />
            ) : (
              <ChevronLeft className="h-4 w-4" />
            )}
          </Button>
        )}
      </div>

      {/* Navigation */}
      <nav className="flex-1 space-y-1 px-2 py-4 overflow-y-auto max-h-[calc(100vh-8rem)]" aria-label="Primary">
        {navSections.map((section) => (
          <div key={section.title} className="mb-4">
            {!collapsed && (
              <h3 className="px-3 mb-2 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                {section.title}
              </h3>
            )}
            {collapsed && section.title !== 'Trading' && (
              <div className="my-2 mx-2 border-t border-border" />
            )}
            <div className="space-y-1">
              {section.items.map((item) => {
                const IconComponent = item.icon
                return (
                  <NavLink
                    key={item.to}
                    to={item.to}
                    end={item.to === '/'}
                    className={({ isActive }) =>
                      cn(
                        "flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors",
                        "hover:bg-accent hover:text-accent-foreground",
                        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                        isActive
                          ? "bg-primary text-primary-foreground hover:bg-primary/90 hover:text-primary-foreground"
                          : "text-muted-foreground",
                        collapsed && "justify-center px-2"
                      )
                    }
                    title={collapsed ? `${item.label} (${item.shortcut})` : undefined}
                  >
                    {({ isActive }) => (
                      <>
                        <IconComponent className="h-5 w-5 flex-shrink-0" aria-hidden="true" />
                        {!collapsed && <span>{item.label}</span>}
                        {!collapsed && (
                          <span className="ml-auto text-xs text-muted-foreground/60">
                            {item.shortcut}
                          </span>
                        )}
                        {isActive && <span className="sr-only">(current page)</span>}
                      </>
                    )}
                  </NavLink>
                )
              })}
            </div>
          </div>
        ))}
      </nav>

      {/* Footer */}
      <div
        className={cn(
          "absolute bottom-0 left-0 right-0 border-t border-border p-4",
          collapsed ? "flex justify-center" : "flex items-center gap-2"
        )}
        role="status"
        aria-live="polite"
      >
        <div className="relative flex h-2 w-2">
          <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-green-400 opacity-75"></span>
          <span className="relative inline-flex h-2 w-2 rounded-full bg-green-500"></span>
        </div>
        {!collapsed && (
          <span className="text-sm text-green-500">System Active</span>
        )}
      </div>
    </aside>
  )
}
