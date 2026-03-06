import { useState, useMemo, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { toast } from 'sonner'
import { useAuthStore } from '@/stores/authStore'
import { useCampaigns, useDeleteCampaign, getCampaignLimit } from '@/hooks/use-campaigns'
import { CampaignProgress } from '@/components/campaigns/CampaignProgress'
import type { Campaign, CampaignStatus } from '@/types/database'
import { cn } from '@/lib/utils'

// UI components
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent } from '@/components/ui/card'
import { EmptyState } from '@/components/ui/EmptyState'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'

// Icons
import {
  Megaphone,
  Plus,
  Search,
  MoreHorizontal,
  Eye,
  Trash2,
  Loader2,
  X,
  AlertTriangle,
  CalendarDays,
} from 'lucide-react'

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const STATUS_OPTIONS: { value: CampaignStatus | 'all'; label: string }[] = [
  { value: 'all', label: 'Todos los estados' },
  { value: 'draft', label: 'Borrador' },
  { value: 'active', label: 'Activa' },
  { value: 'paused', label: 'Pausada' },
  { value: 'completed', label: 'Completada' },
  { value: 'archived', label: 'Archivada' },
]

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function formatDate(dateString: string | null): string {
  if (!dateString) return '—'
  return new Date(dateString).toLocaleDateString('es-ES', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  })
}

// ---------------------------------------------------------------------------
// PlanLimitBanner
// ---------------------------------------------------------------------------

function PlanLimitBanner({
  campaignsThisMonth,
  limit,
}: {
  campaignsThisMonth: number
  limit: number
}) {
  const atLimit = campaignsThisMonth >= limit

  return (
    <div
      className={cn(
        'flex items-center justify-between rounded-lg px-4 py-3 animate-fade-up',
        atLimit
          ? 'bg-destructive/10 border border-destructive/20'
          : 'bg-amber-500/10 border border-amber-500/20'
      )}
    >
      <div className="flex items-center gap-3">
        <AlertTriangle
          className={cn(
            'h-5 w-5 shrink-0',
            atLimit ? 'text-destructive' : 'text-amber-500'
          )}
        />
        <span className="text-sm font-medium">
          {atLimit
            ? 'Has alcanzado el límite de campañas de este mes'
            : `${campaignsThisMonth} de ${limit} campañas este mes`}
        </span>
      </div>
      <Button size="sm" variant="outline" onClick={() => toast.info('Próximamente')}>
        Ampliar plan
      </Button>
    </div>
  )
}

// ---------------------------------------------------------------------------
// FiltersBar
// ---------------------------------------------------------------------------

interface FiltersBarProps {
  search: string
  onSearchChange: (v: string) => void
  statusFilter: string
  onStatusFilterChange: (v: string) => void
}

function FiltersBar({
  search,
  onSearchChange,
  statusFilter,
  onStatusFilterChange,
}: FiltersBarProps) {
  return (
    <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3 animate-fade-up">
      <div className="relative w-full sm:w-64">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Buscar por nombre..."
          value={search}
          onChange={(e) => onSearchChange(e.target.value)}
          className="pl-9"
        />
        {search && (
          <button
            onClick={() => onSearchChange('')}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        )}
      </div>

      <Select value={statusFilter} onValueChange={onStatusFilterChange}>
        <SelectTrigger className="w-full sm:w-44">
          <SelectValue placeholder="Estado" />
        </SelectTrigger>
        <SelectContent>
          {STATUS_OPTIONS.map((s) => (
            <SelectItem key={s.value} value={s.value}>
              {s.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  )
}

// ---------------------------------------------------------------------------
// CampaignCard
// ---------------------------------------------------------------------------

interface CampaignCardProps {
  campaign: Campaign
  index: number
  onView: (campaign: Campaign) => void
  onDelete: (campaign: Campaign) => void
}

function CampaignCard({ campaign, index, onView, onDelete }: CampaignCardProps) {
  return (
    <Card
      className="animate-fade-up group hover:shadow-md transition-shadow cursor-pointer"
      style={{ animationDelay: `${index * 50}ms` }}
      onClick={() => onView(campaign)}
    >
      <CardContent className="p-5">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0 flex-1">
            <h3 className="text-sm font-semibold truncate mb-3">
              {campaign.name}
            </h3>

            <CampaignProgress campaign={campaign} />

            <div className="flex items-center gap-3 text-[11px] text-muted-foreground mt-3">
              <span className="flex items-center gap-1">
                <CalendarDays className="h-3 w-3" />
                {formatDate(campaign.start_date)} – {formatDate(campaign.end_date)}
              </span>
            </div>
          </div>

          <div
            className="shrink-0"
            onClick={(e) => e.stopPropagation()}
          >
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon-xs"
                  className="opacity-0 group-hover:opacity-100 transition-opacity"
                >
                  <MoreHorizontal className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={() => onView(campaign)}>
                  <Eye className="h-4 w-4" />
                  Ver detalle
                </DropdownMenuItem>
                <DropdownMenuItem
                  variant="destructive"
                  onClick={() => onDelete(campaign)}
                >
                  <Trash2 className="h-4 w-4" />
                  Eliminar
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

// ---------------------------------------------------------------------------
// DeleteConfirmDialog
// ---------------------------------------------------------------------------

interface DeleteConfirmDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  campaignName: string
  onConfirm: () => void
  isDeleting: boolean
}

function DeleteConfirmDialog({
  open,
  onOpenChange,
  campaignName,
  onConfirm,
  isDeleting,
}: DeleteConfirmDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Eliminar campaña</DialogTitle>
          <DialogDescription>
            ¿Estás seguro de que quieres eliminar{' '}
            <strong>{campaignName}</strong>? Se eliminarán todas las
            evaluaciones asociadas. Esta acción no se puede deshacer.
          </DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button
            variant="destructive"
            onClick={onConfirm}
            disabled={isDeleting}
          >
            {isDeleting && <Loader2 className="h-4 w-4 animate-spin" />}
            Eliminar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

// ---------------------------------------------------------------------------
// CampaignsPage (main)
// ---------------------------------------------------------------------------

export default function CampaignsPage() {
  const { organization } = useAuthStore()
  const orgId = organization?.id
  const navigate = useNavigate()

  // State
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('all')
  const [deletingCampaign, setDeletingCampaign] = useState<Campaign | null>(null)

  // Queries & mutations
  const { data: campaigns = [], isLoading } = useCampaigns(orgId)
  const deleteCampaign = useDeleteCampaign()

  // Plan limits
  const plan = organization?.subscription_plan ?? 'starter'
  const campaignLimit = getCampaignLimit(plan)
  const campaignsThisMonth = useMemo(() => {
    const now = new Date()
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).toISOString()
    return campaigns.filter((c) => c.created_at >= startOfMonth).length
  }, [campaigns])

  // Client-side filtering
  const filteredCampaigns = useMemo(() => {
    let result = campaigns

    if (search.trim()) {
      const q = search.toLowerCase()
      result = result.filter((c) => c.name.toLowerCase().includes(q))
    }

    if (statusFilter !== 'all') {
      result = result.filter((c) => c.status === statusFilter)
    }

    return result
  }, [campaigns, search, statusFilter])

  // Handlers
  const handleView = useCallback(
    (campaign: Campaign) => {
      navigate(`/app/campaigns/${campaign.id}`)
    },
    [navigate]
  )

  const handleDelete = useCallback(async () => {
    if (!deletingCampaign) return
    await deleteCampaign.mutateAsync(deletingCampaign.id)
    setDeletingCampaign(null)
  }, [deletingCampaign, deleteCampaign])

  const handleClearFilters = useCallback(() => {
    setSearch('')
    setStatusFilter('all')
  }, [])

  // Loading state
  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-24">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Plan limit banner */}
      {campaignLimit !== null && campaignsThisMonth >= campaignLimit - 1 && (
        <PlanLimitBanner
          campaignsThisMonth={campaignsThisMonth}
          limit={campaignLimit}
        />
      )}

      {/* Page header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 animate-fade-up">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Campañas</h1>
          <p className="text-muted-foreground mt-1">
            Gestiona tus campañas de evaluación
            {campaignLimit !== null && (
              <span className="ml-1">
                ({campaignsThisMonth}/{campaignLimit} este mes)
              </span>
            )}
          </p>
        </div>
        <Button
          onClick={() => navigate('/app/campaigns/new')}
          disabled={campaignLimit !== null && campaignsThisMonth >= campaignLimit}
        >
          <Plus className="h-4 w-4" />
          Nueva campaña
        </Button>
      </div>

      {/* Filters */}
      <FiltersBar
        search={search}
        onSearchChange={setSearch}
        statusFilter={statusFilter}
        onStatusFilterChange={setStatusFilter}
      />

      {/* Campaign grid or empty state */}
      {filteredCampaigns.length === 0 ? (
        campaigns.length === 0 && !search && statusFilter === 'all' ? (
          <EmptyState
            icon={Megaphone}
            title="Sin campañas"
            description="Crea tu primera campaña de evaluación para empezar a evaluar a tu equipo"
            action={{
              label: 'Nueva campaña',
              onClick: () => navigate('/app/campaigns/new'),
            }}
          />
        ) : (
          <div className="flex flex-col items-center justify-center py-16 animate-fade-up">
            <Search className="h-10 w-10 text-muted-foreground/40 mb-4" />
            <p className="text-sm font-medium text-foreground">
              Sin resultados
            </p>
            <p className="text-sm text-muted-foreground mt-1">
              No se encontraron campañas con los filtros actuales
            </p>
            <Button
              variant="outline"
              size="sm"
              className="mt-4"
              onClick={handleClearFilters}
            >
              Limpiar filtros
            </Button>
          </div>
        )
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredCampaigns.map((campaign, index) => (
            <CampaignCard
              key={campaign.id}
              campaign={campaign}
              index={index}
              onView={handleView}
              onDelete={setDeletingCampaign}
            />
          ))}
        </div>
      )}

      {/* Delete confirm dialog */}
      {deletingCampaign && (
        <DeleteConfirmDialog
          open={!!deletingCampaign}
          onOpenChange={(open) => {
            if (!open) setDeletingCampaign(null)
          }}
          campaignName={deletingCampaign.name}
          onConfirm={handleDelete}
          isDeleting={deleteCampaign.isPending}
        />
      )}
    </div>
  )
}
