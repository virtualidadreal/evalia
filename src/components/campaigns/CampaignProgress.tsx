import type { Campaign } from '@/types/database'
import { Progress } from '@/components/ui/progress'
import { Badge } from '@/components/ui/badge'

interface CampaignProgressProps {
  campaign: Campaign
}

const statusLabels: Record<string, string> = {
  draft: 'Borrador',
  active: 'Activa',
  paused: 'Pausada',
  completed: 'Completada',
  archived: 'Archivada',
}

export function CampaignProgress({ campaign }: CampaignProgressProps) {
  const percentage = campaign.total_evaluations > 0
    ? Math.round((campaign.completed_evaluations / campaign.total_evaluations) * 100)
    : 0

  const badgeVariant = {
    draft: 'draft' as const,
    active: 'active' as const,
    paused: 'paused' as const,
    completed: 'completed' as const,
    archived: 'secondary' as const,
  }

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <Badge variant={badgeVariant[campaign.status]}>
          {statusLabels[campaign.status]}
        </Badge>
        <span className="text-sm font-mono text-muted-foreground">
          {campaign.completed_evaluations}/{campaign.total_evaluations}
        </span>
      </div>
      <Progress value={percentage} className="h-2" />
      <p className="text-xs text-muted-foreground">
        {percentage}% completado
      </p>
    </div>
  )
}
