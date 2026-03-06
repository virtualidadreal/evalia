import { useState, useMemo } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { toast } from 'sonner'
import { cn as _cn } from '@/lib/utils'
import {
  useCampaign,
  useLaunchCampaign,
  usePauseCampaign,
  useCompleteCampaign,
  useDeleteCampaign,
} from '@/hooks/use-campaigns'
import { useEvaluations } from '@/hooks/use-evaluations'
import { CampaignProgress } from '@/components/campaigns/CampaignProgress'
import { EmptyState } from '@/components/ui/EmptyState'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Progress as _Progress } from '@/components/ui/progress'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  ArrowLeft,
  Play,
  Pause,
  CheckCircle2,
  Trash2,
  MoreHorizontal,
  Pencil,
  Users,
  ClipboardCheck,
  Clock,
  BarChart3,
  CalendarDays,
  ShieldCheck,
  Bell,
  Copy,
  Send,
  Loader2,
  FileText,
  Search,
} from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import type { CampaignStatus, EvaluationStatus, EvaluatorType, Evaluation } from '@/types/database'

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const STATUS_LABELS: Record<CampaignStatus, string> = {
  draft: 'Borrador',
  active: 'Activa',
  paused: 'Pausada',
  completed: 'Completada',
  archived: 'Archivada',
}

const STATUS_BADGE_VARIANT: Record<CampaignStatus, 'draft' | 'active' | 'paused' | 'completed' | 'secondary'> = {
  draft: 'draft',
  active: 'active',
  paused: 'paused',
  completed: 'completed',
  archived: 'secondary',
}

const EVALUATION_STATUS_LABELS: Record<EvaluationStatus, string> = {
  pending: 'Pendiente',
  in_progress: 'En progreso',
  submitted: 'Completada',
  expired: 'Expirada',
}

const EVALUATION_STATUS_BADGE: Record<EvaluationStatus, 'draft' | 'paused' | 'active' | 'completed' | 'destructive'> = {
  pending: 'draft',
  in_progress: 'paused',
  submitted: 'active',
  expired: 'destructive',
}

const EVALUATOR_TYPE_LABELS: Record<EvaluatorType, string> = {
  self: 'Autoevaluación',
  manager: 'Manager',
  peer: 'Par',
  subordinate: 'Subordinado',
  external: 'Externo',
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function formatDate(dateStr: string | null): string {
  if (!dateStr) return '—'
  return new Date(dateStr).toLocaleDateString('es-ES', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  })
}

function getRemainingTime(endDate: string | null, status: CampaignStatus): string {
  if (status === 'completed') return 'Finalizada'
  if (!endDate) return 'Sin fecha límite'

  const now = new Date()
  const end = new Date(endDate)
  const diff = end.getTime() - now.getTime()

  if (diff <= 0) return 'Plazo vencido'

  const days = Math.floor(diff / (1000 * 60 * 60 * 24))
  if (days === 0) return 'Último día'
  if (days === 1) return '1 día restante'
  return `${days} días restantes`
}

// ---------------------------------------------------------------------------
// InfoCard
// ---------------------------------------------------------------------------

interface InfoCardProps {
  label: string
  value: string | number
  subtitle?: string
  icon: LucideIcon
  index: number
}

function InfoCard({ label, value, subtitle, icon: Icon, index }: InfoCardProps) {
  return (
    <Card
      className="animate-fade-up"
      style={{ animationDelay: `${index * 50}ms` }}
    >
      <CardContent className="p-6">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm text-muted-foreground">{label}</p>
            <p className="text-2xl font-bold mt-1">{value}</p>
            {subtitle && (
              <p className="text-xs text-muted-foreground mt-1">{subtitle}</p>
            )}
          </div>
          <div className="h-12 w-12 rounded-xl bg-primary/10 flex items-center justify-center">
            <Icon className="h-6 w-6 text-primary" />
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

// ---------------------------------------------------------------------------
// DeleteCampaignDialog
// ---------------------------------------------------------------------------

interface DeleteCampaignDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  campaignName: string
  onConfirm: () => void
  isDeleting: boolean
}

function DeleteCampaignDialog({
  open,
  onOpenChange,
  campaignName,
  onConfirm,
  isDeleting,
}: DeleteCampaignDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Eliminar campaña</DialogTitle>
          <DialogDescription>
            ¿Estás seguro de que quieres eliminar la campaña <strong>{campaignName}</strong>? Se
            eliminarán todas las evaluaciones asociadas. Esta acción no se puede deshacer.
          </DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button variant="destructive" onClick={onConfirm} disabled={isDeleting}>
            {isDeleting && <Loader2 className="h-4 w-4 animate-spin" />}
            Eliminar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

// ---------------------------------------------------------------------------
// CampaignDetailPage
// ---------------------------------------------------------------------------

type EvaluationWithEmployee = Evaluation & {
  employees: {
    full_name: string
    email: string
    position: string
    department_id: string | null
  } | null
}

export default function CampaignDetailPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()

  // State
  const [showDeleteDialog, setShowDeleteDialog] = useState(false)
  const [statusFilter, setStatusFilter] = useState('all')
  const [typeFilter, setTypeFilter] = useState('all')

  // Queries
  const { data: campaign, isLoading: loadingCampaign } = useCampaign(id)
  const { data: evaluations = [], isLoading: loadingEvaluations } = useEvaluations(id)

  // Mutations
  const launchCampaign = useLaunchCampaign()
  const pauseCampaign = usePauseCampaign()
  const completeCampaign = useCompleteCampaign()
  const deleteCampaign = useDeleteCampaign()

  // Computed
  const typedEvaluations = evaluations as EvaluationWithEmployee[]

  const filteredEvaluations = useMemo(() => {
    return typedEvaluations.filter((ev) => {
      if (statusFilter !== 'all' && ev.status !== statusFilter) return false
      if (typeFilter !== 'all' && ev.evaluator_type !== typeFilter) return false
      return true
    })
  }, [typedEvaluations, statusFilter, typeFilter])

  const totalEvals = typedEvaluations.length
  const completedEvals = typedEvaluations.filter((e) => e.status === 'submitted').length
  const pendingEvals = typedEvaluations.filter(
    (e) => e.status === 'pending' || e.status === 'in_progress'
  ).length
  const responseRate = totalEvals > 0 ? Math.round((completedEvals / totalEvals) * 100) : 0

  // Available evaluator types in this campaign's evaluations
  const availableEvaluatorTypes = useMemo(() => {
    const types = new Set(typedEvaluations.map((e) => e.evaluator_type))
    return Array.from(types)
  }, [typedEvaluations])

  // Handlers
  const handleLaunch = () => {
    if (!id) return
    launchCampaign.mutate(id)
  }

  const handlePause = () => {
    if (!id) return
    pauseCampaign.mutate(id)
  }

  const handleComplete = () => {
    if (!id) return
    completeCampaign.mutate(id)
  }

  const handleDelete = () => {
    if (!id) return
    deleteCampaign.mutate(id, {
      onSuccess: () => navigate('/app/campaigns'),
    })
  }

  const handleCopyLink = (token: string) => {
    const url = `${window.location.origin}/evaluate/${token}`
    navigator.clipboard.writeText(url)
    toast.success('Enlace copiado al portapapeles')
  }

  const handleSendReminder = () => {
    toast.info('Próximamente')
  }

  // Loading
  if (loadingCampaign) {
    return (
      <div className="flex items-center justify-center py-24">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    )
  }

  // Not found
  if (!campaign) {
    return (
      <div className="space-y-6">
        <Button
          variant="ghost"
          className="gap-2"
          onClick={() => navigate('/app/campaigns')}
        >
          <ArrowLeft className="h-4 w-4" />
          Volver a campañas
        </Button>
        <EmptyState
          icon={FileText}
          title="Campaña no encontrada"
          description="La campaña que buscas no existe o no tienes acceso"
          action={{
            label: 'Ver campañas',
            onClick: () => navigate('/app/campaigns'),
          }}
        />
      </div>
    )
  }

  const isActionPending =
    launchCampaign.isPending ||
    pauseCampaign.isPending ||
    completeCampaign.isPending

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="animate-fade-up">
        <Button
          variant="ghost"
          size="sm"
          className="gap-2 mb-4 -ml-2"
          onClick={() => navigate('/app/campaigns')}
        >
          <ArrowLeft className="h-4 w-4" />
          Volver a campañas
        </Button>

        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold tracking-tight">{campaign.name}</h1>
            <Badge variant={STATUS_BADGE_VARIANT[campaign.status]}>
              {STATUS_LABELS[campaign.status]}
            </Badge>
          </div>

          {/* Actions by status */}
          <div className="flex items-center gap-2">
            {campaign.status === 'draft' && (
              <>
                <Button
                  onClick={handleLaunch}
                  disabled={isActionPending}
                >
                  {launchCampaign.isPending ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Play className="h-4 w-4" />
                  )}
                  Lanzar
                </Button>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="outline" size="icon">
                      <MoreHorizontal className="h-4 w-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem onClick={() => navigate(`/app/campaigns/${id}/edit`)}>
                      <Pencil className="h-4 w-4" />
                      Editar
                    </DropdownMenuItem>
                    <DropdownMenuItem
                      variant="destructive"
                      onClick={() => setShowDeleteDialog(true)}
                    >
                      <Trash2 className="h-4 w-4" />
                      Eliminar
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </>
            )}

            {campaign.status === 'active' && (
              <>
                <Button
                  variant="outline"
                  onClick={handlePause}
                  disabled={isActionPending}
                >
                  {pauseCampaign.isPending ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Pause className="h-4 w-4" />
                  )}
                  Pausar
                </Button>
                <Button
                  onClick={handleComplete}
                  disabled={isActionPending}
                >
                  {completeCampaign.isPending ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <CheckCircle2 className="h-4 w-4" />
                  )}
                  Finalizar
                </Button>
              </>
            )}

            {campaign.status === 'paused' && (
              <>
                <Button
                  onClick={handleLaunch}
                  disabled={isActionPending}
                >
                  {launchCampaign.isPending ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Play className="h-4 w-4" />
                  )}
                  Reanudar
                </Button>
                <Button
                  variant="outline"
                  onClick={handleComplete}
                  disabled={isActionPending}
                >
                  {completeCampaign.isPending ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <CheckCircle2 className="h-4 w-4" />
                  )}
                  Finalizar
                </Button>
              </>
            )}

            {campaign.status === 'completed' && (
              <Button onClick={() => navigate('/app/results')}>
                <BarChart3 className="h-4 w-4" />
                Ver resultados
              </Button>
            )}
          </div>
        </div>

        {campaign.description && (
          <p className="text-muted-foreground mt-2">{campaign.description}</p>
        )}
      </div>

      {/* Info cards grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <InfoCard
          label="Total evaluaciones"
          value={totalEvals}
          icon={ClipboardCheck}
          index={0}
        />
        <InfoCard
          label="Completadas"
          value={completedEvals}
          subtitle={totalEvals > 0 ? `${responseRate}%` : undefined}
          icon={CheckCircle2}
          index={1}
        />
        <InfoCard
          label="Pendientes"
          value={pendingEvals}
          icon={Clock}
          index={2}
        />
        <InfoCard
          label="Tasa de respuesta"
          value={`${responseRate}%`}
          icon={BarChart3}
          index={3}
        />
      </div>

      {/* Progress + Config row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* General progress */}
        <Card className="animate-fade-up" style={{ animationDelay: '200ms' }}>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <BarChart3 className="h-5 w-5 text-primary" />
              Progreso general
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <CampaignProgress campaign={campaign} />

            <div className="grid grid-cols-2 gap-4 pt-2">
              <div>
                <p className="text-xs text-muted-foreground">Fecha inicio</p>
                <p className="text-sm font-medium">{formatDate(campaign.start_date)}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Fecha fin</p>
                <p className="text-sm font-medium">{formatDate(campaign.end_date)}</p>
              </div>
            </div>

            <div className="flex items-center gap-2 pt-1">
              <CalendarDays className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm text-muted-foreground">
                {getRemainingTime(campaign.end_date, campaign.status)}
              </span>
            </div>
          </CardContent>
        </Card>

        {/* Configuration details */}
        <Card className="animate-fade-up" style={{ animationDelay: '250ms' }}>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5 text-primary" />
              Configuración
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <p className="text-xs text-muted-foreground">Template</p>
              <p className="text-sm font-medium">
                {campaign.template_id ? 'Personalizado' : 'Sin template'}
              </p>
            </div>

            <div>
              <p className="text-xs text-muted-foreground mb-1.5">Tipos de evaluadores</p>
              <div className="flex flex-wrap gap-1.5">
                {campaign.settings.evaluator_types.map((type) => (
                  <Badge key={type} variant="outline">
                    {EVALUATOR_TYPE_LABELS[type]}
                  </Badge>
                ))}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="flex items-center gap-2">
                <ShieldCheck className="h-4 w-4 text-muted-foreground" />
                <div>
                  <p className="text-xs text-muted-foreground">Anonimato</p>
                  <p className="text-sm font-medium">
                    {campaign.settings.anonymous ? 'Sí' : 'No'}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Bell className="h-4 w-4 text-muted-foreground" />
                <div>
                  <p className="text-xs text-muted-foreground">Recordatorios</p>
                  <p className="text-sm font-medium">
                    {campaign.settings.reminders
                      ? `Sí (cada ${campaign.settings.reminder_frequency_days ?? 3} días)`
                      : 'No'}
                  </p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Evaluations table */}
      <Card className="animate-fade-up" style={{ animationDelay: '300ms' }}>
        <CardHeader>
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <CardTitle className="flex items-center gap-2">
              <Users className="h-5 w-5 text-primary" />
              Evaluaciones
            </CardTitle>

            {typedEvaluations.length > 0 && (
              <div className="flex items-center gap-2">
                <Select value={statusFilter} onValueChange={setStatusFilter}>
                  <SelectTrigger className="w-36">
                    <SelectValue placeholder="Estado" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todos los estados</SelectItem>
                    <SelectItem value="pending">Pendiente</SelectItem>
                    <SelectItem value="in_progress">En progreso</SelectItem>
                    <SelectItem value="submitted">Completada</SelectItem>
                  </SelectContent>
                </Select>

                {availableEvaluatorTypes.length > 1 && (
                  <Select value={typeFilter} onValueChange={setTypeFilter}>
                    <SelectTrigger className="w-40">
                      <SelectValue placeholder="Tipo" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Todos los tipos</SelectItem>
                      {availableEvaluatorTypes.map((type) => (
                        <SelectItem key={type} value={type}>
                          {EVALUATOR_TYPE_LABELS[type]}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              </div>
            )}
          </div>
        </CardHeader>
        <CardContent>
          {loadingEvaluations ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-6 w-6 animate-spin text-primary" />
            </div>
          ) : typedEvaluations.length === 0 ? (
            <EmptyState
              icon={ClipboardCheck}
              title="Sin evaluaciones"
              description="Esta campaña aún no tiene evaluaciones configuradas. Configura los evaluadores para empezar."
              action={{
                label: 'Configurar evaluadores',
                onClick: () => toast.info('Próximamente'),
              }}
            />
          ) : filteredEvaluations.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12">
              <Search className="h-10 w-10 text-muted-foreground/40 mb-4" />
              <p className="text-sm font-medium">Sin resultados</p>
              <p className="text-sm text-muted-foreground mt-1">
                No hay evaluaciones con los filtros seleccionados
              </p>
              <Button
                variant="outline"
                size="sm"
                className="mt-4"
                onClick={() => {
                  setStatusFilter('all')
                  setTypeFilter('all')
                }}
              >
                Limpiar filtros
              </Button>
            </div>
          ) : (
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-[220px]">Empleado</TableHead>
                    <TableHead>Tipo evaluador</TableHead>
                    <TableHead>Evaluador</TableHead>
                    <TableHead>Estado</TableHead>
                    <TableHead>Fecha envío</TableHead>
                    <TableHead className="w-[80px]">Acciones</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredEvaluations.map((evaluation) => (
                    <TableRow key={evaluation.id}>
                      {/* Employee */}
                      <TableCell>
                        <div className="min-w-0">
                          <p className="text-sm font-medium truncate">
                            {evaluation.employees?.full_name ?? '—'}
                          </p>
                          <p className="text-xs text-muted-foreground truncate">
                            {evaluation.employees?.email ?? ''}
                          </p>
                        </div>
                      </TableCell>

                      {/* Evaluator type */}
                      <TableCell>
                        <Badge variant="outline">
                          {EVALUATOR_TYPE_LABELS[evaluation.evaluator_type]}
                        </Badge>
                      </TableCell>

                      {/* Evaluator */}
                      <TableCell>
                        <span className="text-sm">
                          {evaluation.evaluator_name ?? evaluation.evaluator_email ?? '—'}
                        </span>
                      </TableCell>

                      {/* Status */}
                      <TableCell>
                        <Badge variant={EVALUATION_STATUS_BADGE[evaluation.status]}>
                          {evaluation.status === 'submitted' && (
                            <CheckCircle2 className="h-3 w-3" />
                          )}
                          {EVALUATION_STATUS_LABELS[evaluation.status]}
                        </Badge>
                      </TableCell>

                      {/* Submit date */}
                      <TableCell>
                        <span className="text-sm text-muted-foreground">
                          {formatDate(evaluation.submitted_at)}
                        </span>
                      </TableCell>

                      {/* Actions */}
                      <TableCell>
                        {(evaluation.status === 'pending' || evaluation.status === 'in_progress') && (
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="icon-xs">
                                <MoreHorizontal className="h-4 w-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem
                                onClick={() => handleCopyLink(evaluation.token)}
                              >
                                <Copy className="h-4 w-4" />
                                Copiar enlace
                              </DropdownMenuItem>
                              <DropdownMenuItem onClick={handleSendReminder}>
                                <Send className="h-4 w-4" />
                                Enviar recordatorio
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        )}
                        {evaluation.status === 'submitted' && (
                          <CheckCircle2 className="h-5 w-5 text-success" />
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Delete dialog */}
      {showDeleteDialog && (
        <DeleteCampaignDialog
          open={showDeleteDialog}
          onOpenChange={setShowDeleteDialog}
          campaignName={campaign.name}
          onConfirm={handleDelete}
          isDeleting={deleteCampaign.isPending}
        />
      )}
    </div>
  )
}
