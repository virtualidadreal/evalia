import { useAuthStore } from '@/stores/authStore'
import { Bell, Search } from 'lucide-react'

export function Header() {
  const { user, organization } = useAuthStore()
  const initials = user?.email?.slice(0, 2).toUpperCase() ?? 'US'

  return (
    <header className="h-[var(--header-height)] flex items-center justify-between px-6 border-b border-border bg-card">
      <div className="flex items-center gap-2">
        {organization && (
          <span className="text-sm font-medium text-foreground">{organization.name}</span>
        )}
      </div>

      <div className="flex items-center gap-2">
        <button className="h-9 w-9 flex items-center justify-center rounded-md text-muted-foreground hover:bg-secondary transition-smooth">
          <Search className="h-4 w-4" />
        </button>
        <button className="h-9 w-9 flex items-center justify-center rounded-md text-muted-foreground hover:bg-secondary transition-smooth">
          <Bell className="h-4 w-4" />
        </button>
        <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center">
          <span className="text-primary text-xs font-semibold">{initials}</span>
        </div>
      </div>
    </header>
  )
}
