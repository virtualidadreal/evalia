import { Badge } from '@/components/ui/badge'

interface ScoreBadgeProps {
  score: number
  max?: number
}

function getScoreVariant(score: number, max: number) {
  const pct = (score / max) * 100
  if (pct >= 85) return 'excellent' as const
  if (pct >= 70) return 'good' as const
  if (pct >= 50) return 'average' as const
  if (pct >= 30) return 'below' as const
  return 'poor' as const
}

function getScoreLabel(score: number, max: number) {
  const pct = (score / max) * 100
  if (pct >= 85) return 'Excelente'
  if (pct >= 70) return 'Bueno'
  if (pct >= 50) return 'Promedio'
  if (pct >= 30) return 'Mejorable'
  return 'Insuficiente'
}

export function ScoreBadge({ score, max = 5 }: ScoreBadgeProps) {
  const variant = getScoreVariant(score, max)

  return (
    <Badge variant={variant}>
      {score.toFixed(1)}/{max} — {getScoreLabel(score, max)}
    </Badge>
  )
}
