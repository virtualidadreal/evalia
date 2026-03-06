import type { Organization } from '@/types/database'
import { Button } from '@/components/ui/button'
import { differenceInDays } from 'date-fns'
import { AlertTriangle, Sparkles } from 'lucide-react'
import { cn } from '@/lib/utils'

interface SubscriptionBannerProps {
  org: Organization
  onUpgrade: () => void
}

export function SubscriptionBanner({ org, onUpgrade }: SubscriptionBannerProps) {
  if (org.subscription_status === 'active') return null

  const isTrialing = org.subscription_status === 'trialing'
  const daysLeft = org.trial_ends_at
    ? differenceInDays(new Date(org.trial_ends_at), new Date())
    : 0

  if (!isTrialing) return null

  return (
    <div className={cn(
      'flex items-center justify-between rounded-lg px-4 py-3 mb-6 animate-fade-in',
      daysLeft <= 3
        ? 'bg-destructive/10 border border-destructive/20'
        : 'bg-primary/5 border border-primary/10'
    )}>
      <div className="flex items-center gap-3">
        {daysLeft <= 3 ? (
          <AlertTriangle className="h-5 w-5 text-destructive" />
        ) : (
          <Sparkles className="h-5 w-5 text-primary" />
        )}
        <span className="text-sm font-medium">
          {daysLeft > 0
            ? `Tu trial expira en ${daysLeft} días`
            : 'Tu trial ha expirado'}
        </span>
      </div>
      <Button size="sm" variant="premium" onClick={onUpgrade}>
        Elegir plan
      </Button>
    </div>
  )
}
