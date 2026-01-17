import { NavLink } from 'react-router-dom'
import {
  LayoutDashboard,
  Briefcase,
  FileText,
  Zap,
  Settings,
  TrendingUp,
  Activity
} from 'lucide-react'

const navItems = [
  { to: '/', icon: LayoutDashboard, label: 'Dashboard', shortcut: 'g d' },
  { to: '/positions', icon: Briefcase, label: 'Positions', shortcut: 'g p' },
  { to: '/orders', icon: FileText, label: 'Orders', shortcut: 'g o' },
  { to: '/signals', icon: Zap, label: 'Signals', shortcut: 'g s' },
  { to: '/settings', icon: Settings, label: 'Settings', shortcut: 'g ,' },
]

export default function Sidebar() {
  return (
    <aside className="sidebar" role="navigation" aria-label="Main navigation">
      <div className="sidebar-header">
        <TrendingUp size={28} aria-hidden="true" />
        <span>Stock Trading</span>
      </div>

      <nav className="sidebar-nav" aria-label="Primary">
        {navItems.map((item) => {
          const IconComponent = item.icon
          return (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.to === '/'}
              className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}
              title={`${item.label} (${item.shortcut})`}
            >
              <IconComponent size={20} aria-hidden="true" />
              <span>{item.label}</span>
            </NavLink>
          )
        })}
      </nav>

      <div className="sidebar-footer" role="status" aria-live="polite">
        <Activity size={16} aria-hidden="true" />
        <span>System Active</span>
      </div>
    </aside>
  )
}

// Sidebar styles (added to components.css)
export const sidebarStyles = `
/* Sidebar */
.sidebar {
  width: var(--sidebar-width);
  background: var(--bg-secondary);
  border-right: 1px solid var(--border-default);
  display: flex;
  flex-direction: column;
  position: fixed;
  height: 100vh;
  z-index: var(--z-fixed);
}

.sidebar-header {
  padding: var(--space-5);
  display: flex;
  align-items: center;
  gap: var(--space-3);
  border-bottom: 1px solid var(--border-default);
  color: var(--color-blue-500);
  font-weight: var(--font-semibold);
  font-size: var(--text-lg);
}

.sidebar-nav {
  flex: 1;
  padding: var(--space-4) var(--space-3);
  display: flex;
  flex-direction: column;
  gap: var(--space-1);
}

.nav-item {
  display: flex;
  align-items: center;
  gap: var(--space-3);
  padding: var(--space-3) var(--space-4);
  border-radius: var(--radius-lg);
  color: var(--text-secondary);
  text-decoration: none;
  transition: var(--transition-all);
}

.nav-item:hover {
  background: var(--bg-card);
  color: var(--text-primary);
}

.nav-item:focus-visible {
  outline: 2px solid var(--color-blue-500);
  outline-offset: -2px;
}

.nav-item.active {
  background: var(--color-blue-500);
  color: white;
}

.nav-item.active:focus-visible {
  outline-color: white;
}

.sidebar-footer {
  padding: var(--space-4) var(--space-5);
  border-top: 1px solid var(--border-default);
  display: flex;
  align-items: center;
  gap: var(--space-2);
  font-size: var(--text-sm);
  color: var(--color-green-500);
}

/* Collapsed sidebar for mobile */
@media (max-width: 768px) {
  .sidebar {
    width: var(--sidebar-width-collapsed);
  }

  .sidebar-header span,
  .nav-item span,
  .sidebar-footer span {
    display: none;
  }

  .sidebar-header {
    justify-content: center;
  }

  .nav-item {
    justify-content: center;
    padding: var(--space-3);
  }

  .sidebar-footer {
    justify-content: center;
  }
}
`
