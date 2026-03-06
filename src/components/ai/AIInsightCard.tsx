import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import type { Insight } from '@/types/database'
import { TrendingUp, AlertTriangle, Lightbulb, Sparkles } from 'lucide-react'
import { cn } from '@/lib/utils'

const insightConfig = {
  strength: {
    icon: TrendingUp,
    label: 'Fortaleza',
    bgClass: 'bg-success/10',
    iconClass: 'text-success',
    variant: 'excellent' as const,
  },
  risk: {
    icon: AlertTriangle,
    label: 'Riesgo',
    bgClass: 'bg-destructive/10',
    iconClass: 'text-destructive',
    variant: 'poor' as const,
  },
  opportunity: {
    icon: Lightbulb,
    label: 'Oportunidad',
    bgClass: 'bg-ai/10',
    iconClass: 'text-ai',
    variant: 'ai' as const,
  },
}

interface AIInsightCardProps {
  insight: Insight
  index?: number
}

export function AIInsightCard({ insight, index = 0 }: AIInsightCardProps) {
  const config = insightConfig[insight.type]
  const Icon = config.icon

  return (
    <Card
      className="animate-fade-up bg-gradient-ai border-ai/10"
      style={{ animationDelay: `${index * 100}ms` }}
    >
      <CardContent className="flex items-start gap-3 p-4">
        <div className={cn('h-8 w-8 rounded-lg flex items-center justify-center shrink-0', config.bgClass)}>
          <Icon className={cn('h-4 w-4', config.iconClass)} />
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <Badge variant={config.variant}>{config.label}</Badge>
            <Sparkles className="h-3 w-3 text-ai" />
          </div>
          <p className="text-sm text-foreground">{insight.text}</p>
        </div>
      </CardContent>
    </Card>
  )
}
