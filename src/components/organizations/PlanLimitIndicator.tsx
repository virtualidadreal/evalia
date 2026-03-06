import { Progress } from '@/components/ui/progress'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

interface PlanLimitIndicatorProps {
  current: number
  max: number
  label: string
  onUpgrade?: () => void
}

export function PlanLimitIndicator({ current, max, label, onUpgrade }: PlanLimitIndicatorProps) {
  const pct = max > 0 ? Math.round((current / max) * 100) : 0
  const isAtLimit = current >= max

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between text-sm">
        <span className="text-muted-foreground">{label}</span>
        <span className={cn('font-mono', isAtLimit && 'text-destructive font-semibold')}>
          {current}/{max}
        </span>
      </div>
      <Progress value={pct} className={cn('h-2', isAtLimit && '[&>div]:bg-destructive')} />
      {isAtLimit && onUpgrade && (
        <Button size="sm" variant="outline" onClick={onUpgrade} className="w-full mt-2">
          Ampliar plan para más {label.toLowerCase()}
        </Button>
      )}
    </div>
  )
}
