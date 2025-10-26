import { useState } from 'react'
import {
  LayoutDashboard,
  Users,
  Activity,
  Settings,
  Mail,
  FileText,
  Search,
  Target,
  Lightbulb,
  Rocket,
  Bot,
  Palette,
  Webhook,
  Database
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'

const navGroups = [
  {
    title: null,
    items: [
      { icon: LayoutDashboard, label: 'Dashboard', href: '#dashboard' },
      { icon: Users, label: 'Clients', href: '#clients' },
    ]
  },
  {
    title: 'Automation',
    items: [
      { icon: Rocket, label: 'Control Center', href: '#automation' },
      { icon: Bot, label: 'Auto-Fix Engines', href: '#autofix' },
    ]
  },
  {
    title: 'Insights',
    items: [
      { icon: Activity, label: 'Analytics', href: '#analytics' },
      { icon: Lightbulb, label: 'Recommendations', href: '#recommendations' },
      { icon: Target, label: 'Goals', href: '#goals' },
    ]
  },
  {
    title: 'Communications',
    items: [
      { icon: Mail, label: 'Email Campaigns', href: '#emails' },
      { icon: FileText, label: 'Reports', href: '#reports' },
    ]
  },
  {
    title: 'Research',
    items: [
      { icon: Search, label: 'Keyword Research', href: '#keyword-research' },
      { icon: Database, label: 'Unified Keywords', href: '#unified-keywords' },
    ]
  },
  {
    title: 'Configuration',
    items: [
      { icon: Palette, label: 'White-Label', href: '#whitelabel' },
      { icon: Webhook, label: 'Webhooks', href: '#webhooks' },
      { icon: Settings, label: 'Settings', href: '#settings' },
    ]
  },
]

export function Sidebar({ currentSection = 'dashboard', onNavigate }) {
  return (
    <aside className="w-64 border-r bg-card h-screen flex flex-col">
      {/* Header */}
      <div className="p-6 border-b">
        <h1 className="text-xl font-bold flex items-center gap-2">
          <Rocket className="h-6 w-6 text-primary" />
          SEO Platform
        </h1>
      </div>

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto p-4 space-y-6">
        {navGroups.map((group, idx) => (
          <div key={idx} className="space-y-2">
            {group.title && (
              <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider px-3 mb-2">
                {group.title}
              </h3>
            )}
            <div className="space-y-1">
              {group.items.map((item) => {
                const Icon = item.icon
                const sectionId = item.href.replace('#', '')
                const isActive = currentSection === sectionId

                return (
                  <Button
                    key={item.href}
                    variant={isActive ? "secondary" : "ghost"}
                    className={cn(
                      "w-full justify-start gap-3",
                      isActive && "bg-secondary font-medium"
                    )}
                    onClick={() => onNavigate(sectionId)}
                  >
                    <Icon className="h-4 w-4" />
                    {item.label}
                  </Button>
                )
              })}
            </div>
          </div>
        ))}
      </nav>

      {/* Footer */}
      <div className="p-4 border-t">
        <div className="flex items-center gap-3 p-2">
          <div className="h-8 w-8 rounded-full bg-primary flex items-center justify-center text-primary-foreground font-semibold">
            A
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium truncate">Admin</p>
            <p className="text-xs text-muted-foreground truncate">Administrator</p>
          </div>
        </div>
      </div>
    </aside>
  )
}
