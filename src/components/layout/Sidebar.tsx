import { cn } from '@/lib/utils'
import { NavLink } from 'react-router-dom'
import {
  LayoutDashboard,
  Users,
  ClipboardList,
  Megaphone,
  BarChart3,
  FileText,
  Settings,
  ChevronLeft,
} from 'lucide-react'
import { BRAND_NAME } from '@/lib/constants'

const navigation = [
  { name: 'Dashboard', href: '/app', icon: LayoutDashboard },
  { name: 'Empleados', href: '/app/employees', icon: Users },
  { name: 'Evaluaciones', href: '/app/evaluations', icon: ClipboardList },
  { name: 'Campanas', href: '/app/campaigns', icon: Megaphone },
  { name: 'Resultados', href: '/app/results', icon: BarChart3 },
  { name: 'Informes', href: '/app/reports', icon: FileText },
]

interface SidebarProps {
  collapsed: boolean
  onToggle: () => void
}

export function Sidebar({ collapsed, onToggle }: SidebarProps) {
  return (
    <aside
      className={cn(
        'hidden lg:flex flex-col bg-sidebar text-sidebar-foreground transition-smooth',
        collapsed ? 'w-[var(--sidebar-collapsed-width)]' : 'w-[var(--sidebar-width)]'
      )}
    >
      <div className="h-[var(--header-height)] flex items-center px-4 border-b border-sidebar-border">
        <div className="flex items-center gap-2">
          <div className="h-8 w-8 rounded-lg bg-sidebar-primary flex items-center justify-center text-sm font-bold text-sidebar-primary-foreground">
            tt
          </div>
          {!collapsed && (
            <div className="flex flex-col animate-fade-in">
              <span className="font-bold text-sm leading-tight text-sidebar-foreground">{BRAND_NAME}</span>
              <span className="text-[9px] tracking-wider uppercase text-sidebar-foreground/60">EvalIA</span>
            </div>
          )}
        </div>
      </div>

      <nav className="flex-1 py-4 px-3 space-y-1">
        {navigation.map((item) => (
          <NavLink
            key={item.href}
            to={item.href}
            end={item.href === '/app'}
            className={({ isActive }) =>
              cn(
                'flex items-center gap-3 px-3 py-2 rounded-md text-sm font-medium transition-smooth',
                isActive
                  ? 'bg-sidebar-accent text-sidebar-accent-foreground'
                  : 'text-sidebar-foreground/70 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground'
              )
            }
          >
            <item.icon className="h-5 w-5 shrink-0" />
            {!collapsed && <span>{item.name}</span>}
          </NavLink>
        ))}
      </nav>

      <div className="p-3 border-t border-sidebar-border">
        <button
          onClick={onToggle}
          className="flex items-center justify-center w-full py-2 rounded-md text-sidebar-foreground/60 hover:bg-sidebar-accent transition-smooth"
        >
          <ChevronLeft className={cn('h-4 w-4 transition-smooth', collapsed && 'rotate-180')} />
        </button>
      </div>

      <div className="p-3 border-t border-sidebar-border">
        <NavLink
          to="/app/settings"
          className={({ isActive }) =>
            cn(
              'flex items-center gap-3 px-3 py-2 rounded-md text-sm text-sidebar-foreground/70 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground transition-smooth',
              isActive && 'bg-sidebar-accent text-sidebar-accent-foreground'
            )
          }
        >
          <Settings className="h-5 w-5" />
          {!collapsed && <span>Configuracion</span>}
        </NavLink>
      </div>
    </aside>
  )
}
