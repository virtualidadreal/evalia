import { useState, useMemo, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { toast } from 'sonner'
import { useAuthStore } from '@/stores/authStore'
import {
  useTemplates,
  useDeleteTemplate,
  useDuplicateTemplate,
  useCreateTemplate,
} from '@/hooks/use-templates'
import { PREDEFINED_TEMPLATES } from '@/lib/ai-evaluation'
import type { EvalTemplate, EvalType } from '@/types/database'
import { cn } from '@/lib/utils'

// UI components
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent } from '@/components/ui/card'
import { EmptyState } from '@/components/ui/EmptyState'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
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
  ClipboardList,
  Plus,
  Search,
  MoreHorizontal,
  Pencil,
  Copy,
  Trash2,
  Sparkles,
  Loader2,
  X,
  Zap,
  BookTemplate,
  Tag,
} from 'lucide-react'

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const EVAL_TYPE_LABELS: Record<EvalType, string> = {
  competencies: 'Competencias',
  performance: 'Desempeño',
  potential: 'Potencial',
  integral: 'Integral',
  '360': '360°',
}

const EVAL_TYPE_BADGE_VARIANT: Record<EvalType, string> = {
  competencies: 'secondary',
  performance: 'default',
  potential: 'ai',
  integral: 'active',
  '360': 'completed',
}

const EVAL_TYPE_OPTIONS: { value: EvalType; label: string }[] = [
  { value: 'competencies', label: 'Competencias' },
  { value: 'performance', label: 'Desempeño' },
  { value: 'potential', label: 'Potencial' },
  { value: 'integral', label: 'Integral' },
  { value: '360', label: '360°' },
]

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function formatDate(dateString: string): string {
  return new Date(dateString).toLocaleDateString('es-ES', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  })
}

// ---------------------------------------------------------------------------
// AIBanner
// ---------------------------------------------------------------------------

function AIBanner({ onUpgrade }: { onUpgrade: () => void }) {
  return (
    <div className="flex items-center justify-between rounded-lg bg-ai-subtle border border-ai/20 px-4 py-3 animate-fade-up">
      <div className="flex items-center gap-3">
        <Sparkles className="h-5 w-5 text-ai shrink-0" />
        <div>
          <p className="text-sm font-medium">Genera evaluaciones con IA</p>
          <p className="text-xs text-muted-foreground">
            Actualiza tu plan para crear evaluaciones personalizadas con inteligencia artificial
          </p>
        </div>
      </div>
      <Button size="sm" variant="premium" onClick={onUpgrade}>
        <Zap className="h-4 w-4" />
        Actualizar plan
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
  evalType: string
  onEvalTypeChange: (v: string) => void
}

function FiltersBar({
  search,
  onSearchChange,
  evalType,
  onEvalTypeChange,
}: FiltersBarProps) {
  return (
    <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3 animate-fade-up">
      {/* Search */}
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

      {/* Eval type filter */}
      <Select value={evalType} onValueChange={onEvalTypeChange}>
        <SelectTrigger className="w-full sm:w-44">
          <SelectValue placeholder="Tipo de evaluación" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">Todos los tipos</SelectItem>
          {EVAL_TYPE_OPTIONS.map((t) => (
            <SelectItem key={t.value} value={t.value}>
              {t.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  )
}

// ---------------------------------------------------------------------------
// TemplateCard
// ---------------------------------------------------------------------------

interface TemplateCardProps {
  template: EvalTemplate
  index: number
  onEdit: (template: EvalTemplate) => void
  onDuplicate: (template: EvalTemplate) => void
  onDelete: (template: EvalTemplate) => void
}

function TemplateCard({
  template,
  index,
  onEdit,
  onDuplicate,
  onDelete,
}: TemplateCardProps) {
  return (
    <Card
      className="animate-fade-up group hover:shadow-md transition-shadow"
      style={{ animationDelay: `${index * 50}ms` }}
    >
      <CardContent className="p-5">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0 flex-1">
            {/* Name + AI icon */}
            <div className="flex items-center gap-2 mb-1.5">
              <h3 className="text-sm font-semibold truncate">
                {template.name}
              </h3>
              {template.ai_generated && (
                <Sparkles className="h-3.5 w-3.5 text-ai shrink-0" />
              )}
            </div>

            {/* Type badge */}
            <Badge
              variant={
                EVAL_TYPE_BADGE_VARIANT[template.eval_type] as
                  | 'secondary'
                  | 'default'
                  | 'ai'
                  | 'active'
                  | 'completed'
              }
              className="mb-2"
            >
              {EVAL_TYPE_LABELS[template.eval_type]}
            </Badge>

            {/* Description */}
            {template.description && (
              <p className="text-xs text-muted-foreground line-clamp-2 mb-3">
                {template.description}
              </p>
            )}

            {/* Tags */}
            {template.tags && template.tags.length > 0 && (
              <div className="flex items-center gap-1.5 flex-wrap mb-3">
                {template.tags.slice(0, 3).map((tag) => (
                  <span
                    key={tag}
                    className="inline-flex items-center gap-1 rounded-md bg-muted px-1.5 py-0.5 text-[10px] text-muted-foreground"
                  >
                    <Tag className="h-2.5 w-2.5" />
                    {tag}
                  </span>
                ))}
                {template.tags.length > 3 && (
                  <span className="text-[10px] text-muted-foreground">
                    +{template.tags.length - 3}
                  </span>
                )}
              </div>
            )}

            {/* Meta info */}
            <div className="flex items-center gap-3 text-[11px] text-muted-foreground">
              <span>{template.competencies?.length ?? 0} competencias</span>
              <span>{template.questions?.length ?? 0} preguntas</span>
              <span>{formatDate(template.updated_at)}</span>
            </div>
          </div>

          {/* Actions */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                size="icon-xs"
                className="opacity-0 group-hover:opacity-100 transition-opacity shrink-0"
              >
                <MoreHorizontal className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => onEdit(template)}>
                <Pencil className="h-4 w-4" />
                Editar
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => onDuplicate(template)}>
                <Copy className="h-4 w-4" />
                Duplicar
              </DropdownMenuItem>
              <DropdownMenuItem
                variant="destructive"
                onClick={() => onDelete(template)}
              >
                <Trash2 className="h-4 w-4" />
                Eliminar
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </CardContent>
    </Card>
  )
}

// ---------------------------------------------------------------------------
// PredefinedTemplateCard
// ---------------------------------------------------------------------------

interface PredefinedTemplateCardProps {
  template: (typeof PREDEFINED_TEMPLATES)[number]
  index: number
  onUse: (template: (typeof PREDEFINED_TEMPLATES)[number]) => void
  isLoading: boolean
}

function PredefinedTemplateCard({
  template,
  index,
  onUse,
  isLoading,
}: PredefinedTemplateCardProps) {
  return (
    <Card
      className="animate-fade-up"
      style={{ animationDelay: `${index * 50}ms` }}
    >
      <CardContent className="p-5">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0 flex-1">
            {/* Name */}
            <h3 className="text-sm font-semibold mb-1.5">{template.name}</h3>

            {/* Type badge */}
            <Badge
              variant={
                EVAL_TYPE_BADGE_VARIANT[template.eval_type] as
                  | 'secondary'
                  | 'default'
                  | 'ai'
                  | 'active'
                  | 'completed'
              }
              className="mb-2"
            >
              {EVAL_TYPE_LABELS[template.eval_type]}
            </Badge>

            {/* Description */}
            {template.description && (
              <p className="text-xs text-muted-foreground line-clamp-2 mb-3">
                {template.description}
              </p>
            )}

            {/* Tags */}
            {template.tags && template.tags.length > 0 && (
              <div className="flex items-center gap-1.5 flex-wrap mb-3">
                {template.tags.map((tag) => (
                  <span
                    key={tag}
                    className="inline-flex items-center gap-1 rounded-md bg-muted px-1.5 py-0.5 text-[10px] text-muted-foreground"
                  >
                    <Tag className="h-2.5 w-2.5" />
                    {tag}
                  </span>
                ))}
              </div>
            )}

            {/* Meta */}
            <div className="flex items-center gap-3 text-[11px] text-muted-foreground">
              <span>{template.competencies?.length ?? 0} competencias</span>
              <span>{template.questions?.length ?? 0} preguntas</span>
            </div>
          </div>

          {/* Use button */}
          <Button
            size="sm"
            variant="outline"
            onClick={() => onUse(template)}
            disabled={isLoading}
            className="shrink-0"
          >
            {isLoading ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Plus className="h-4 w-4" />
            )}
            Usar template
          </Button>
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
  templateName: string
  onConfirm: () => void
  isDeleting: boolean
}

function DeleteConfirmDialog({
  open,
  onOpenChange,
  templateName,
  onConfirm,
  isDeleting,
}: DeleteConfirmDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Eliminar evaluación</DialogTitle>
          <DialogDescription>
            ¿Estás seguro de que quieres eliminar{' '}
            <strong>{templateName}</strong>? Esta acción no se puede deshacer.
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
// EvaluationsPage (main)
// ---------------------------------------------------------------------------

export default function EvaluationsPage() {
  const { organization } = useAuthStore()
  const orgId = organization?.id
  const navigate = useNavigate()

  // State
  const [search, setSearch] = useState('')
  const [evalTypeFilter, setEvalTypeFilter] = useState('all')
  const [deletingTemplate, setDeletingTemplate] =
    useState<EvalTemplate | null>(null)

  // Queries & mutations
  const { data: templates = [], isLoading } = useTemplates(orgId)
  const deleteTemplate = useDeleteTemplate()
  const duplicateTemplate = useDuplicateTemplate()
  const createTemplate = useCreateTemplate()

  // Client-side filtering
  const filteredTemplates = useMemo(() => {
    let result = templates

    if (search.trim()) {
      const q = search.toLowerCase()
      result = result.filter((t) => t.name.toLowerCase().includes(q))
    }

    if (evalTypeFilter !== 'all') {
      result = result.filter((t) => t.eval_type === evalTypeFilter)
    }

    return result
  }, [templates, search, evalTypeFilter])

  // Filtered predefined templates
  const filteredPredefined = useMemo(() => {
    let result = PREDEFINED_TEMPLATES

    if (search.trim()) {
      const q = search.toLowerCase()
      result = result.filter((t) => t.name.toLowerCase().includes(q))
    }

    if (evalTypeFilter !== 'all') {
      result = result.filter((t) => t.eval_type === evalTypeFilter)
    }

    return result
  }, [search, evalTypeFilter])

  // Handlers
  const handleEdit = useCallback(
    (template: EvalTemplate) => {
      navigate(`/app/evaluations/${template.id}/edit`)
    },
    [navigate]
  )

  const handleDuplicate = useCallback(
    (template: EvalTemplate) => {
      duplicateTemplate.mutate(template)
    },
    [duplicateTemplate]
  )

  const handleDelete = useCallback(async () => {
    if (!deletingTemplate) return
    await deleteTemplate.mutateAsync(deletingTemplate.id)
    setDeletingTemplate(null)
  }, [deletingTemplate, deleteTemplate])

  const handleUsePredefined = useCallback(
    (template: (typeof PREDEFINED_TEMPLATES)[number]) => {
      createTemplate.mutate({
        name: template.name,
        description: template.description,
        eval_type: template.eval_type,
        competencies: template.competencies,
        questions: template.questions,
        rubric: template.rubric,
        ai_generated: false,
        ai_prompt: null,
        is_template: true,
        tags: template.tags,
      })
    },
    [createTemplate]
  )

  const handleClearFilters = useCallback(() => {
    setSearch('')
    setEvalTypeFilter('all')
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
      {/* AI upgrade banner */}
      {organization && !organization.ai_enabled && (
        <AIBanner onUpgrade={() => toast.info('Próximamente')} />
      )}

      {/* Page header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 animate-fade-up">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Evaluaciones</h1>
          <p className="text-muted-foreground mt-1">
            Gestiona tus templates de evaluación y crea nuevas
          </p>
        </div>
        <Button onClick={() => navigate('/app/evaluations/new')}>
          <Plus className="h-4 w-4" />
          Crear evaluación
        </Button>
      </div>

      {/* Tabs */}
      <Tabs defaultValue="my-templates">
        <TabsList className="animate-fade-up">
          <TabsTrigger value="my-templates">
            <ClipboardList className="h-4 w-4" />
            Mis evaluaciones
          </TabsTrigger>
          <TabsTrigger value="predefined">
            <BookTemplate className="h-4 w-4" />
            Templates predefinidos
          </TabsTrigger>
        </TabsList>

        {/* Filters (shared across tabs) */}
        <FiltersBar
          search={search}
          onSearchChange={setSearch}
          evalType={evalTypeFilter}
          onEvalTypeChange={setEvalTypeFilter}
        />

        {/* My templates tab */}
        <TabsContent value="my-templates">
          {filteredTemplates.length === 0 ? (
            templates.length === 0 && !search && evalTypeFilter === 'all' ? (
              <EmptyState
                icon={ClipboardList}
                title="Sin evaluaciones"
                description="Crea tu primera evaluación o utiliza uno de los templates predefinidos para empezar"
                action={{
                  label: 'Crear evaluación',
                  onClick: () => navigate('/app/evaluations/new'),
                }}
              />
            ) : (
              <div className="flex flex-col items-center justify-center py-16 animate-fade-up">
                <Search className="h-10 w-10 text-muted-foreground/40 mb-4" />
                <p className="text-sm font-medium text-foreground">
                  Sin resultados
                </p>
                <p className="text-sm text-muted-foreground mt-1">
                  No se encontraron evaluaciones con los filtros actuales
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
              {filteredTemplates.map((template, index) => (
                <TemplateCard
                  key={template.id}
                  template={template}
                  index={index}
                  onEdit={handleEdit}
                  onDuplicate={handleDuplicate}
                  onDelete={setDeletingTemplate}
                />
              ))}
            </div>
          )}
        </TabsContent>

        {/* Predefined templates tab */}
        <TabsContent value="predefined">
          {filteredPredefined.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 animate-fade-up">
              <Search className="h-10 w-10 text-muted-foreground/40 mb-4" />
              <p className="text-sm font-medium text-foreground">
                Sin resultados
              </p>
              <p className="text-sm text-muted-foreground mt-1">
                No se encontraron templates con los filtros actuales
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
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredPredefined.map((template, index) => (
                <PredefinedTemplateCard
                  key={template.name}
                  template={template}
                  index={index}
                  onUse={handleUsePredefined}
                  isLoading={createTemplate.isPending}
                />
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>

      {/* Delete confirm dialog */}
      {deletingTemplate && (
        <DeleteConfirmDialog
          open={!!deletingTemplate}
          onOpenChange={(open) => {
            if (!open) setDeletingTemplate(null)
          }}
          templateName={deletingTemplate.name}
          onConfirm={handleDelete}
          isDeleting={deleteTemplate.isPending}
        />
      )}
    </div>
  )
}
