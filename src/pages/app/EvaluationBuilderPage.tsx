import { useState, useMemo, useCallback, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { toast } from 'sonner'
import { cn } from '@/lib/utils'
import { useAuthStore } from '@/stores/authStore'
import { useTemplate, useCreateTemplate, useUpdateTemplate } from '@/hooks/use-templates'
import { generateEvaluation } from '@/lib/ai-evaluation'
import { AIGenerateButton } from '@/components/ai/AIGenerateButton'
import type { Competency, EvalQuestion, Rubric, EvalType } from '@/types/database'

// UI components
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Badge } from '@/components/ui/badge'
import { Switch } from '@/components/ui/switch'
import { Separator } from '@/components/ui/separator'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'

// Icons
import {
  ArrowLeft,
  Plus,
  Trash2,
  Pencil,
  ChevronDown,
  ChevronRight,
  Sparkles,
  Lock,
  AlertTriangle,
  Loader2,
  Eye,
  Save,
  GripVertical,
  X,
} from 'lucide-react'

// ─── Constants ───────────────────────────────────────────────────────────────

const EVAL_TYPES: { value: EvalType; label: string; description: string }[] = [
  { value: 'competencies', label: 'Competencias', description: 'Evalúa competencias específicas del puesto' },
  { value: 'performance', label: 'Desempeño', description: 'Mide el rendimiento y productividad' },
  { value: 'potential', label: 'Potencial', description: 'Identifica capacidad de crecimiento' },
  { value: 'integral', label: 'Integral', description: 'Evaluación completa multidimensional' },
  { value: '360', label: '360°', description: 'Evaluación desde múltiples perspectivas' },
]

const QUESTION_TYPES: { value: EvalQuestion['type']; label: string }[] = [
  { value: 'scale', label: 'Escala' },
  { value: 'text', label: 'Texto' },
  { value: 'choice', label: 'Opción múltiple' },
]

const QUESTION_TYPE_BADGE: Record<EvalQuestion['type'], 'default' | 'secondary' | 'outline'> = {
  scale: 'default',
  text: 'secondary',
  choice: 'outline',
}

const DEFAULT_RUBRIC: Rubric = {
  scale: {
    min: 1,
    max: 5,
    labels: {
      1: 'Insuficiente',
      2: 'Mejorable',
      3: 'Adecuado',
      4: 'Bueno',
      5: 'Excelente',
    },
  },
  weights: {},
}

function generateId(): string {
  return crypto.randomUUID()
}

// ─── Competency Dialog ───────────────────────────────────────────────────────

interface CompetencyDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  competency: Competency | null
  onSave: (competency: Competency) => void
}

function CompetencyDialog({
  open,
  onOpenChange,
  competency,
  onSave,
}: CompetencyDialogProps) {
  const isEdit = !!competency
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [weight, setWeight] = useState(20)
  const [indicators, setIndicators] = useState<Competency['indicators']>([])

  useEffect(() => {
    if (competency) {
      setName(competency.name)
      setDescription(competency.description)
      setWeight(competency.weight)
      setIndicators([...competency.indicators])
    } else {
      setName('')
      setDescription('')
      setWeight(20)
      setIndicators([
        { id: generateId(), text: '', level: 5 },
        { id: generateId(), text: '', level: 3 },
        { id: generateId(), text: '', level: 1 },
      ])
    }
  }, [competency, open])

  const handleSave = () => {
    if (!name.trim()) {
      toast.error('El nombre de la competencia es obligatorio')
      return
    }
    if (weight < 0 || weight > 100) {
      toast.error('El peso debe estar entre 0 y 100')
      return
    }
    onSave({
      id: competency?.id ?? generateId(),
      name: name.trim(),
      description: description.trim(),
      weight,
      indicators: indicators.filter((ind) => ind.text.trim()),
    })
    onOpenChange(false)
  }

  const addIndicator = () => {
    setIndicators([...indicators, { id: generateId(), text: '', level: 3 }])
  }

  const updateIndicator = (index: number, field: 'text' | 'level', value: string | number) => {
    const updated = [...indicators]
    updated[index] = { ...updated[index], [field]: value }
    setIndicators(updated)
  }

  const removeIndicator = (index: number) => {
    setIndicators(indicators.filter((_, i) => i !== index))
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {isEdit ? 'Editar competencia' : 'Añadir competencia'}
          </DialogTitle>
          <DialogDescription>
            {isEdit
              ? 'Modifica los datos de la competencia.'
              : 'Define una nueva competencia para la evaluación.'}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="comp-name">Nombre *</Label>
            <Input
              id="comp-name"
              placeholder="Ej: Trabajo en equipo"
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="comp-desc">Descripción</Label>
            <Textarea
              id="comp-desc"
              placeholder="Describe qué evalúa esta competencia..."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={2}
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="comp-weight">Peso (%) *</Label>
            <Input
              id="comp-weight"
              type="number"
              min={0}
              max={100}
              value={weight}
              onChange={(e) => setWeight(Number(e.target.value))}
              className="w-24"
            />
          </div>

          <Separator />

          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <Label>Indicadores</Label>
              <Button type="button" variant="ghost" size="sm" onClick={addIndicator}>
                <Plus className="h-3.5 w-3.5" />
                Añadir
              </Button>
            </div>
            {indicators.map((ind, i) => (
              <div key={ind.id} className="flex items-start gap-2">
                <Input
                  placeholder="Texto del indicador..."
                  value={ind.text}
                  onChange={(e) => updateIndicator(i, 'text', e.target.value)}
                  className="flex-1"
                />
                <Select
                  value={String(ind.level)}
                  onValueChange={(val) => updateIndicator(i, 'level', Number(val))}
                >
                  <SelectTrigger className="w-20">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {[1, 2, 3, 4, 5].map((lvl) => (
                      <SelectItem key={lvl} value={String(lvl)}>
                        Nivel {lvl}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="text-destructive hover:text-destructive shrink-0 mt-0.5"
                  onClick={() => removeIndicator(i)}
                >
                  <X className="h-3.5 w-3.5" />
                </Button>
              </div>
            ))}
          </div>
        </div>

        <DialogFooter>
          <DialogClose asChild>
            <Button variant="outline">Cancelar</Button>
          </DialogClose>
          <Button onClick={handleSave} disabled={!name.trim()}>
            {isEdit ? 'Guardar cambios' : 'Añadir competencia'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

// ─── Question Dialog ─────────────────────────────────────────────────────────

interface QuestionDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  question: EvalQuestion | null
  competencies: Competency[]
  onSave: (question: EvalQuestion) => void
}

function QuestionDialog({
  open,
  onOpenChange,
  question,
  competencies,
  onSave,
}: QuestionDialogProps) {
  const isEdit = !!question
  const [text, setText] = useState('')
  const [type, setType] = useState<EvalQuestion['type']>('scale')
  const [competencyId, setCompetencyId] = useState('')
  const [required, setRequired] = useState(true)
  const [options, setOptions] = useState<string[]>([''])

  useEffect(() => {
    if (question) {
      setText(question.text)
      setType(question.type)
      setCompetencyId(question.competency_id)
      setRequired(question.required)
      setOptions(question.options?.length ? [...question.options] : [''])
    } else {
      setText('')
      setType('scale')
      setCompetencyId(competencies[0]?.id ?? '')
      setRequired(true)
      setOptions([''])
    }
  }, [question, open, competencies])

  const handleSave = () => {
    if (!text.trim()) {
      toast.error('El texto de la pregunta es obligatorio')
      return
    }
    if (!competencyId) {
      toast.error('Selecciona una competencia')
      return
    }
    if (type === 'choice') {
      const validOptions = options.filter((o) => o.trim())
      if (validOptions.length < 2) {
        toast.error('Las preguntas de opción múltiple necesitan al menos 2 opciones')
        return
      }
    }

    const saved: EvalQuestion = {
      id: question?.id ?? generateId(),
      competency_id: competencyId,
      text: text.trim(),
      type,
      required,
    }
    if (type === 'choice') {
      saved.options = options.filter((o) => o.trim())
    }
    onSave(saved)
    onOpenChange(false)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {isEdit ? 'Editar pregunta' : 'Añadir pregunta'}
          </DialogTitle>
          <DialogDescription>
            {isEdit
              ? 'Modifica los datos de la pregunta.'
              : 'Crea una nueva pregunta para la evaluación.'}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="q-text">Texto de la pregunta *</Label>
            <Textarea
              id="q-text"
              placeholder="Ej: ¿Cómo valorarías su capacidad de trabajo en equipo?"
              value={text}
              onChange={(e) => setText(e.target.value)}
              rows={2}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label>Tipo *</Label>
              <Select value={type} onValueChange={(val) => setType(val as EvalQuestion['type'])}>
                <SelectTrigger className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {QUESTION_TYPES.map((qt) => (
                    <SelectItem key={qt.value} value={qt.value}>
                      {qt.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <Label>Competencia *</Label>
              <Select value={competencyId} onValueChange={setCompetencyId}>
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Seleccionar" />
                </SelectTrigger>
                <SelectContent>
                  {competencies.map((c) => (
                    <SelectItem key={c.id} value={c.id}>
                      {c.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {type === 'choice' && (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <Label>Opciones de respuesta</Label>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => setOptions([...options, ''])}
                >
                  <Plus className="h-3.5 w-3.5" />
                  Añadir
                </Button>
              </div>
              {options.map((opt, i) => (
                <div key={i} className="flex items-center gap-2">
                  <Input
                    placeholder={`Opción ${i + 1}`}
                    value={opt}
                    onChange={(e) => {
                      const updated = [...options]
                      updated[i] = e.target.value
                      setOptions(updated)
                    }}
                    className="flex-1"
                  />
                  {options.length > 1 && (
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="text-destructive hover:text-destructive shrink-0"
                      onClick={() => setOptions(options.filter((_, j) => j !== i))}
                    >
                      <X className="h-3.5 w-3.5" />
                    </Button>
                  )}
                </div>
              ))}
            </div>
          )}

          <div className="flex items-center gap-2">
            <Switch
              checked={required}
              onCheckedChange={setRequired}
            />
            <Label className="text-sm cursor-pointer">Respuesta obligatoria</Label>
          </div>
        </div>

        <DialogFooter>
          <DialogClose asChild>
            <Button variant="outline">Cancelar</Button>
          </DialogClose>
          <Button onClick={handleSave} disabled={!text.trim() || !competencyId}>
            {isEdit ? 'Guardar cambios' : 'Añadir pregunta'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

// ─── Delete Confirm Dialog ───────────────────────────────────────────────────

interface DeleteConfirmDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  itemName: string
  itemType: string
  onConfirm: () => void
}

function DeleteConfirmDialog({
  open,
  onOpenChange,
  itemName,
  itemType,
  onConfirm,
}: DeleteConfirmDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Eliminar {itemType}</DialogTitle>
          <DialogDescription>
            ¿Estás seguro de que quieres eliminar{' '}
            <span className="font-medium text-foreground">{itemName}</span>?
            Esta acción no se puede deshacer.
          </DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <DialogClose asChild>
            <Button variant="outline">Cancelar</Button>
          </DialogClose>
          <Button variant="destructive" onClick={onConfirm}>
            Eliminar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

// ─── Preview Dialog ──────────────────────────────────────────────────────────

interface PreviewDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  name: string
  evalType: EvalType
  competencies: Competency[]
  questions: EvalQuestion[]
  rubric: Rubric
}

function PreviewDialog({
  open,
  onOpenChange,
  name,
  evalType,
  competencies,
  questions,
  rubric,
}: PreviewDialogProps) {
  const typeLabel = EVAL_TYPES.find((t) => t.value === evalType)?.label ?? evalType

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Vista previa: {name || 'Sin nombre'}</DialogTitle>
          <DialogDescription>
            Así verán los evaluadores el formulario de evaluación
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          <div className="flex items-center gap-2">
            <Badge variant="ai">{typeLabel}</Badge>
            <span className="text-sm text-muted-foreground">
              {competencies.length} competencias &middot; {questions.length} preguntas
            </span>
          </div>

          <Separator />

          {/* Rubric scale */}
          <div className="space-y-2">
            <p className="text-sm font-medium">Escala de valoración</p>
            <div className="flex flex-wrap gap-2">
              {Object.entries(rubric.scale.labels).map(([score, label]) => (
                <div
                  key={score}
                  className="flex items-center gap-1.5 rounded-md border px-3 py-1.5"
                >
                  <span className="text-sm font-semibold">{score}</span>
                  <span className="text-sm text-muted-foreground">-</span>
                  <span className="text-sm">{label}</span>
                </div>
              ))}
            </div>
          </div>

          <Separator />

          {/* Questions grouped by competency */}
          {competencies.map((comp) => {
            const compQuestions = questions.filter((q) => q.competency_id === comp.id)
            if (compQuestions.length === 0) return null
            return (
              <div key={comp.id} className="space-y-4">
                <div>
                  <p className="text-sm font-semibold">{comp.name}</p>
                  <p className="text-xs text-muted-foreground">{comp.description}</p>
                </div>
                {compQuestions.map((q, qi) => (
                  <div key={q.id} className="pl-4 border-l-2 border-muted space-y-2">
                    <p className="text-sm">
                      {qi + 1}. {q.text}
                      {q.required && <span className="text-destructive ml-1">*</span>}
                    </p>
                    {q.type === 'scale' && (
                      <div className="flex gap-2">
                        {Array.from(
                          { length: rubric.scale.max - rubric.scale.min + 1 },
                          (_, i) => rubric.scale.min + i
                        ).map((val) => (
                          <div
                            key={val}
                            className="h-8 w-8 rounded-full border flex items-center justify-center text-xs text-muted-foreground"
                          >
                            {val}
                          </div>
                        ))}
                      </div>
                    )}
                    {q.type === 'text' && (
                      <div className="h-16 rounded-md border border-dashed bg-muted/30" />
                    )}
                    {q.type === 'choice' && q.options && (
                      <div className="space-y-1.5">
                        {q.options.map((opt, oi) => (
                          <div key={oi} className="flex items-center gap-2">
                            <div className="h-4 w-4 rounded-full border" />
                            <span className="text-sm">{opt}</span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )
          })}
        </div>

        <DialogFooter>
          <DialogClose asChild>
            <Button variant="outline">Cerrar</Button>
          </DialogClose>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

// ─── Unsaved Changes Dialog ──────────────────────────────────────────────────

interface UnsavedDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onDiscard: () => void
}

function UnsavedDialog({ open, onOpenChange, onDiscard }: UnsavedDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Cambios sin guardar</DialogTitle>
          <DialogDescription>
            Tienes cambios sin guardar. ¿Quieres descartarlos y salir?
          </DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <DialogClose asChild>
            <Button variant="outline">Seguir editando</Button>
          </DialogClose>
          <Button variant="destructive" onClick={onDiscard}>
            Descartar y salir
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

// ─── Main Page ───────────────────────────────────────────────────────────────

export default function EvaluationBuilderPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const { organization } = useAuthStore()
  const isEditMode = !!id

  // Load existing template if in edit mode
  const { data: existingTemplate, isLoading: templateLoading } = useTemplate(id)
  const createTemplate = useCreateTemplate()
  const updateTemplate = useUpdateTemplate()

  // ─── Form state ─────────────────────────────────────────────────────────
  const [name, setName] = useState('')
  const [evalType, setEvalType] = useState<EvalType>('integral')
  const [description, setDescription] = useState('')
  const [competencies, setCompetencies] = useState<Competency[]>([])
  const [questions, setQuestions] = useState<EvalQuestion[]>([])
  const [rubric, setRubric] = useState<Rubric>(DEFAULT_RUBRIC)
  const [aiPrompt, setAiPrompt] = useState('')
  const [isDirty, setIsDirty] = useState(false)

  // ─── UI state ───────────────────────────────────────────────────────────
  const [aiGenerating, setAiGenerating] = useState(false)
  const [expandedCompetencies, setExpandedCompetencies] = useState<Set<string>>(new Set())
  const [compDialogOpen, setCompDialogOpen] = useState(false)
  const [editingCompetency, setEditingCompetency] = useState<Competency | null>(null)
  const [questionDialogOpen, setQuestionDialogOpen] = useState(false)
  const [editingQuestion, setEditingQuestion] = useState<EvalQuestion | null>(null)
  const [deleteTarget, setDeleteTarget] = useState<{ type: 'competency' | 'question'; id: string; name: string } | null>(null)
  const [previewOpen, setPreviewOpen] = useState(false)
  const [unsavedDialogOpen, setUnsavedDialogOpen] = useState(false)

  // ─── Hydrate form from existing template ────────────────────────────────
  useEffect(() => {
    if (existingTemplate) {
      setName(existingTemplate.name)
      setEvalType(existingTemplate.eval_type)
      setDescription(existingTemplate.description ?? '')
      setCompetencies(existingTemplate.competencies)
      setQuestions(existingTemplate.questions)
      setRubric(existingTemplate.rubric)
      setAiPrompt(existingTemplate.ai_prompt ?? '')
      setIsDirty(false)
    }
  }, [existingTemplate])

  // ─── Computed values ────────────────────────────────────────────────────
  const totalWeight = useMemo(
    () => competencies.reduce((sum, c) => sum + c.weight, 0),
    [competencies]
  )

  const weightValid = totalWeight === 100

  const aiEnabled = organization?.ai_enabled ?? false

  const isSaving = createTemplate.isPending || updateTemplate.isPending

  // ─── Mark dirty ─────────────────────────────────────────────────────────
  const markDirty = useCallback(() => {
    setIsDirty(true)
  }, [])

  // ─── AI generation ──────────────────────────────────────────────────────
  const handleAIGenerate = useCallback(async () => {
    if (!aiPrompt.trim()) {
      toast.error('Escribe un prompt para generar la evaluación')
      return
    }
    setAiGenerating(true)
    try {
      const result = await generateEvaluation(aiPrompt, evalType)
      setCompetencies(result.competencies)
      setQuestions(result.questions)
      setRubric(result.rubric)
      setExpandedCompetencies(new Set(result.competencies.map((c) => c.id)))
      markDirty()
      toast.success('Evaluación generada con IA')
    } catch {
      toast.error('Error al generar la evaluación')
    } finally {
      setAiGenerating(false)
    }
  }, [aiPrompt, evalType, markDirty])

  // ─── Competency handlers ───────────────────────────────────────────────
  const toggleCompetency = (id: string) => {
    setExpandedCompetencies((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  const handleSaveCompetency = useCallback(
    (comp: Competency) => {
      setCompetencies((prev) => {
        const exists = prev.find((c) => c.id === comp.id)
        if (exists) return prev.map((c) => (c.id === comp.id ? comp : c))
        return [...prev, comp]
      })
      setExpandedCompetencies((prev) => new Set([...prev, comp.id]))
      markDirty()
    },
    [markDirty]
  )

  const openAddCompetency = () => {
    setEditingCompetency(null)
    setCompDialogOpen(true)
  }

  const openEditCompetency = (comp: Competency) => {
    setEditingCompetency(comp)
    setCompDialogOpen(true)
  }

  // ─── Question handlers ─────────────────────────────────────────────────
  const handleSaveQuestion = useCallback(
    (q: EvalQuestion) => {
      setQuestions((prev) => {
        const exists = prev.find((existing) => existing.id === q.id)
        if (exists) return prev.map((existing) => (existing.id === q.id ? q : existing))
        return [...prev, q]
      })
      markDirty()
    },
    [markDirty]
  )

  const openAddQuestion = () => {
    setEditingQuestion(null)
    setQuestionDialogOpen(true)
  }

  const openEditQuestion = (q: EvalQuestion) => {
    setEditingQuestion(q)
    setQuestionDialogOpen(true)
  }

  const toggleQuestionRequired = (qId: string) => {
    setQuestions((prev) =>
      prev.map((q) => (q.id === qId ? { ...q, required: !q.required } : q))
    )
    markDirty()
  }

  // ─── Delete handler ────────────────────────────────────────────────────
  const handleDeleteConfirm = useCallback(() => {
    if (!deleteTarget) return
    if (deleteTarget.type === 'competency') {
      setCompetencies((prev) => prev.filter((c) => c.id !== deleteTarget.id))
      setQuestions((prev) => prev.filter((q) => q.competency_id !== deleteTarget.id))
    } else {
      setQuestions((prev) => prev.filter((q) => q.id !== deleteTarget.id))
    }
    setDeleteTarget(null)
    markDirty()
  }, [deleteTarget, markDirty])

  // ─── Rubric inline edit ────────────────────────────────────────────────
  const updateRubricLabel = (score: number, label: string) => {
    setRubric((prev) => ({
      ...prev,
      scale: {
        ...prev.scale,
        labels: { ...prev.scale.labels, [score]: label },
      },
    }))
    markDirty()
  }

  // ─── Save handlers ────────────────────────────────────────────────────
  const handleSave = useCallback(
    async (asTemplate: boolean) => {
      if (!name.trim()) {
        toast.error('El nombre de la evaluación es obligatorio')
        return
      }
      if (competencies.length === 0) {
        toast.error('Añade al menos una competencia')
        return
      }
      if (competencies.length > 0 && !weightValid) {
        toast.error('Los pesos de las competencias deben sumar 100%')
        return
      }

      const payload = {
        name: name.trim(),
        description: description.trim() || null,
        eval_type: evalType,
        competencies,
        questions,
        rubric: {
          ...rubric,
          weights: Object.fromEntries(competencies.map((c) => [c.id, c.weight])),
        },
        ai_generated: aiPrompt.trim().length > 0,
        ai_prompt: aiPrompt.trim() || null,
        is_template: asTemplate,
        tags: [] as string[],
      }

      try {
        if (isEditMode && id) {
          await updateTemplate.mutateAsync({ id, ...payload })
        } else {
          await createTemplate.mutateAsync(payload)
        }
        setIsDirty(false)
        navigate('/app/evaluations')
      } catch {
        // Error handled by mutation
      }
    },
    [
      name,
      description,
      evalType,
      competencies,
      questions,
      rubric,
      aiPrompt,
      isEditMode,
      id,
      weightValid,
      createTemplate,
      updateTemplate,
      navigate,
    ]
  )

  // ─── Cancel handler ───────────────────────────────────────────────────
  const handleCancel = () => {
    if (isDirty) {
      setUnsavedDialogOpen(true)
    } else {
      navigate('/app/evaluations')
    }
  }

  // ─── Loading state ────────────────────────────────────────────────────
  if (isEditMode && templateLoading) {
    return (
      <div className="flex items-center justify-center py-24">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    )
  }

  // ─── Questions grouped by competency ──────────────────────────────────
  const questionsByCompetency = competencies.map((comp) => ({
    competency: comp,
    questions: questions.filter((q) => q.competency_id === comp.id),
  }))

  const orphanQuestions = questions.filter(
    (q) => !competencies.find((c) => c.id === q.competency_id)
  )

  return (
    <div className="space-y-6 pb-28">
      {/* ─── Header ────────────────────────────────────────────────────────── */}
      <div className="flex items-center gap-3 animate-fade-up">
        <Button variant="ghost" size="sm" onClick={handleCancel}>
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div>
          <h1 className="text-2xl font-bold tracking-tight">
            {isEditMode ? 'Editar evaluación' : 'Nueva evaluación'}
          </h1>
          <p className="text-muted-foreground mt-0.5 text-sm">
            {isEditMode
              ? 'Modifica los detalles de la evaluación'
              : 'Diseña una nueva evaluación para tu equipo'}
          </p>
        </div>
      </div>

      {/* ─── Section 1: Basic info ─────────────────────────────────────────── */}
      <Card className="animate-fade-up">
        <CardHeader>
          <CardTitle className="text-base">Información básica</CardTitle>
          <CardDescription>Nombre, tipo y descripción de la evaluación</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="eval-name">Nombre *</Label>
            <Input
              id="eval-name"
              placeholder="Ej: Evaluación trimestral de desempeño Q1 2026"
              value={name}
              onChange={(e) => {
                setName(e.target.value)
                markDirty()
              }}
            />
          </div>

          <div className="space-y-1.5">
            <Label>Tipo de evaluación *</Label>
            <Select
              value={evalType}
              onValueChange={(val) => {
                setEvalType(val as EvalType)
                markDirty()
              }}
            >
              <SelectTrigger className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {EVAL_TYPES.map((et) => (
                  <SelectItem key={et.value} value={et.value}>
                    <div className="flex flex-col">
                      <span>{et.label}</span>
                      <span className="text-xs text-muted-foreground">{et.description}</span>
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="eval-desc">Descripción</Label>
            <Textarea
              id="eval-desc"
              placeholder="Describe el propósito y alcance de esta evaluación..."
              value={description}
              onChange={(e) => {
                setDescription(e.target.value)
                markDirty()
              }}
              rows={3}
            />
          </div>
        </CardContent>
      </Card>

      {/* ─── Section 2: AI Generation ──────────────────────────────────────── */}
      <Card
        className={cn(
          'animate-fade-up',
          !aiEnabled && 'opacity-75'
        )}
        style={{ animationDelay: '50ms' }}
      >
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Sparkles className="h-5 w-5 text-ai" />
            Generación con IA
          </CardTitle>
          <CardDescription>
            Describe el perfil a evaluar y genera competencias, preguntas y rúbrica automáticamente
          </CardDescription>
        </CardHeader>
        <CardContent>
          {aiEnabled ? (
            <div className="space-y-3">
              <Textarea
                placeholder="Ej: Evaluación para desarrolladores senior del equipo de backend. Enfocada en liderazgo técnico, calidad de código y capacidad de mentoría..."
                value={aiPrompt}
                onChange={(e) => {
                  setAiPrompt(e.target.value)
                  markDirty()
                }}
                rows={3}
                disabled={aiGenerating}
              />
              <div className="flex items-center justify-between">
                <p className="text-xs text-muted-foreground">
                  La IA generará competencias, preguntas y rúbrica basadas en tu descripción
                </p>
                <AIGenerateButton
                  onClick={handleAIGenerate}
                  loading={aiGenerating}
                  disabled={!aiPrompt.trim()}
                  label={aiGenerating ? 'Generando...' : 'Generar con IA'}
                />
              </div>
              {aiGenerating && (
                <div className="flex items-center gap-2 text-sm text-muted-foreground bg-ai-subtle/30 rounded-lg px-4 py-3">
                  <Loader2 className="h-4 w-4 animate-spin text-ai" />
                  Generando evaluación personalizada...
                </div>
              )}
            </div>
          ) : (
            <div className="flex items-center gap-4 rounded-lg border border-dashed px-4 py-6">
              <div className="h-10 w-10 rounded-xl bg-muted flex items-center justify-center shrink-0">
                <Lock className="h-5 w-5 text-muted-foreground" />
              </div>
              <div className="flex-1">
                <p className="text-sm font-medium">IA no disponible en tu plan</p>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Actualiza tu plan para generar evaluaciones con inteligencia artificial
                </p>
              </div>
              <Button variant="outline" size="sm" onClick={() => toast.info('Próximamente')}>
                Actualizar plan
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      {/* ─── Section 3: Competencies ───────────────────────────────────────── */}
      <Card className="animate-fade-up" style={{ animationDelay: '100ms' }}>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-base">Competencias</CardTitle>
              <CardDescription>
                Define las competencias a evaluar y sus pesos
              </CardDescription>
            </div>
            <div className="flex items-center gap-2">
              {competencies.length > 0 && (
                <Badge
                  variant={weightValid ? 'active' : 'destructive'}
                  className="text-xs"
                >
                  {totalWeight}% / 100%
                </Badge>
              )}
              <Button size="sm" onClick={openAddCompetency}>
                <Plus className="h-3.5 w-3.5" />
                Añadir
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {competencies.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-10 text-center">
              <div className="h-12 w-12 rounded-xl bg-primary/5 flex items-center justify-center mb-4">
                <GripVertical className="h-6 w-6 text-primary/30" />
              </div>
              <p className="text-sm font-medium">Sin competencias</p>
              <p className="text-xs text-muted-foreground mt-1 max-w-xs">
                Añade competencias manualmente o usa la generación con IA para crearlas automáticamente
              </p>
              <Button variant="outline" size="sm" className="mt-4" onClick={openAddCompetency}>
                <Plus className="h-3.5 w-3.5" />
                Añadir competencia
              </Button>
            </div>
          ) : (
            <div className="space-y-2">
              {!weightValid && competencies.length > 0 && (
                <div className="flex items-center gap-2 rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">
                  <AlertTriangle className="h-4 w-4 shrink-0" />
                  Los pesos deben sumar 100%. Actualmente suman {totalWeight}%.
                </div>
              )}
              {competencies.map((comp) => {
                const isExpanded = expandedCompetencies.has(comp.id)
                const compQuestions = questions.filter((q) => q.competency_id === comp.id)
                return (
                  <div
                    key={comp.id}
                    className="rounded-lg border transition-colors"
                  >
                    {/* Competency header */}
                    <div
                      className="flex items-center gap-3 px-4 py-3 cursor-pointer hover:bg-muted/50 transition-colors"
                      onClick={() => toggleCompetency(comp.id)}
                    >
                      {isExpanded ? (
                        <ChevronDown className="h-4 w-4 text-muted-foreground shrink-0" />
                      ) : (
                        <ChevronRight className="h-4 w-4 text-muted-foreground shrink-0" />
                      )}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-medium truncate">{comp.name}</span>
                          <Badge variant="outline" className="text-xs shrink-0">
                            {comp.weight}%
                          </Badge>
                          <span className="text-xs text-muted-foreground shrink-0">
                            {compQuestions.length} pregunta{compQuestions.length !== 1 ? 's' : ''}
                          </span>
                        </div>
                        {!isExpanded && comp.description && (
                          <p className="text-xs text-muted-foreground truncate mt-0.5">
                            {comp.description}
                          </p>
                        )}
                      </div>
                      <div
                        className="flex items-center gap-1 shrink-0"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => openEditCompetency(comp)}
                        >
                          <Pencil className="h-3.5 w-3.5" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="text-destructive hover:text-destructive hover:bg-destructive/10"
                          onClick={() =>
                            setDeleteTarget({
                              type: 'competency',
                              id: comp.id,
                              name: comp.name,
                            })
                          }
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    </div>

                    {/* Expanded content */}
                    {isExpanded && (
                      <div className="px-4 pb-4 pt-1 space-y-3 border-t bg-muted/20">
                        {comp.description && (
                          <p className="text-sm text-muted-foreground">{comp.description}</p>
                        )}
                        {comp.indicators.length > 0 && (
                          <div className="space-y-1">
                            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                              Indicadores
                            </p>
                            {comp.indicators.map((ind) => (
                              <div
                                key={ind.id}
                                className="flex items-center gap-2 text-sm"
                              >
                                <Badge variant="outline" className="text-xs shrink-0 w-6 justify-center">
                                  {ind.level}
                                </Badge>
                                <span>{ind.text}</span>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {/* ─── Section 4: Questions ──────────────────────────────────────────── */}
      <Card className="animate-fade-up" style={{ animationDelay: '150ms' }}>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-base">Preguntas</CardTitle>
              <CardDescription>
                Preguntas agrupadas por competencia
              </CardDescription>
            </div>
            <Button
              size="sm"
              onClick={openAddQuestion}
              disabled={competencies.length === 0}
            >
              <Plus className="h-3.5 w-3.5" />
              Añadir
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {questions.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-10 text-center">
              <div className="h-12 w-12 rounded-xl bg-primary/5 flex items-center justify-center mb-4">
                <GripVertical className="h-6 w-6 text-primary/30" />
              </div>
              <p className="text-sm font-medium">Sin preguntas</p>
              <p className="text-xs text-muted-foreground mt-1 max-w-xs">
                {competencies.length === 0
                  ? 'Primero añade competencias, luego podrás crear preguntas'
                  : 'Añade preguntas manualmente o usa la generación con IA'}
              </p>
              {competencies.length > 0 && (
                <Button variant="outline" size="sm" className="mt-4" onClick={openAddQuestion}>
                  <Plus className="h-3.5 w-3.5" />
                  Añadir pregunta
                </Button>
              )}
            </div>
          ) : (
            <div className="space-y-6">
              {questionsByCompetency.map(({ competency: comp, questions: compQuestions }) => {
                if (compQuestions.length === 0) return null
                return (
                  <div key={comp.id} className="space-y-2">
                    <p className="text-sm font-semibold text-foreground">
                      {comp.name}
                    </p>
                    {compQuestions.map((q) => (
                      <div
                        key={q.id}
                        className="flex items-center gap-3 rounded-lg border px-4 py-3 group hover:bg-muted/30 transition-colors"
                      >
                        <div className="flex-1 min-w-0">
                          <p className="text-sm truncate">{q.text}</p>
                          <div className="flex items-center gap-2 mt-1">
                            <Badge variant={QUESTION_TYPE_BADGE[q.type]} className="text-xs">
                              {QUESTION_TYPES.find((t) => t.value === q.type)?.label ?? q.type}
                            </Badge>
                            {q.required && (
                              <span className="text-xs text-destructive">Obligatoria</span>
                            )}
                            {q.type === 'choice' && q.options && (
                              <span className="text-xs text-muted-foreground">
                                {q.options.length} opciones
                              </span>
                            )}
                          </div>
                        </div>
                        <div className="flex items-center gap-1 shrink-0">
                          <Switch
                            checked={q.required}
                            onCheckedChange={() => toggleQuestionRequired(q.id)}
                            className="scale-75"
                          />
                          <Button
                            variant="ghost"
                            size="sm"
                            className="opacity-0 group-hover:opacity-100 transition-opacity"
                            onClick={() => openEditQuestion(q)}
                          >
                            <Pencil className="h-3.5 w-3.5" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="text-destructive hover:text-destructive hover:bg-destructive/10 opacity-0 group-hover:opacity-100 transition-opacity"
                            onClick={() =>
                              setDeleteTarget({
                                type: 'question',
                                id: q.id,
                                name: q.text.slice(0, 40) + (q.text.length > 40 ? '...' : ''),
                              })
                            }
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                )
              })}

              {/* Orphan questions (competency was deleted) */}
              {orphanQuestions.length > 0 && (
                <div className="space-y-2">
                  <p className="text-sm font-semibold text-warning">
                    Sin competencia asignada
                  </p>
                  {orphanQuestions.map((q) => (
                    <div
                      key={q.id}
                      className="flex items-center gap-3 rounded-lg border border-warning/30 bg-warning/5 px-4 py-3"
                    >
                      <AlertTriangle className="h-4 w-4 text-warning shrink-0" />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm truncate">{q.text}</p>
                      </div>
                      <div className="flex items-center gap-1 shrink-0">
                        <Button variant="ghost" size="sm" onClick={() => openEditQuestion(q)}>
                          <Pencil className="h-3.5 w-3.5" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="text-destructive hover:text-destructive"
                          onClick={() =>
                            setDeleteTarget({
                              type: 'question',
                              id: q.id,
                              name: q.text.slice(0, 40),
                            })
                          }
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* ─── Section 5: Rubric ─────────────────────────────────────────────── */}
      <Card className="animate-fade-up" style={{ animationDelay: '200ms' }}>
        <CardHeader>
          <CardTitle className="text-base">Rúbrica de valoración</CardTitle>
          <CardDescription>
            Define las etiquetas de la escala de puntuación (1-5)
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 sm:grid-cols-5 gap-3">
            {Object.entries(rubric.scale.labels).map(([scoreStr, label]) => {
              const score = Number(scoreStr)
              return (
                <div key={score} className="space-y-1.5">
                  <div className="flex items-center gap-2">
                    <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                      <span className="text-sm font-semibold text-primary">{score}</span>
                    </div>
                    <Label className="text-xs text-muted-foreground">Nivel {score}</Label>
                  </div>
                  <Input
                    value={label}
                    onChange={(e) => updateRubricLabel(score, e.target.value)}
                    className="text-sm"
                    placeholder={`Etiqueta nivel ${score}`}
                  />
                </div>
              )
            })}
          </div>
        </CardContent>
      </Card>

      {/* ─── Sticky Footer ─────────────────────────────────────────────────── */}
      <div className="fixed bottom-0 left-0 right-0 z-40 border-t bg-background/95 backdrop-blur-sm">
        <div className="mx-auto max-w-5xl flex items-center justify-between gap-3 px-4 py-3 sm:px-6">
          <Button variant="ghost" onClick={handleCancel}>
            Cancelar
          </Button>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              onClick={() => setPreviewOpen(true)}
              disabled={competencies.length === 0}
            >
              <Eye className="h-4 w-4" />
              <span className="hidden sm:inline">Vista previa</span>
            </Button>
            <Button
              variant="outline"
              onClick={() => handleSave(false)}
              disabled={isSaving || !name.trim()}
            >
              {isSaving ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Save className="h-4 w-4" />
              )}
              <span className="hidden sm:inline">Guardar como borrador</span>
              <span className="sm:hidden">Borrador</span>
            </Button>
            <Button
              onClick={() => handleSave(true)}
              disabled={isSaving || !name.trim()}
            >
              {isSaving ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Save className="h-4 w-4" />
              )}
              <span className="hidden sm:inline">Guardar como template</span>
              <span className="sm:hidden">Template</span>
            </Button>
          </div>
        </div>
      </div>

      {/* ─── Dialogs ─────────────────────────────────────────────────────── */}
      <CompetencyDialog
        open={compDialogOpen}
        onOpenChange={setCompDialogOpen}
        competency={editingCompetency}
        onSave={handleSaveCompetency}
      />

      {competencies.length > 0 && (
        <QuestionDialog
          open={questionDialogOpen}
          onOpenChange={setQuestionDialogOpen}
          question={editingQuestion}
          competencies={competencies}
          onSave={handleSaveQuestion}
        />
      )}

      {deleteTarget && (
        <DeleteConfirmDialog
          open={!!deleteTarget}
          onOpenChange={(open) => {
            if (!open) setDeleteTarget(null)
          }}
          itemName={deleteTarget.name}
          itemType={deleteTarget.type === 'competency' ? 'competencia' : 'pregunta'}
          onConfirm={handleDeleteConfirm}
        />
      )}

      <PreviewDialog
        open={previewOpen}
        onOpenChange={setPreviewOpen}
        name={name}
        evalType={evalType}
        competencies={competencies}
        questions={questions}
        rubric={rubric}
      />

      <UnsavedDialog
        open={unsavedDialogOpen}
        onOpenChange={setUnsavedDialogOpen}
        onDiscard={() => navigate('/app/evaluations')}
      />
    </div>
  )
}
